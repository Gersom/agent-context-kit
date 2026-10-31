// `group-dissolve`: deshace un grupo y devuelve todas sus tareas a «Tareas libres».
// Contra proyectos temporales: nunca se tocan los docs reales.

import { afterAll, describe, expect, test } from "bun:test";
import { parseBacklog } from "../../../_shared/parse/backlog.ts";
import { APPLY_NOTICE } from "../../src/cli/dispatch.ts";
import { BACKLOG_EN, BACKLOG_RICH, HANDOFF_CURRENT, HANDOFF_IDLE, HANDOFF_IDLE_EN, HISTORY_EN, HISTORY_RICH, TEAM_RICH } from "../fixtures.ts";
import { exec, makeProject, type Project, readIn, snapshot } from "../helpers.ts";

const projects: Project[] = [];
function project(options: Parameters<typeof makeProject>[0]): Project {
  const p = makeProject(options);
  projects.push(p);
  return p;
}
afterAll(() => projects.forEach((p) => p.cleanup()));

// BACKLOG_RICH tiene el grupo «Documentar los planes» (Tareas 14 y 15) y las libres 1, 3 y 18.
const TAREA_14 = "Tarea 14 — Redactar `costs.md`\n\n- **Descripción:** costos CUERPO-14.\n- **Disparador:** cuando se cierre el diseño.\n";
const TAREA_15 = "Tarea 15 — Redactar `limits.md`\n\n- **Descripción:** límites.\n";
const REFERENCE = "### Grupo — Documentar los planes (Tareas 14, 15)\n\n- **Resumen:** todo lo de `plans/`.\n\n";
const FREE_END = "<!-- agent-context-skill:section=blocked -->";
const EMPTY = "No aplica todavía — ningún grupo formado.\n";
const idle = (backlogText: string) => ({ contents: { "handoff.md": HANDOFF_IDLE, "backlog.md": backlogText, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH });
const backlog = (p: Project) => readIn(p, "gersom", "backlog.md");
// Deshacer el único grupo: sus tareas al final de «libres», en el orden del contenedor, y «agrupadas» vuelve a estar vacía.
const DISSOLVED = BACKLOG_RICH.replace(REFERENCE, "")
  .replace(FREE_END, `### ${TAREA_14}\n### ${TAREA_15}\n${FREE_END}`)
  .replace(/### Grupo — Documentar los planes\n\n#### Tarea 14[\s\S]*$/, EMPTY);
// Con un segundo grupo, «Otros» (Tareas 19 y 20), después del primero en las dos secciones.
const TWO_GROUPS = BACKLOG_RICH.replace(FREE_END, `### Grupo — Otros (Tareas 19, 20)\n\n- **Resumen:** varias.\n\n${FREE_END}`).concat(
  "\n### Grupo — Otros\n\n#### Tarea 19 — Ordenar\n\n- **Descripción:** orden.\n\n#### Tarea 20 — Limpiar\n\n- **Descripción:** limpieza.\n",
);

describe("group-dissolve", () => {
  test("el resultado esperado de los tests es el que se piensa", () => {
    const parsed = parseBacklog(DISSOLVED);
    expect(parsed.free.tasks.map((t) => t.number)).toEqual([1, 3, 18, 14, 15]);
    expect(parsed.free.groups).toEqual([]);
    expect(parsed.grouped).toEqual([]);
  });

  test("sin --apply muestra el diff y no escribe nada", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const before = snapshot(p.root);
    const { code, out } = await exec(["group-dissolve", "14"], p);
    expect(code).toBe(0);
    expect(out).toContain("-### Grupo — Documentar los planes (Tareas 14, 15)");
    expect(out).toContain("+### Tarea 14 — Redactar `costs.md`");
    expect(out).toContain("-#### Tarea 15 — Redactar `limits.md`");
    expect(out).toContain("+No aplica todavía — ningún grupo formado.");
    expect(out).toContain(APPLY_NOTICE);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("--dry-run gana sobre --apply", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const before = snapshot(p.root);
    expect((await exec(["group-dissolve", "14", "--dry-run", "--apply"], p)).code).toBe(0);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("--apply: las tareas vuelven a «libres», se eliminan la referencia y el contenedor y se vuelve a leer", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const { code, out } = await exec(["group-dissolve", "15", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Grupo «Documentar los planes» deshecho: las Tareas 14, 15 volvieron a «Tareas libres».");
    expect(backlog(p)).toBe(DISSOLVED);
    const parsed = parseBacklog(backlog(p));
    expect(parsed.free.tasks.map((t) => t.number)).toEqual([1, 3, 18, 14, 15]);
    expect(parsed.free.groups).toEqual([]);
    expect(parsed.grouped).toEqual([]);
    const state = JSON.parse((await exec(["status", "--json"], p)).out);
    expect(state.free.map((t: { number: number; group: string | null }) => [t.number, t.group])).toEqual([[1, null], [3, null], [18, null], [14, null], [15, null]]);
  });

  test("T-N vale como N", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    expect((await exec(["group-dissolve", "T-14", "--apply"], p)).code).toBe(0);
    expect(backlog(p)).toBe(DISSOLVED);
  });

  test("un grupo de 3: las tres vuelven en el orden del contenedor", async () => {
    const raw = BACKLOG_RICH.replace("(Tareas 14, 15)", "(Tareas 14, 15, 19)").replace(
      "- **Descripción:** límites.\n",
      "- **Descripción:** límites.\n\n#### Tarea 19 — Medir los tiempos\n\n- **Descripción:** CUERPO-19.\n",
    );
    const p = project({ folders: ["gersom"], ...idle(raw) });
    const { code, out } = await exec(["group-dissolve", "19", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Grupo «Documentar los planes» deshecho: las Tareas 14, 15, 19 volvieron a «Tareas libres».");
    expect(parseBacklog(backlog(p)).free.tasks.map((t) => t.number)).toEqual([1, 3, 18, 14, 15, 19]);
    expect(parseBacklog(backlog(p)).grouped).toEqual([]);
  });

  test("con otro grupo: ese queda intacto y «agrupadas» no se vacía", async () => {
    const p = project({ folders: ["gersom"], ...idle(TWO_GROUPS) });
    expect((await exec(["group-dissolve", "14", "--apply"], p)).code).toBe(0);
    const expected = TWO_GROUPS.replace(REFERENCE, "")
      .replace(`### Grupo — Documentar los planes\n\n#### ${TAREA_14}\n#### ${TAREA_15}\n`, "")
      .replace(FREE_END, `### ${TAREA_14}\n### ${TAREA_15}\n${FREE_END}`);
    expect(backlog(p)).toBe(expected);
    const parsed = parseBacklog(backlog(p));
    expect(parsed.free.tasks.map((t) => t.number)).toEqual([1, 3, 18, 14, 15]);
    expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Otros", [19, 20]]]);
    expect(parsed.grouped.map((g) => [g.title, g.tasks.map((t) => t.number)])).toEqual([["Otros", [19, 20]]]);
    // El otro grupo se deshace igual y ahora sí queda vacía.
    expect((await exec(["group-dissolve", "20", "--apply"], p)).code).toBe(0);
    expect(parseBacklog(backlog(p)).free.tasks.map((t) => t.number)).toEqual([1, 3, 18, 14, 15, 19, 20]);
    expect(backlog(p)).toEndWith(`## Tareas agrupadas\n\n${EMPTY}`);
  });

  test("--json: pendiente y aplicado", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const pending = JSON.parse((await exec(["group-dissolve", "14", "--json"], p)).out);
    expect(pending).toMatchObject({ command: "group-dissolve", applied: false, pending: true, group: { title: "Documentar los planes", tasks: [14, 15] }, returned: [14, 15] });
    expect(backlog(p)).toBe(BACKLOG_RICH);
    const applied = JSON.parse((await exec(["group-dissolve", "14", "--json", "--apply"], p)).out);
    expect(applied).toMatchObject({ command: "group-dissolve", applied: true, pending: false, group: { title: "Documentar los planes", tasks: [14, 15] }, returned: [14, 15] });
    expect(applied.files).toEqual([{ file: "docs/agents/gersom/backlog.md", changed: true, written: true }]);
    expect(backlog(p)).toBe(DISSOLVED);
  });

  test("un proyecto en inglés: el texto de vacío sale en inglés y el resultado se vuelve a leer", async () => {
    const raw = BACKLOG_EN.replace(
      "- **Added:** 2026-10-01.\n\n<!-- agent-context-skill:section=blocked -->",
      "- **Added:** 2026-10-01.\n\n### Task 3 — Publish the glossary\n\n- **Description:** publish it.\n- **Blockers:** None.\n- **Trigger:** after the translation.\n- **Added:** 2026-10-01.\n\n<!-- agent-context-skill:section=blocked -->",
    );
    const p = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_IDLE_EN, "backlog.md": raw, "history.md": HISTORY_EN } });
    expect((await exec(["group-create", "--tasks", "4,3", "--title", "Glossary", "--summary", "Translate and publish.", "--apply"], p)).code).toBe(0);
    const { code, out } = await exec(["group-dissolve", "3", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Grupo «Glossary» deshecho: las Tareas 4, 3 volvieron a «Tareas libres».");
    const text = backlog(p);
    expect(text).toContain("## Free tasks\n\n### Task 4 — Translate the glossary\n");
    expect(text).toContain("\n\n### Task 3 — Publish the glossary\n");
    expect(text).not.toContain("### Group");
    expect(text).toContain("## Grouped tasks\n\nNot applicable yet — no groups formed.\n");
    const parsed = parseBacklog(text);
    expect(parsed.free.tasks.map((t) => t.number)).toEqual([4, 3]);
    expect(parsed.free.groups).toEqual([]);
    expect(parsed.grouped).toEqual([]);
  });

  test("un archivo CRLF sigue siendo CRLF y se vuelve a leer", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH.replace(/\n/g, "\r\n")) });
    expect((await exec(["group-dissolve", "14", "--apply"], p)).code).toBe(0);
    const text = backlog(p);
    expect(text).toBe(DISSOLVED.replace(/\n/g, "\r\n"));
    expect(text.replace(/\r\n/g, "")).not.toContain("\n"); // ningún LF suelto
    expect(parseBacklog(text).free.tasks.map((t) => t.number)).toEqual([1, 3, 18, 14, 15]);
  });

  describe("errores: no se escribe nada", () => {
    test("uso: sin argumentos, varios argumentos, texto no numérico", async () => {
      const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
      const before = snapshot(p.root);
      const none = await exec(["group-dissolve", "--apply"], p);
      expect(none.code).toBe(2);
      expect(none.err).toContain("Indica una tarea del grupo que deshaces: `group-dissolve <N>`.");
      const two = await exec(["group-dissolve", "14", "15", "--apply"], p);
      expect(two.code).toBe(2);
      expect(two.err).toContain("Indica una tarea del grupo que deshaces");
      const title = await exec(["group-dissolve", "Redactar costs", "--apply"], p);
      expect(title.code).toBe(2);
      expect(title.err).toContain("«Redactar costs» no es un número de tarea: `group-dissolve <N>`.");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("N no agrupada: dice dónde está", async () => {
      const current = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_CURRENT, "backlog.md": BACKLOG_RICH, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH });
      const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
      const before = snapshot(p.root);
      const free = await exec(["group-dissolve", "1", "--apply"], p);
      expect(free.code).toBe(1);
      expect(free.err).toContain("La Tarea 1 es una tarea libre, no está agrupada: indica una tarea que ya pertenezca al grupo. No se escribió nada.");
      expect((await exec(["group-dissolve", "6", "--apply"], p)).err).toContain("La Tarea 6 está en «bloqueadas / pospuestas», no está agrupada: indica una tarea");
      expect((await exec(["group-dissolve", "8", "--apply"], p)).err).toContain("La Tarea 8 está pausada: indica una tarea que ya pertenezca al grupo. No se escribió nada.");
      expect((await exec(["group-dissolve", "11", "--apply"], p)).err).toContain("La Tarea 11 ya está cerrada (figura en history.md): indica una tarea que ya pertenezca al grupo. No se escribió nada.");
      expect(snapshot(p.root)).toEqual(before);

      const beforeCurrent = snapshot(current.root);
      const running = await exec(["group-dissolve", "12", "--apply"], current);
      expect(running.code).toBe(1);
      expect(running.err).toContain("La Tarea 12 es la tarea en curso: indica una tarea que ya pertenezca al grupo. No se escribió nada.");
      expect(running.err).not.toContain("in-progress");
      expect(snapshot(current.root)).toEqual(beforeCurrent);
    });

    test("N inexistente: lo dice y muestra los números conocidos", async () => {
      const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
      const before = snapshot(p.root);
      const { code, err } = await exec(["group-dissolve", "99", "--apply"], p);
      expect(code).toBe(1);
      expect(err).toContain("No existe la Tarea 99. Números conocidos:");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("N que figura en varios lugares: se niega", async () => {
      const handoff = `${HANDOFF_IDLE}\n### Tarea 14 — Redactar \`costs.md\`\n\n- **Qué falta:** todo.\n`;
      const p = project({ folders: ["gersom"], contents: { "handoff.md": handoff, "backlog.md": BACKLOG_RICH, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH });
      const before = snapshot(p.root);
      const { code, err } = await exec(["group-dissolve", "14", "--apply"], p);
      expect(code).toBe(1);
      expect(err).toContain("La Tarea 14 aparece en 2 lugares (pausada, agrupadas): una tarea vive en un solo lugar; corrígelo a mano. No se escribió nada.");
      expect(err).not.toContain("paused");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("tarea de otro operador (T-N@op): se niega", async () => {
      const p = project({ folders: ["gersom", "ana"], ...idle(BACKLOG_RICH), folderContents: { ana: idle(BACKLOG_RICH).contents } });
      const before = snapshot(p.root);
      for (const arg of ["T-14@ana", "14@ana"]) {
        const { code, err } = await exec(["group-dissolve", arg, "--apply"], p);
        expect(code).toBe(1);
        expect(err).toContain(`group-dissolve solo deshace grupos de tu propia carpeta; «${arg}» es de otro operador (solo lectura). No se escribió nada.`);
      }
      expect(snapshot(p.root)).toEqual(before);
    });

    test("carpeta de otro operador (--operator): se niega", async () => {
      const p = project({ folders: ["gersom", "ana"], ...idle(BACKLOG_RICH), folderContents: { ana: idle(BACKLOG_RICH).contents } });
      const before = snapshot(p.root);
      expect((await exec(["group-dissolve", "14", "--operator", "ana", "--apply"], p)).err).toContain("«ana» no es la tuya");
      expect(snapshot(p.root)).toEqual(before);
    });
  });
});
