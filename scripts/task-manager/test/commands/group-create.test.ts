// `group-create`: forma un grupo con tareas libres del backlog. Contra proyectos temporales: nunca
// se tocan los docs reales.

import { afterAll, describe, expect, test } from "bun:test";
import { parseBacklog } from "../../../_shared/parse/backlog.ts";
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
const backlog = (p: Project) => readIn(p, "gersom", "backlog.md");
const CREATE = ["group-create", "--tasks", "18, 1", "--title", "Revisiones", "--summary", "Revisar y probar."];

describe("group-create", () => {
  test("sin --apply muestra el diff y no escribe nada", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    const before = snapshot(p.root);
    const { code, out } = await exec(CREATE, p);
    expect(code).toBe(0);
    expect(out).toContain("+### Grupo — Revisiones (Tareas 18, 1)");
    expect(out).toContain("+- **Resumen:** Revisar y probar.");
    expect(out).toContain("+#### Tarea 18 — Revisar los links");
    expect(out).toContain(APPLY_NOTICE);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("--dry-run gana sobre --apply", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    const before = snapshot(p.root);
    expect((await exec([...CREATE, "--dry-run", "--apply"], p)).code).toBe(0);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("--apply saca las tareas de «libres», deja la referencia al final y el contenedor al final de «agrupadas»", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    const { code, out } = await exec([...CREATE, "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Grupo «Revisiones» creado con las Tareas 18, 1: pasaron de «Tareas libres» a «Tareas agrupadas» de docs/agents/gersom/backlog.md.");
    const tarea1 = "### Tarea 1 — Probar el flujo completo\n\n- **Descripción:** CUERPO-1\n- **Bloqueos:** Ninguno.\n- **Disparador:** cuando el operador pregunte por tareas pendientes.\n";
    const tarea18 = "### Tarea 18 — Revisar los links\n\n- **Disparador:** antes del release.\n";
    expect(backlog(p)).toBe(
      BACKLOG_RICH.replace(`${tarea1}\n`, "")
        .replace(tarea18, "### Grupo — Revisiones (Tareas 18, 1)\n\n- **Resumen:** Revisar y probar.\n")
        .replace(
          "- **Descripción:** límites.\n",
          `- **Descripción:** límites.\n\n### Grupo — Revisiones\n\n#${tarea18}\n#${tarea1}`,
        ),
    );
    const state = JSON.parse((await exec(["status", "--json"], p)).out);
    // Cada tarea aparece una sola vez y con su grupo.
    expect(state.free.map((t: { number: number; group: string | null }) => [t.number, t.group])).toEqual([[14, "Documentar los planes"], [15, "Documentar los planes"], [3, null], [18, "Revisiones"], [1, "Revisiones"]]);
    const parsed = parseBacklog(backlog(p));
    expect(parsed.free.tasks.map((t) => t.number)).toEqual([3]);
    expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Documentar los planes", [14, 15]], ["Revisiones", [18, 1]]]);
    expect(parsed.grouped.map((g) => [g.title, g.tasks.map((t) => t.number)])).toEqual([["Documentar los planes", [14, 15]], ["Revisiones", [18, 1]]]);
    // El título ya está usado: repetirlo no escribe nada.
    const again = await exec(["group-create", "--tasks", "3,14", "--title", "revisiones", "--summary", "x", "--apply"], p);
    expect(again.code).toBe(1);
  });

  test("--json", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    const pending = JSON.parse((await exec([...CREATE, "--json"], p)).out);
    expect(pending).toMatchObject({ command: "group-create", applied: false, pending: true, group: { title: "Revisiones", summary: "Revisar y probar.", tasks: [18, 1] } });
    expect(JSON.parse((await exec([...CREATE, "--json", "--apply"], p)).out)).toMatchObject({ applied: true, pending: false });
  });

  test("un proyecto en inglés: las palabras del grupo salen en inglés y el resultado se vuelve a leer", async () => {
    const raw = BACKLOG_EN.replace(
      "- **Added:** 2026-10-01.\n\n<!-- agent-context-skill:section=blocked -->",
      "- **Added:** 2026-10-01.\n\n### Task 3 — Publish the glossary\n\n- **Description:** publish it.\n- **Blockers:** None.\n- **Trigger:** after the translation.\n- **Added:** 2026-10-01.\n\n<!-- agent-context-skill:section=blocked -->",
    );
    const p = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_IDLE_EN, "backlog.md": raw, "history.md": HISTORY_EN } });
    expect((await exec(["group-create", "--tasks", "3,4", "--title", "Glossary", "--summary", "Translate and publish.", "--apply"], p)).code).toBe(0);
    const text = backlog(p);
    expect(text).toContain("## Free tasks\n\n### Group — Glossary (Tasks 3, 4)\n\n- **Summary:** Translate and publish.\n\n<!-- agent-context-skill:section=blocked -->");
    expect(text).toContain("## Grouped tasks\n\n### Group — Glossary\n\n#### Task 3 — Publish the glossary\n\n");
    expect(text).toContain("\n\n#### Task 4 — Translate the glossary\n\n");
    const state = JSON.parse((await exec(["status", "--json"], p)).out);
    expect(state.free.map((t: { number: number; group: string | null }) => [t.number, t.group])).toEqual([[3, "Glossary"], [4, "Glossary"]]);
    const parsed = parseBacklog(text);
    expect(parsed.free.tasks).toEqual([]);
    expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Glossary", [3, 4]]]);
    expect(parsed.grouped.map((g) => [g.title, g.tasks.map((t) => t.number)])).toEqual([["Glossary", [3, 4]]]);
  });

  describe("errores: no se escribe nada", () => {
    test("uso: faltan flags, --tasks mal formado, título o resumen de varias líneas, argumentos", async () => {
      const p = project({ folders: ["gersom"], ...IDLE });
      const before = snapshot(p.root);
      const run = (...args: string[]) => exec(["group-create", ...args, "--apply"], p);
      expect((await run("--title", "T", "--summary", "S")).code).toBe(2);
      expect((await run("--tasks", "1,18", "--summary", "S")).code).toBe(2);
      expect((await run("--tasks", "1,18", "--title", "T")).code).toBe(2);
      // Los que rechaza parseTaskList: el mensaje nombra el elemento que no es un número.
      const malformed: Array<[string, string]> = [["1,x", "x"], ["1,,18", ""], ["1,18,", ""], ["a,b", "a"], ["uno", "uno"], ["1;2", "1;2"], ["1.5", "1.5"], ["1.5,18", "1.5"], ["1@ana,18", "1@ana"], ["T-1,18", "T-1"]];
      for (const [tasks, item] of malformed) {
        const bad = await run("--tasks", tasks, "--title", "T", "--summary", "S");
        expect(bad.code).toBe(2);
        expect(bad.err).toContain(`--tasks es una lista de números de tarea separados por comas (ej. «12,23,32»); «${item}» no lo es.`);
      }
      // Los que rechaza el parser de flags antes de llegar a parseTaskList.
      expect((await run("--tasks", "-1,18", "--title", "T", "--summary", "S")).err).toContain("El valor de --tasks es ambiguo");
      expect((await run("--tasks", " ", "--title", "T", "--summary", "S")).err).toContain("Falta --tasks.");
      expect((await run("--tasks", "1,18", "--title", "uno\ndos", "--summary", "S")).code).toBe(2);
      expect((await run("--tasks", "1,18", "--title", "T", "--summary", "uno\ndos")).code).toBe(2);
      expect((await run("1", "--tasks", "1,18", "--title", "T", "--summary", "S")).code).toBe(2);
      expect(snapshot(p.root)).toEqual(before);
    });

    test("tareas que no se pueden agrupar: pocas, repetidas, bloqueada, agrupada, inexistente; título repetido", async () => {
      const p = project({ folders: ["gersom"], ...IDLE });
      const before = snapshot(p.root);
      const run = (tasks: string, title = "T") => exec(["group-create", "--tasks", tasks, "--title", title, "--summary", "S", "--apply"], p);
      expect((await run("1")).err).toContain("Un grupo necesita al menos 2 tareas");
      expect((await run("1,1")).err).toContain("La Tarea 1 está repetida");
      expect((await run("1,6")).err).toContain("La Tarea 6 está en «Tareas bloqueadas / pospuestas»");
      expect((await run("1,14")).err).toContain("La Tarea 14 ya está en el grupo «Documentar los planes»");
      expect((await run("1,99")).err).toContain("La Tarea 99 no figura en «Tareas libres»");
      const repeated = await run("1,18", "documentar los PLANES");
      expect(repeated.code).toBe(1);
      expect(repeated.err).toContain("Ya hay un grupo con el título «Documentar los planes»");
      expect(repeated.err).toContain("No se escribió nada.");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("carpeta de otro operador: se niega", async () => {
      const p = project({ folders: ["gersom", "ana"], ...IDLE, folderContents: { ana: IDLE.contents } });
      const before = snapshot(p.root);
      expect((await exec([...CREATE, "--operator", "ana", "--apply"], p)).err).toContain("«ana» no es la tuya");
      expect(snapshot(p.root)).toEqual(before);
    });
  });
});
