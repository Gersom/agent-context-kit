// `group-add`: suma tareas libres a un grupo ya formado.
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
const TAREA_3 = "Tarea 3 — Exportar como skill\n\n- **Bloqueos:** `[Resuelto el 2026-09-24]` — era `[postergada]`.\n- **Disparador:** cuando el operador pregunte por tareas pendientes.\n";
const TAREA_18 = "Tarea 18 — Revisar los links\n\n- **Disparador:** antes del release.\n";
const idle = (backlogText: string) => ({ contents: { "handoff.md": HANDOFF_IDLE, "backlog.md": backlogText, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH });
const backlog = (p: Project) => readIn(p, "gersom", "backlog.md");
// Sumar 18 y 3 (en ese orden): salen de «libres», entran al final del contenedor y a la lista de la referencia.
const ADDED_18_3 = BACKLOG_RICH.replace("(Tareas 14, 15)", "(Tareas 14, 15, 18, 3)")
  .replace(`### ${TAREA_3}\n### ${TAREA_18}\n`, "")
  .replace("- **Descripción:** límites.\n", `- **Descripción:** límites.\n\n#### ${TAREA_18}\n#### ${TAREA_3}`);

describe("group-add", () => {
  test("sin --apply muestra el diff y no escribe nada", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const before = snapshot(p.root);
    const { code, out } = await exec(["group-add", "14", "18", "3"], p);
    expect(code).toBe(0);
    expect(out).toContain("+#### Tarea 18 — Revisar los links");
    expect(out).toContain("-### Tarea 18 — Revisar los links");
    expect(out).toContain("+### Grupo — Documentar los planes (Tareas 14, 15, 18, 3)");
    expect(out).toContain(APPLY_NOTICE);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("--dry-run gana sobre --apply", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const before = snapshot(p.root);
    expect((await exec(["group-add", "14", "18", "--dry-run", "--apply"], p)).code).toBe(0);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("--apply: las tareas pasan al final del grupo en el orden pedido, la referencia las suma y el Resumen no cambia", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const { code, out } = await exec(["group-add", "15", "18", "3", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Tareas 18, 3 sumadas al grupo «Documentar los planes»: ahora tiene 4 tareas (14, 15, 18, 3).");
    expect(backlog(p)).toBe(ADDED_18_3);
    expect(backlog(p)).toContain("- **Resumen:** todo lo de `plans/`.");
    const parsed = parseBacklog(backlog(p));
    expect(parsed.free.tasks.map((t) => t.number)).toEqual([1]);
    expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Documentar los planes", [14, 15, 18, 3]]]);
    expect(parsed.grouped.map((g) => [g.title, g.tasks.map((t) => t.number)])).toEqual([["Documentar los planes", [14, 15, 18, 3]]]);
    const state = JSON.parse((await exec(["status", "--json"], p)).out);
    expect(state.free.map((t: { number: number; group: string | null }) => [t.number, t.group])).toEqual([[1, null], [14, "Documentar los planes"], [15, "Documentar los planes"], [18, "Documentar los planes"], [3, "Documentar los planes"]]);
  });

  test("una sola tarea: el mensaje va en singular y T-N vale como N", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const { code, out } = await exec(["group-add", "T-14", "T-18", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Tarea 18 sumada al grupo «Documentar los planes»: ahora tiene 3 tareas (14, 15, 18).");
    expect(parseBacklog(backlog(p)).grouped.map((g) => g.tasks.map((t) => t.number))).toEqual([[14, 15, 18]]);
  });

  test("--json: lo sumado y cómo queda el grupo, pendiente y aplicado", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const pending = JSON.parse((await exec(["group-add", "14", "18", "3", "--json"], p)).out);
    expect(pending).toMatchObject({ command: "group-add", applied: false, pending: true, added: [18, 3], group: { title: "Documentar los planes", tasks: [14, 15, 18, 3] } });
    expect(backlog(p)).toBe(BACKLOG_RICH);
    const applied = JSON.parse((await exec(["group-add", "14", "18", "3", "--json", "--apply"], p)).out);
    expect(applied).toMatchObject({ command: "group-add", applied: true, pending: false, added: [18, 3], group: { title: "Documentar los planes", tasks: [14, 15, 18, 3] } });
    expect(applied.files).toEqual([{ file: "docs/agents/gersom/backlog.md", changed: true, written: true }]);
    expect(backlog(p)).toBe(ADDED_18_3);
  });

  test("un proyecto en inglés: la suma conserva las palabras del grupo y el resultado se vuelve a leer", async () => {
    const raw = BACKLOG_EN.replace(
      "- **Added:** 2026-10-01.\n\n<!-- agent-context-skill:section=blocked -->",
      "- **Added:** 2026-10-01.\n\n### Task 3 — Publish the glossary\n\n- **Description:** publish it.\n- **Blockers:** None.\n- **Trigger:** after the translation.\n- **Added:** 2026-10-01.\n\n### Task 6 — Review the glossary\n\n- **Description:** review it.\n- **Blockers:** None.\n- **Trigger:** after the publication.\n- **Added:** 2026-10-01.\n\n<!-- agent-context-skill:section=blocked -->",
    );
    const p = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_IDLE_EN, "backlog.md": raw, "history.md": HISTORY_EN } });
    expect((await exec(["group-create", "--tasks", "4,3", "--title", "Glossary", "--summary", "Translate and publish.", "--apply"], p)).code).toBe(0);
    const { code, out } = await exec(["group-add", "3", "6", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Tarea 6 sumada al grupo «Glossary»: ahora tiene 3 tareas (4, 3, 6).");
    const text = backlog(p);
    expect(text).toContain("### Group — Glossary (Tasks 4, 3, 6)\n\n- **Summary:** Translate and publish.");
    expect(text).toContain("\n\n#### Task 6 — Review the glossary\n\n- **Description:** review it.\n");
    expect(text).not.toMatch(/^### Task 6/m);
    const parsed = parseBacklog(text);
    expect(parsed.free.tasks).toEqual([]);
    expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Glossary", [4, 3, 6]]]);
    expect(parsed.grouped.map((g) => [g.title, g.tasks.map((t) => t.number)])).toEqual([["Glossary", [4, 3, 6]]]);
  });

  test("un archivo CRLF sigue siendo CRLF y se vuelve a leer", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH.replace(/\n/g, "\r\n")) });
    expect((await exec(["group-add", "14", "18", "3", "--apply"], p)).code).toBe(0);
    const text = backlog(p);
    expect(text).toBe(ADDED_18_3.replace(/\n/g, "\r\n"));
    expect(text.replace(/\r\n/g, "")).not.toContain("\n"); // ningún LF suelto
    const parsed = parseBacklog(text);
    expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Documentar los planes", [14, 15, 18, 3]]]);
    expect(parsed.grouped.map((g) => [g.title, g.tasks.map((t) => t.number)])).toEqual([["Documentar los planes", [14, 15, 18, 3]]]);
  });

  test("con dos grupos y el contenedor de N no es el último: la tarea entra al final del suyo", async () => {
    const other = "### Grupo — Otros\n\n#### Tarea 19 — Ordenar\n\n- **Descripción:** orden.\n\n#### Tarea 20 — Limpiar\n\n- **Descripción:** limpieza.\n";
    const raw = BACKLOG_RICH.replace("\n<!-- agent-context-skill:section=blocked -->", "### Grupo — Otros (Tareas 19, 20)\n\n- **Resumen:** varias.\n\n<!-- agent-context-skill:section=blocked -->").replace(
      "- **Descripción:** límites.\n",
      `- **Descripción:** límites.\n\n${other}`,
    );
    const p = project({ folders: ["gersom"], ...idle(raw) });
    const { code, out } = await exec(["group-add", "15", "18", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Tarea 18 sumada al grupo «Documentar los planes»: ahora tiene 3 tareas (14, 15, 18).");
    const expected = raw
      .replace("(Tareas 14, 15)", "(Tareas 14, 15, 18)")
      .replace(`### ${TAREA_18}`, "")
      .replace("- **Descripción:** límites.\n\n### Grupo — Otros\n", `- **Descripción:** límites.\n\n#### ${TAREA_18}\n### Grupo — Otros\n`);
    expect(backlog(p)).toBe(expected);
    const parsed = parseBacklog(backlog(p));
    expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Documentar los planes", [14, 15, 18]], ["Otros", [19, 20]]]);
    expect(parsed.grouped.map((g) => [g.title, g.tasks.map((t) => t.number)])).toEqual([["Documentar los planes", [14, 15, 18]], ["Otros", [19, 20]]]);
  });

  describe("errores: no se escribe nada", () => {
    test("N no agrupada: dice dónde está", async () => {
      const current = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_CURRENT, "backlog.md": BACKLOG_RICH, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH });
      const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
      const before = snapshot(p.root);
      const free = await exec(["group-add", "1", "18", "--apply"], p);
      expect(free.code).toBe(1);
      expect(free.err).toContain("La Tarea 1 es una tarea libre, no está agrupada: indica una tarea que ya pertenezca al grupo. No se escribió nada.");
      expect((await exec(["group-add", "6", "18", "--apply"], p)).err).toContain("La Tarea 6 está en «bloqueadas / pospuestas», no está agrupada: indica una tarea");
      expect((await exec(["group-add", "8", "18", "--apply"], p)).err).toContain("La Tarea 8 está pausada: indica una tarea que ya pertenezca al grupo. No se escribió nada.");
      expect((await exec(["group-add", "11", "18", "--apply"], p)).err).toContain("La Tarea 11 ya está cerrada (figura en history.md): indica una tarea que ya pertenezca al grupo. No se escribió nada.");
      expect(snapshot(p.root)).toEqual(before);

      const beforeCurrent = snapshot(current.root);
      const running = await exec(["group-add", "12", "18", "--apply"], current);
      expect(running.code).toBe(1);
      expect(running.err).toContain("La Tarea 12 es la tarea en curso: indica una tarea que ya pertenezca al grupo. No se escribió nada.");
      expect(running.err).not.toContain("in-progress");
      expect(snapshot(current.root)).toEqual(beforeCurrent);
    });

    test("N inexistente: lo dice y muestra los números conocidos", async () => {
      const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
      const before = snapshot(p.root);
      const { code, err } = await exec(["group-add", "99", "18", "--apply"], p);
      expect(code).toBe(1);
      expect(err).toContain("No existe la Tarea 99. Números conocidos:");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("tarea a sumar que ya está agrupada, bloqueada o no existe", async () => {
      const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
      const before = snapshot(p.root);
      const grouped = await exec(["group-add", "14", "15", "--apply"], p);
      expect(grouped.code).toBe(1);
      expect(grouped.err).toContain("La Tarea 15 ya está en el grupo «Documentar los planes»: solo se suman al grupo tareas libres. No se escribió nada.");
      expect((await exec(["group-add", "14", "18", "6", "--apply"], p)).err).toContain("La Tarea 6 está en «Tareas bloqueadas / pospuestas»: solo se suman al grupo tareas libres. No se escribió nada.");
      const missing = await exec(["group-add", "14", "18", "99", "--apply"], p);
      expect(missing.code).toBe(1);
      expect(missing.err).toContain("No existe la Tarea 99. Números conocidos:");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("tarea a sumar repetida, también repitiendo la N", async () => {
      const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
      const before = snapshot(p.root);
      const twice = await exec(["group-add", "14", "18", "3", "T-18", "--apply"], p);
      expect(twice.code).toBe(1);
      expect(twice.err).toContain("La Tarea 18 está repetida en la lista. No se escribió nada.");
      const same = await exec(["group-add", "14", "14", "--apply"], p);
      expect(same.code).toBe(1);
      expect(same.err).toContain("La Tarea 14 está repetida en la lista. No se escribió nada.");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("tarea a sumar pausada, cerrada o en curso: lo dice con palabras, no con la clave interna", async () => {
      const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
      const before = snapshot(p.root);
      expect((await exec(["group-add", "14", "8", "--apply"], p)).err).toContain("La Tarea 8 está pausada: solo se suman al grupo tareas libres. No se escribió nada.");
      expect((await exec(["group-add", "14", "18", "11", "--apply"], p)).err).toContain("La Tarea 11 ya está cerrada (figura en history.md): solo se suman al grupo tareas libres. No se escribió nada.");
      expect(snapshot(p.root)).toEqual(before);

      const current = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_CURRENT, "backlog.md": BACKLOG_RICH, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH });
      const beforeCurrent = snapshot(current.root);
      const { code, err } = await exec(["group-add", "14", "12", "--apply"], current);
      expect(code).toBe(1);
      expect(err).toContain("La Tarea 12 es la tarea en curso: solo se suman al grupo tareas libres. No se escribió nada.");
      expect(err).not.toContain("in-progress");
      expect(snapshot(current.root)).toEqual(beforeCurrent);
    });

    test("tarea a sumar que además figura en otro lugar: se niega", async () => {
      const handoff = `${HANDOFF_IDLE}\n### Tarea 18 — Revisar los links\n\n- **Qué falta:** todo.\n`;
      const p = project({ folders: ["gersom"], contents: { "handoff.md": handoff, "backlog.md": BACKLOG_RICH, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH });
      const before = snapshot(p.root);
      const { code, err } = await exec(["group-add", "14", "18", "--apply"], p);
      expect(code).toBe(1);
      expect(err).toContain("La Tarea 18 aparece en 2 lugares (pausada, libres): una tarea vive en un solo lugar; corrígelo a mano. No se escribió nada.");
      expect(err).not.toContain("paused");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("tarea de otro operador (T-N@op): se niega, sea la N o una a sumar", async () => {
      const p = project({ folders: ["gersom", "ana"], ...idle(BACKLOG_RICH), folderContents: { ana: idle(BACKLOG_RICH).contents } });
      const before = snapshot(p.root);
      for (const args of [["T-14@ana", "18"], ["14", "T-18@ana"], ["14", "18", "18@ana"]]) {
        const arg = args.find((a) => a.includes("@"))!;
        const { code, err } = await exec(["group-add", ...args, "--apply"], p);
        expect(code).toBe(1);
        expect(err).toContain(`group-add solo suma tareas de tu propia carpeta; «${arg}» es de otro operador (solo lectura). No se escribió nada.`);
      }
      expect(snapshot(p.root)).toEqual(before);
    });

    test("uso: sin argumentos, solo la N, texto no numérico", async () => {
      const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
      const before = snapshot(p.root);
      const none = await exec(["group-add", "--apply"], p);
      expect(none.code).toBe(2);
      expect(none.err).toContain("Indica una tarea del grupo y las tareas libres que le sumas: `group-add <N> <M>...`.");
      const only = await exec(["group-add", "14", "--apply"], p);
      expect(only.code).toBe(2);
      expect(only.err).toContain("Indica al menos una tarea libre para sumar al grupo de la Tarea 14: `group-add <N> <M>...`.");
      const title = await exec(["group-add", "Redactar costs", "18", "--apply"], p);
      expect(title.code).toBe(2);
      expect(title.err).toContain("«Redactar costs» no es un número de tarea: `group-add <N> <M>...`.");
      const word = await exec(["group-add", "14", "uno", "--apply"], p);
      expect(word.code).toBe(2);
      expect(word.err).toContain("«uno» no es un número de tarea: `group-add <N> <M>...`.");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("carpeta de otro operador (--operator): se niega", async () => {
      const p = project({ folders: ["gersom", "ana"], ...idle(BACKLOG_RICH), folderContents: { ana: idle(BACKLOG_RICH).contents } });
      const before = snapshot(p.root);
      expect((await exec(["group-add", "14", "18", "--operator", "ana", "--apply"], p)).err).toContain("«ana» no es la tuya");
      expect(snapshot(p.root)).toEqual(before);
    });
  });
});
