// `step`: marca pasos del plan de la tarea en curso y pone al día «Qué falta» y «Próximo paso
// concreto». Contra proyectos temporales: nunca se tocan los docs reales.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "bun:test";
import { APPLY_NOTICE } from "../../src/cli/dispatch.ts";
import { BACKLOG_EN, BACKLOG_RICH, HANDOFF_IDLE, HANDOFF_IDLE_EN, HISTORY_EN, HISTORY_RICH, TEAM_RICH } from "../fixtures.ts";
import { exec, makeProject, type Project, readIn, snapshot } from "../helpers.ts";

const projects: Project[] = [];
function project(options: Parameters<typeof makeProject>[0]): Project {
  const p = makeProject(options);
  projects.push(p);
  return p;
}
afterAll(() => projects.forEach((p) => p.cleanup()));

const IDLE = { contents: { "handoff.md": HANDOFF_IDLE, "backlog.md": BACKLOG_RICH, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH };
const PLAN = "Paso 1 — Escribir\nPaso 2 — Probar\nPaso 3 — Cerrar el hilo";
const handoff = (p: Project) => readIn(p, "gersom", "handoff.md");

/** Proyecto con la Tarea 1 empezada con un plan de 3 pasos (más el de cierre). */
async function started(plan = PLAN): Promise<Project> {
  const p = project({ folders: ["gersom"], ...IDLE });
  expect((await exec(["start", "1", "--plan", "-", "--apply"], p, { stdin: plan })).code).toBe(0);
  return p;
}

describe("step", () => {
  test("sin --apply muestra el diff y no escribe nada", async () => {
    const p = await started();
    const before = snapshot(p.root);
    const { code, out } = await exec(["step", "1"], p);
    expect(code).toBe(0);
    expect(out).toContain("-- [ ] Paso 1 — Escribir");
    expect(out).toContain("+- [x] Paso 1 — Escribir");
    expect(out).toContain(APPLY_NOTICE);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("marca el paso por número y pone al día «Qué falta» y «Próximo paso concreto» (que seguían con el texto de start)", async () => {
    const p = await started();
    const { code, out } = await exec(["step", "1", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toContain("Paso 1 marcado como hecho: «Paso 1 — Escribir».");
    expect(out).toContain("Plan 1/4 — siguiente: Paso 2 — Probar (docs/agents/gersom/handoff.md).");
    expect(out).toContain("Actualizado: Qué falta, Próximo paso concreto.");
    const text = handoff(p);
    expect(text).toContain("- [x] Paso 1 — Escribir\n- [ ] Paso 2 — Probar\n");
    expect(text).toContain(
      "### Qué falta\n\nPasos pendientes:\n- Paso 2 — Probar\n- Paso 3 — Cerrar el hilo\n- Documentar cierre de tarea\n\n### Decisiones a medio camino",
    );
    expect(text).toContain("### Próximo paso concreto\n\nPaso 2 — Probar\n\n<!-- agent-context-kit:section=paused -->");
    expect(readIn(p, "gersom", "backlog.md")).not.toContain("Paso");
  });

  test("lo escrito por un paso anterior también se pone al día; al terminar el plan, «plan completo»", async () => {
    const p = await started("Paso 1 — Escribir");
    await exec(["step", "1", "--apply"], p);
    await exec(["step", "Documentar cierre", "--apply"], p);
    const text = handoff(p);
    expect(text).toContain("### Qué falta\n\nTodos los pasos del plan están hechos; falta cerrar la tarea.\n");
    expect(text).toContain("### Próximo paso concreto\n\nPlan completo: falta cerrar la tarea.\n");
    const state = JSON.parse((await exec(["status", "--json"], p)).out);
    expect(state.current.plan).toEqual({ done: 2, total: 2, nextStep: null });
  });

  test("por texto (sin importar mayúsculas ni acentos) y varios pasos a la vez", async () => {
    const p = await started();
    const { out } = await exec(["step", "paso 2", "cerrar el HILO", "--apply"], p);
    expect(out).toContain("Paso 2 marcado como hecho");
    expect(out).toContain("Paso 3 marcado como hecho");
    expect(handoff(p)).toContain("- [ ] Paso 1 — Escribir\n- [x] Paso 2 — Probar\n- [x] Paso 3 — Cerrar el hilo\n");
    // El primer pendiente no cambió: «Próximo paso concreto» sigue igual.
    expect(handoff(p)).toContain("### Próximo paso concreto\n\nPaso 1 — Escribir\n");
  });

  test("--undo desmarca y el siguiente paso vuelve a ser ese", async () => {
    const p = await started();
    await exec(["step", "1", "--apply"], p);
    const { out } = await exec(["step", "1", "--undo", "--apply"], p);
    expect(out).toContain("Paso 1 desmarcado");
    expect(handoff(p)).toContain("- [ ] Paso 1 — Escribir");
    expect(handoff(p)).toContain("### Próximo paso concreto\n\nPaso 1 — Escribir\n");
  });

  test("un paso que ya estaba en ese estado avisa y no cambia nada", async () => {
    const p = await started();
    await exec(["step", "1", "--apply"], p);
    const before = snapshot(p.root);
    const { code, out } = await exec(["step", "1", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toContain("Aviso: El paso 1 ya estaba hecho");
    expect(snapshot(p.root)).toEqual(before);
  });

  test("--falta, --decisiones y --proximo reemplazan el texto (también por stdin); sin marcar ningún paso", async () => {
    const p = await started();
    await exec(["step", "--falta", "Probar y cerrar.", "--proximo", "Correr los tests.", "--apply"], p);
    await exec(["step", "--decisiones", "-", "--apply"], p, { stdin: "- Usar bun test.\n- Sin RED.\n" });
    const text = handoff(p);
    expect(text).toContain("- [ ] Paso 1 — Escribir"); // nada marcado
    expect(text).toContain("### Qué falta\n\nProbar y cerrar.\n");
    expect(text).toContain("### Decisiones a medio camino\n\n- Usar bun test.\n- Sin RED.\n\n### Próximo paso concreto\n\nCorrer los tests.\n");
  });

  test("un texto que alguien escribió no se pisa solo: avisa y respeta los flags", async () => {
    const p = await started();
    await exec(["step", "--falta", "Texto propio.", "--proximo", "Otro texto propio.", "--apply"], p);
    const auto = await exec(["step", "1", "--apply"], p);
    expect(auto.out).toContain("Aviso: «Qué falta» tiene un texto propio y no lo toqué");
    expect(auto.out).toContain("--proximo");
    expect(handoff(p)).toContain("### Qué falta\n\nTexto propio.\n");
    expect(handoff(p)).toContain("### Próximo paso concreto\n\nOtro texto propio.\n");
    await exec(["step", "2", "--falta", "Quedan 2.", "--apply"], p);
    expect(handoff(p)).toContain("### Qué falta\n\nQuedan 2.\n");
    expect(handoff(p)).toContain("### Próximo paso concreto\n\nOtro texto propio.\n");
  });

  test("conserva los comentarios HTML del principio de la subsección y el resto del archivo", async () => {
    const p = await started();
    const text = handoff(p).replace("### Qué falta\n\n", "### Qué falta\n\n<!-- Lo que falta de ESTA tarea. -->\n\n");
    writeFileSync(join(p.agents, "gersom", "handoff.md"), text);
    await exec(["step", "1", "--apply"], p);
    const after = handoff(p);
    expect(after).toContain("### Qué falta\n\n<!-- Lo que falta de ESTA tarea. -->\n\nPasos pendientes:\n- Paso 2 — Probar");
    expect(after).toContain("<!-- agent-context-kit:section=in-progress -->");
    expect(after).toContain("<!-- agent-context-kit:section=paused -->\n## Tareas pausadas");
  });

  test("--json: dice qué cambió y no imprime el diff", async () => {
    const p = await started();
    const pending = JSON.parse((await exec(["step", "2", "--json"], p)).out);
    expect(pending).toMatchObject({ command: "step", applied: false, pending: true, plan: { done: 1, total: 4, nextStep: "Paso 1 — Escribir" } });
    expect(handoff(p)).toContain("- [ ] Paso 2 — Probar");
    const applied = JSON.parse((await exec(["step", "2", "--json", "--apply"], p)).out);
    expect(applied).toMatchObject({ applied: true, pending: false, files: [{ file: "docs/agents/gersom/handoff.md", changed: true, written: true }] });
    expect(applied.steps[1]).toEqual({ index: 2, text: "Paso 2 — Probar", done: true, changed: true });
  });

  describe("errores: no se escribe nada", () => {
    test("sin argumentos ni flags de texto, o --undo sin paso", async () => {
      const p = await started();
      expect((await exec(["step", "--apply"], p)).code).toBe(2);
      expect((await exec(["step", "--undo", "--falta", "x", "--apply"], p)).code).toBe(2);
    });

    test("paso inexistente o ambiguo", async () => {
      const p = await started();
      const before = snapshot(p.root);
      expect((await exec(["step", "9", "--apply"], p)).err).toContain("El plan tiene 4 pasos: no existe el paso 9");
      expect((await exec(["step", "nada de eso", "--apply"], p)).err).toContain("Ningún paso del plan");
      const ambiguous = await exec(["step", "Paso", "--apply"], p);
      expect(ambiguous.err).toContain("coincide con 3 pasos");
      expect(ambiguous.err).toContain("1. Paso 1 — Escribir");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("sin tarea en curso, o una tarea sin plan", async () => {
      const idle = project({ folders: ["gersom"], ...IDLE });
      expect((await exec(["step", "1", "--apply"], idle)).err).toContain("No hay tarea en curso");
      const noPlan = project({ folders: ["gersom"], ...IDLE });
      await exec(["start", "1", "--apply"], noPlan);
      expect((await exec(["step", "1", "--apply"], noPlan)).err).toContain("no tiene plan");
      // Pero sí se puede actualizar un texto de una tarea sin plan.
      expect((await exec(["step", "--falta", "Casi.", "--apply"], noPlan)).code).toBe(0);
      expect(handoff(noPlan)).toContain("### Qué falta\n\nCasi.\n");
    });

    test("carpeta de otro operador: se niega", async () => {
      const p = project({ folders: ["gersom", "ana"], ...IDLE, folderContents: { ana: IDLE.contents } });
      const { code, err } = await exec(["step", "1", "--operator", "ana", "--apply"], p);
      expect(code).toBe(1);
      expect(err).toContain("«ana» no es la tuya");
    });
  });

  test("un proyecto en inglés: textos generados en inglés", async () => {
    const p = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_IDLE_EN, "backlog.md": BACKLOG_EN, "history.md": HISTORY_EN } });
    await exec(["start", "4", "--plan", "-", "--apply"], p, { stdin: "Step 1 — write\nStep 2 — test" });
    await exec(["step", "1", "--apply"], p);
    const text = handoff(p);
    expect(text).toContain("- [x] Step 1 — write");
    expect(text).toContain("### What's left\n\nPending steps:\n- Step 2 — test\n- Document task closure\n");
    expect(text).toContain("### Next concrete step\n\nStep 2 — test\n");
  });

  test("archivos CRLF siguen siendo CRLF", async () => {
    const crlf = (text: string) => text.replace(/\n/g, "\r\n");
    const p = project({ folders: ["gersom"], contents: { "handoff.md": crlf(HANDOFF_IDLE), "backlog.md": crlf(BACKLOG_RICH), "history.md": crlf(HISTORY_RICH) } });
    await exec(["start", "1", "--plan", "-", "--apply"], p, { stdin: PLAN });
    expect((await exec(["step", "1", "--apply"], p)).code).toBe(0);
    const text = handoff(p);
    expect(text.replace(/\r\n/g, "")).not.toContain("\n");
    expect(text).toContain("- [x] Paso 1 — Escribir\r\n");
    expect(text).toContain("### Qué falta\r\n\r\nPasos pendientes:\r\n- Paso 2 — Probar\r\n");
  });
});
