// `group-edit`: cambia el título y/o el resumen de un grupo.
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

// BACKLOG_RICH tiene el grupo «Documentar los planes» (Tareas 14 y 15, con su Resumen) y las libres 1, 3 y 18.
const OLD_SUMMARY = "todo lo de `plans/`.";
const FREE_END = "<!-- agent-context-skill:section=blocked -->";
const idle = (backlogText: string) => ({ contents: { "handoff.md": HANDOFF_IDLE, "backlog.md": backlogText, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH });
const backlog = (p: Project) => readIn(p, "gersom", "backlog.md");
// Con un segundo grupo, «Otros» (Tareas 19 y 20), después del primero en las dos secciones.
const TWO_GROUPS = BACKLOG_RICH.replace(FREE_END, `### Grupo — Otros (Tareas 19, 20)\n\n- **Resumen:** varias.\n\n${FREE_END}`).concat(
  "\n### Grupo — Otros\n\n#### Tarea 19 — Ordenar\n\n- **Descripción:** orden.\n\n#### Tarea 20 — Limpiar\n\n- **Descripción:** limpieza.\n",
);
const retitled = (text: string, title: string) => text.replaceAll("Documentar los planes", title);

describe("group-edit", () => {
  test("sin --apply muestra el diff y no escribe nada", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const before = snapshot(p.root);
    const { code, out } = await exec(["group-edit", "14", "--title", "Docs", "--summary", "Un resumen."], p);
    expect(code).toBe(0);
    expect(out).toContain("-### Grupo — Documentar los planes (Tareas 14, 15)");
    expect(out).toContain("+### Grupo — Docs (Tareas 14, 15)");
    expect(out).toContain("+- **Resumen:** Un resumen.");
    expect(out).toContain("+### Grupo — Docs");
    expect(out).toContain(APPLY_NOTICE);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("--dry-run gana sobre --apply", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const before = snapshot(p.root);
    expect((await exec(["group-edit", "14", "--title", "Docs", "--dry-run", "--apply"], p)).code).toBe(0);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("--apply con --title: cambia el título en la referencia y en el contenedor, y se vuelve a leer", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const { code, out } = await exec(["group-edit", "15", "--title", "Planes de costos", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Grupo «Documentar los planes» editado en docs/agents/gersom/backlog.md: ahora se llama «Planes de costos».");
    expect(backlog(p)).toBe(retitled(BACKLOG_RICH, "Planes de costos"));
    const parsed = parseBacklog(backlog(p));
    expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Planes de costos", [14, 15]]]);
    expect(parsed.grouped.map((g) => [g.title, g.tasks.map((t) => t.number)])).toEqual([["Planes de costos", [14, 15]]]);
    const state = JSON.parse((await exec(["status", "--json"], p)).out);
    expect(state.free.map((t: { number: number; group: string | null }) => [t.number, t.group])).toEqual([[1, null], [14, "Planes de costos"], [15, "Planes de costos"], [3, null], [18, null]]);
  });

  test("--apply con --summary: cambia solo el valor del Resumen", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const { code, out } = await exec(["group-edit", "T-14", "--summary", "Los planes del proyecto.", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe(`Grupo «Documentar los planes» editado en docs/agents/gersom/backlog.md: resumen «${OLD_SUMMARY}» → «Los planes del proyecto.».`);
    expect(backlog(p)).toBe(BACKLOG_RICH.replace(OLD_SUMMARY, "Los planes del proyecto."));
    expect(parseBacklog(backlog(p)).free.groups[0].body).toBe("- **Resumen:** Los planes del proyecto.");
  });

  test("--apply con los dos", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const { code, out } = await exec(["group-edit", "14", "--title", "Docs", "--summary", "Un resumen.", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe(`Grupo «Documentar los planes» editado en docs/agents/gersom/backlog.md: ahora se llama «Docs»; resumen «${OLD_SUMMARY}» → «Un resumen.».`);
    expect(backlog(p)).toBe(retitled(BACKLOG_RICH, "Docs").replace(OLD_SUMMARY, "Un resumen."));
  });

  test("--summary - lee el resumen de stdin", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const { code } = await exec(["group-edit", "14", "--summary", "-", "--apply"], p, { stdin: "Resumen por stdin.\n" });
    expect(code).toBe(0);
    expect(backlog(p)).toBe(BACKLOG_RICH.replace(OLD_SUMMARY, "Resumen por stdin."));
  });

  test("un grupo sin línea de Resumen: se agrega tras el header", async () => {
    const raw = BACKLOG_RICH.replace(`\n\n- **Resumen:** ${OLD_SUMMARY}`, "");
    expect(raw).not.toContain("**Resumen:**");
    const p = project({ folders: ["gersom"], ...idle(raw) });
    const { code, out } = await exec(["group-edit", "14", "--summary", "Nuevo resumen.", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Grupo «Documentar los planes» editado en docs/agents/gersom/backlog.md: resumen agregado: «Nuevo resumen.».");
    expect(backlog(p)).toBe(BACKLOG_RICH.replace(OLD_SUMMARY, "Nuevo resumen."));
  });

  test("un grupo con un campo propio `Nota` y sin Resumen: el Resumen se agrega y la Nota no se pisa", async () => {
    const raw = BACKLOG_RICH.replace(`\n\n- **Resumen:** ${OLD_SUMMARY}`, "\n\n- **Nota:** y.");
    const p = project({ folders: ["gersom"], ...idle(raw) });
    const { code, out } = await exec(["group-edit", "14", "--summary", "Nuevo resumen.", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Grupo «Documentar los planes» editado en docs/agents/gersom/backlog.md: resumen agregado: «Nuevo resumen.».");
    expect(backlog(p)).toBe(raw.replace("\n\n- **Nota:** y.", "\n\n- **Resumen:** Nuevo resumen.\n\n- **Nota:** y."));
  });

  test("con dos grupos, solo cambia el pedido (el que no es el último)", async () => {
    const p = project({ folders: ["gersom"], ...idle(TWO_GROUPS) });
    expect((await exec(["group-edit", "14", "--title", "Docs", "--summary", "Un resumen.", "--apply"], p)).code).toBe(0);
    expect(backlog(p)).toBe(retitled(TWO_GROUPS, "Docs").replace(OLD_SUMMARY, "Un resumen."));
    const parsed = parseBacklog(backlog(p));
    expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Docs", [14, 15]], ["Otros", [19, 20]]]);
    expect(parsed.grouped.map((g) => [g.title, g.tasks.map((t) => t.number)])).toEqual([["Docs", [14, 15]], ["Otros", [19, 20]]]);
  });

  test("si uno de los dos valores ya es el actual, cambia solo el otro y --json lo dice", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const { code, out } = await exec(["group-edit", "14", "--title", "Documentar los planes", "--summary", "Nuevo.", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe(`Grupo «Documentar los planes» editado en docs/agents/gersom/backlog.md: resumen «${OLD_SUMMARY}» → «Nuevo.».`);
    expect(backlog(p)).toBe(BACKLOG_RICH.replace(OLD_SUMMARY, "Nuevo."));
    const json = JSON.parse((await exec(["group-edit", "14", "--title", "Documentar los planes", "--summary", "Otro.", "--json"], p)).out);
    expect(json.changed).toEqual(["summary"]);
  });

  test("--json: pendiente y aplicado", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const pending = JSON.parse((await exec(["group-edit", "14", "--title", "Docs", "--summary", "Un resumen.", "--json"], p)).out);
    expect(pending).toMatchObject({ command: "group-edit", applied: false, pending: true, group: { title: "Docs", tasks: [14, 15] }, changed: ["title", "summary"] });
    expect(backlog(p)).toBe(BACKLOG_RICH);
    const applied = JSON.parse((await exec(["group-edit", "14", "--title", "Docs", "--json", "--apply"], p)).out);
    expect(applied).toMatchObject({ command: "group-edit", applied: true, pending: false, group: { title: "Docs", tasks: [14, 15] }, changed: ["title"] });
    expect(applied.files).toEqual([{ file: "docs/agents/gersom/backlog.md", changed: true, written: true }]);
    expect(backlog(p)).toBe(retitled(BACKLOG_RICH, "Docs"));
  });

  test("un proyecto en inglés: conserva las palabras del grupo y agrega el resumen con su etiqueta", async () => {
    const raw = BACKLOG_EN.replace(
      "- **Added:** 2026-10-01.\n\n<!-- agent-context-skill:section=blocked -->",
      "- **Added:** 2026-10-01.\n\n### Task 3 — Publish the glossary\n\n- **Description:** publish it.\n- **Blockers:** None.\n- **Trigger:** after the translation.\n- **Added:** 2026-10-01.\n\n<!-- agent-context-skill:section=blocked -->",
    );
    const p = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_IDLE_EN, "backlog.md": raw, "history.md": HISTORY_EN } });
    expect((await exec(["group-create", "--tasks", "4,3", "--title", "Glossary", "--summary", "Translate and publish.", "--apply"], p)).code).toBe(0);
    const { code, out } = await exec(["group-edit", "3", "--title", "Terms", "--summary", "Translate and release.", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Grupo «Glossary» editado en docs/agents/gersom/backlog.md: ahora se llama «Terms»; resumen «Translate and publish.» → «Translate and release.».");
    const text = backlog(p);
    expect(text).toContain("### Group — Terms (Tasks 4, 3)\n\n- **Summary:** Translate and release.\n");
    expect(text).toContain("## Grouped tasks\n\n### Group — Terms\n\n#### Task 4 — Translate the glossary\n");
    expect(text).not.toContain("Glossary");
    const parsed = parseBacklog(text);
    expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Terms", [4, 3]]]);
    expect(parsed.grouped.map((g) => [g.title, g.tasks.map((t) => t.number)])).toEqual([["Terms", [4, 3]]]);

    // Sin línea de resumen, la nueva sale con la etiqueta del archivo (inglés).
    const bare = text.replace("\n\n- **Summary:** Translate and release.", "");
    const q = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_IDLE_EN, "backlog.md": bare, "history.md": HISTORY_EN } });
    expect((await exec(["group-edit", "4", "--summary", "Added again.", "--apply"], q)).code).toBe(0);
    expect(backlog(q)).toContain("### Group — Terms (Tasks 4, 3)\n\n- **Summary:** Added again.\n");
  });

  test("un archivo CRLF sigue siendo CRLF y se vuelve a leer", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH.replace(/\n/g, "\r\n")) });
    expect((await exec(["group-edit", "14", "--title", "Docs", "--summary", "Un resumen.", "--apply"], p)).code).toBe(0);
    const text = backlog(p);
    expect(text).toBe(retitled(BACKLOG_RICH, "Docs").replace(OLD_SUMMARY, "Un resumen.").replace(/\n/g, "\r\n"));
    expect(text.replace(/\r\n/g, "")).not.toContain("\n"); // ningún LF suelto
    expect(parseBacklog(text).free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Docs", [14, 15]]]);
  });

  describe("errores: no se escribe nada", () => {
    test("uso: sin argumentos, sin flags, flag vacío o de varias líneas, texto no numérico", async () => {
      const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
      const before = snapshot(p.root);
      const usage = "`group-edit <N> [--title <texto>] [--summary <texto>]`";
      const none = await exec(["group-edit", "--title", "Docs", "--apply"], p);
      expect(none.code).toBe(2);
      expect(none.err).toContain(`Indica una tarea del grupo que editas: ${usage}.`);
      const noFlags = await exec(["group-edit", "14", "--apply"], p);
      expect(noFlags.code).toBe(2);
      expect(noFlags.err).toContain(`Indica qué cambiar del grupo: --title, --summary o ambos: ${usage}.`);
      const two = await exec(["group-edit", "14", "15", "--title", "Docs", "--apply"], p);
      expect(two.code).toBe(2);
      expect(two.err).toContain("Indica una tarea del grupo que editas");
      const empty = await exec(["group-edit", "14", "--title", "  ", "--apply"], p);
      expect(empty.code).toBe(2);
      expect(empty.err).toContain("--title está vacío: group-edit no borra el título; pasa el texto nuevo.");
      const emptySummary = await exec(["group-edit", "14", "--summary", "  ", "--apply"], p);
      expect(emptySummary.code).toBe(2);
      expect(emptySummary.err).toContain("--summary está vacío: group-edit no borra el resumen; pasa el texto nuevo.");
      expect((await exec(["group-edit", "14", "--title", "uno\ndos", "--apply"], p)).code).toBe(2);
      expect((await exec(["group-edit", "14", "--summary", "uno\ndos", "--apply"], p)).code).toBe(2);
      const title = await exec(["group-edit", "Redactar costs", "--title", "Docs", "--apply"], p);
      expect(title.code).toBe(2);
      expect(title.err).toContain(`«Redactar costs» no es un número de tarea: ${usage}.`);
      const word = await exec(["group-edit", "uno", "--title", "Docs", "--apply"], p);
      expect(word.code).toBe(2);
      expect(word.err).toContain(`«uno» no es un número de tarea: ${usage}.`);
      expect(snapshot(p.root)).toEqual(before);
    });

    test("N no agrupada: dice dónde está", async () => {
      const current = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_CURRENT, "backlog.md": BACKLOG_RICH, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH });
      const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
      const before = snapshot(p.root);
      const free = await exec(["group-edit", "1", "--title", "Docs", "--apply"], p);
      expect(free.code).toBe(1);
      expect(free.err).toContain("La Tarea 1 es una tarea libre, no está agrupada: indica una tarea que ya pertenezca al grupo. No se escribió nada.");
      expect((await exec(["group-edit", "6", "--title", "Docs", "--apply"], p)).err).toContain("La Tarea 6 está en «bloqueadas / pospuestas», no está agrupada: indica una tarea");
      expect((await exec(["group-edit", "8", "--title", "Docs", "--apply"], p)).err).toContain("La Tarea 8 está pausada: indica una tarea que ya pertenezca al grupo. No se escribió nada.");
      expect((await exec(["group-edit", "11", "--title", "Docs", "--apply"], p)).err).toContain("La Tarea 11 ya está cerrada (figura en history.md): indica una tarea que ya pertenezca al grupo. No se escribió nada.");
      expect(snapshot(p.root)).toEqual(before);

      const beforeCurrent = snapshot(current.root);
      const running = await exec(["group-edit", "12", "--title", "Docs", "--apply"], current);
      expect(running.code).toBe(1);
      expect(running.err).toContain("La Tarea 12 es la tarea en curso: indica una tarea que ya pertenezca al grupo. No se escribió nada.");
      expect(running.err).not.toContain("in-progress");
      expect(snapshot(current.root)).toEqual(beforeCurrent);
    });

    test("N inexistente: lo dice y muestra los números conocidos", async () => {
      const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
      const before = snapshot(p.root);
      const { code, err } = await exec(["group-edit", "99", "--title", "Docs", "--apply"], p);
      expect(code).toBe(1);
      expect(err).toContain("No existe la Tarea 99. Números conocidos:");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("N que figura en varios lugares: se niega", async () => {
      const handoff = `${HANDOFF_IDLE}\n### Tarea 14 — Redactar \`costs.md\`\n\n- **Qué falta:** todo.\n`;
      const p = project({ folders: ["gersom"], contents: { "handoff.md": handoff, "backlog.md": BACKLOG_RICH, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH });
      const before = snapshot(p.root);
      const { code, err } = await exec(["group-edit", "14", "--title", "Docs", "--apply"], p);
      expect(code).toBe(1);
      expect(err).toContain("La Tarea 14 aparece en 2 lugares (pausada, agrupadas): una tarea vive en un solo lugar; corrígelo a mano. No se escribió nada.");
      expect(err).not.toContain("paused");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("tarea de otro operador (T-N@op): se niega", async () => {
      const p = project({ folders: ["gersom", "ana"], ...idle(BACKLOG_RICH), folderContents: { ana: idle(BACKLOG_RICH).contents } });
      const before = snapshot(p.root);
      for (const arg of ["T-14@ana", "14@ana"]) {
        const { code, err } = await exec(["group-edit", arg, "--title", "Docs", "--apply"], p);
        expect(code).toBe(1);
        expect(err).toContain(`group-edit solo edita grupos de tu propia carpeta; «${arg}» es de otro operador (solo lectura). No se escribió nada.`);
      }
      expect(snapshot(p.root)).toEqual(before);
    });

    test("carpeta de otro operador (--operator): se niega", async () => {
      const p = project({ folders: ["gersom", "ana"], ...idle(BACKLOG_RICH), folderContents: { ana: idle(BACKLOG_RICH).contents } });
      const before = snapshot(p.root);
      expect((await exec(["group-edit", "14", "--title", "Docs", "--operator", "ana", "--apply"], p)).err).toContain("«ana» no es la tuya");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("comentario HTML en el header del grupo: pide quitarlo a mano y no escribe nada", async () => {
      const raw = BACKLOG_RICH.replace("### Grupo — Documentar los planes (Tareas 14, 15)", "### Grupo — Documentar los planes (Tareas 14, 15) <!-- x -->");
      expect(raw).not.toBe(BACKLOG_RICH);
      const p = project({ folders: ["gersom"], ...idle(raw) });
      const before = snapshot(p.root);
      const { code, err } = await exec(["group-edit", "14", "--title", "Docs", "--apply"], p);
      expect(code).toBe(1);
      expect(err).toContain("tiene un comentario HTML: quita el comentario del header a mano. No se escribió nada.");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("valores que no se pueden escribir: repetido, igual al actual, inválido", async () => {
      const p = project({ folders: ["gersom"], ...idle(TWO_GROUPS) });
      const before = snapshot(p.root);
      const run = (...args: string[]) => exec(["group-edit", "14", ...args, "--apply"], p);
      const repeated = await run("--title", "otros");
      expect(repeated.code).toBe(1);
      expect(repeated.err).toContain("Ya hay un grupo con el título «Otros»: el título identifica al grupo y debe ser único. No se escribió nada.");
      const same = await run("--title", "Documentar los planes");
      expect(same.code).toBe(1);
      expect(same.err).toContain("El grupo «Documentar los planes» ya tiene el título que indicas: no hay nada que cambiar. No se escribió nada.");
      expect((await run("--summary", OLD_SUMMARY)).err).toContain("ya tiene el resumen que indicas: no hay nada que cambiar.");
      expect((await run("--title", "Documentar los planes", "--summary", OLD_SUMMARY)).err).toContain("ya tiene el título y el resumen que indicas");
      expect((await run("--title", "Fase (2)")).err).toContain("se leería como la referencia de un grupo");
      expect((await run("--title", "Fase (2")).err).toContain("tiene un paréntesis sin cerrar");
      expect((await run("--title", "Fase <!-- x")).err).toContain("El título del grupo no puede contener «<!--» ni «-->»");
      expect((await run("--summary", "Un --> resumen")).err).toContain("El resumen del grupo no puede contener «<!--» ni «-->»");
      expect(snapshot(p.root)).toEqual(before);
    });
  });
});
