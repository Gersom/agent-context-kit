// `group-eject`: saca una tarea agrupada de su grupo (y desarma el grupo si queda con menos de 2 tareas).
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

// BACKLOG_RICH tiene el grupo «Documentar los planes» con las Tareas 14 y 15 (se desarma al sacar una).
// GROUP3 le suma la Tarea 19: con tres tareas, sacar una deja el grupo con dos.
const TAREA_15 = "Tarea 15 — Redactar `limits.md`\n\n- **Descripción:** límites.\n";
const GROUP3 = BACKLOG_RICH.replace("(Tareas 14, 15)", "(Tareas 14, 15, 19)").replace(
  "- **Descripción:** límites.\n",
  "- **Descripción:** límites.\n\n#### Tarea 19 — Medir los tiempos\n\n- **Descripción:** CUERPO-19.\n",
);
const idle = (backlogText: string) => ({ contents: { "handoff.md": HANDOFF_IDLE, "backlog.md": backlogText, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH });
const backlog = (p: Project) => readIn(p, "gersom", "backlog.md");
const FREE_END = "<!-- agent-context-skill:section=blocked -->";

describe("group-eject", () => {
  test("sin --apply muestra el diff y no escribe nada", async () => {
    const p = project({ folders: ["gersom"], ...idle(GROUP3) });
    const before = snapshot(p.root);
    const { code, out } = await exec(["group-eject", "15"], p);
    expect(code).toBe(0);
    expect(out).toContain("+### Tarea 15 — Redactar `limits.md`");
    expect(out).toContain("-#### Tarea 15 — Redactar `limits.md`");
    expect(out).toContain(APPLY_NOTICE);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("--dry-run gana sobre --apply", async () => {
    const p = project({ folders: ["gersom"], ...idle(GROUP3) });
    const before = snapshot(p.root);
    expect((await exec(["group-eject", "15", "--dry-run", "--apply"], p)).code).toBe(0);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("--apply en un grupo de 3: la tarea pasa al final de «libres», sale de la referencia y el grupo queda con 2", async () => {
    const p = project({ folders: ["gersom"], ...idle(GROUP3) });
    const { code, out } = await exec(["group-eject", "15", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Tarea 15 sacada del grupo «Documentar los planes»: pasó a «Tareas libres» de docs/agents/gersom/backlog.md.");
    expect(backlog(p)).toBe(
      GROUP3.replace("(Tareas 14, 15, 19)", "(Tareas 14, 19)")
        .replace(`#### ${TAREA_15}\n`, "")
        .replace(FREE_END, `### ${TAREA_15}\n${FREE_END}`),
    );
    const parsed = parseBacklog(backlog(p));
    expect(parsed.free.tasks.map((t) => t.number)).toEqual([1, 3, 18, 15]);
    expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Documentar los planes", [14, 19]]]);
    expect(parsed.grouped.map((g) => [g.title, g.tasks.map((t) => t.number)])).toEqual([["Documentar los planes", [14, 19]]]);
    const state = JSON.parse((await exec(["status", "--json"], p)).out);
    expect(state.free.map((t: { number: number; group: string | null }) => [t.number, t.group])).toEqual([[1, null], [14, "Documentar los planes"], [19, "Documentar los planes"], [3, null], [18, null], [15, null]]);
  });

  test("--apply en un grupo de 2: se desarma, la otra tarea también vuelve a «libres» y «agrupadas» queda vacía", async () => {
    const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const { code, out } = await exec(["group-eject", "14", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe(
      "Tarea 14 sacada del grupo «Documentar los planes»: pasó a «Tareas libres» de docs/agents/gersom/backlog.md. " +
        "El grupo quedó con menos de 2 tareas y se desarmó: la Tarea 15 también volvió a «Tareas libres» y se eliminaron su referencia y su contenedor.",
    );
    const tarea14 = "Tarea 14 — Redactar `costs.md`\n\n- **Descripción:** costos CUERPO-14.\n- **Disparador:** cuando se cierre el diseño.\n";
    const reference = "### Grupo — Documentar los planes (Tareas 14, 15)\n\n- **Resumen:** todo lo de `plans/`.\n";
    const groupedStart = BACKLOG_RICH.indexOf("<!-- agent-context-skill:section=grouped -->");
    expect(backlog(p)).toBe(
      `${BACKLOG_RICH.slice(0, groupedStart)
        .replace(`${reference}\n`, "")
        .replace(FREE_END, `### ${tarea14}\n### ${TAREA_15}\n${FREE_END}`)}<!-- agent-context-skill:section=grouped -->\n## Tareas agrupadas\n\nNo aplica todavía — ningún grupo formado.\n`,
    );
    const parsed = parseBacklog(backlog(p));
    expect(parsed.free.tasks.map((t) => t.number)).toEqual([1, 3, 18, 14, 15]);
    expect(parsed.free.groups).toEqual([]);
    expect(parsed.grouped).toEqual([]);
  });

  test("contenedor de una sola tarea armado a mano: el mensaje no habla de otras tareas que vuelven", async () => {
    const single = BACKLOG_RICH.replace("(Tareas 14, 15)", "(Tarea 14)").replace(`\n#### ${TAREA_15}`, "");
    const p = project({ folders: ["gersom"], ...idle(single) });
    expect(parseBacklog(single).grouped.map((g) => g.tasks.map((t) => t.number))).toEqual([[14]]);
    const { code, out } = await exec(["group-eject", "14", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe(
      "Tarea 14 sacada del grupo «Documentar los planes»: pasó a «Tareas libres» de docs/agents/gersom/backlog.md. " +
        "El grupo quedó con menos de 2 tareas y se desarmó: se eliminaron su referencia y su contenedor.",
    );
    const parsed = parseBacklog(backlog(p));
    expect(parsed.free.tasks.map((t) => t.number)).toEqual([1, 3, 18, 14]);
    expect(parsed.free.groups).toEqual([]);
    expect(parsed.grouped).toEqual([]);
  });

  test("--json: lo sacado, si el grupo se desarmó y qué tareas volvieron", async () => {
    const three = project({ folders: ["gersom"], ...idle(GROUP3) });
    const pending = JSON.parse((await exec(["group-eject", "T-15", "--json"], three)).out);
    expect(pending).toMatchObject({ command: "group-eject", applied: false, pending: true, ejected: 15, dissolved: false, returned: [], group: { title: "Documentar los planes", tasks: [14, 19] } });
    expect(JSON.parse((await exec(["group-eject", "15", "--json", "--apply"], three)).out)).toMatchObject({ applied: true, pending: false, ejected: 15, dissolved: false });

    const two = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
    const applied = JSON.parse((await exec(["group-eject", "15", "--json", "--apply"], two)).out);
    expect(applied).toMatchObject({ command: "group-eject", applied: true, pending: false, ejected: 15, dissolved: true, returned: [14], group: { title: "Documentar los planes", tasks: [] } });
    expect(applied.files).toEqual([{ file: "docs/agents/gersom/backlog.md", changed: true, written: true }]);
  });

  test("un proyecto en inglés: el grupo se desarma con las palabras del idioma y el resultado se vuelve a leer", async () => {
    const raw = BACKLOG_EN.replace(
      "- **Added:** 2026-10-01.\n\n<!-- agent-context-skill:section=blocked -->",
      "- **Added:** 2026-10-01.\n\n### Task 3 — Publish the glossary\n\n- **Description:** publish it.\n- **Blockers:** None.\n- **Trigger:** after the translation.\n- **Added:** 2026-10-01.\n\n<!-- agent-context-skill:section=blocked -->",
    );
    const p = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_IDLE_EN, "backlog.md": raw, "history.md": HISTORY_EN } });
    expect((await exec(["group-create", "--tasks", "3,4", "--title", "Glossary", "--summary", "Translate and publish.", "--apply"], p)).code).toBe(0);
    const { code, out } = await exec(["group-eject", "4", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe(
      "Tarea 4 sacada del grupo «Glossary»: pasó a «Tareas libres» de docs/agents/gersom/backlog.md. " +
        "El grupo quedó con menos de 2 tareas y se desarmó: la Tarea 3 también volvió a «Tareas libres» y se eliminaron su referencia y su contenedor.",
    );
    const text = backlog(p);
    expect(text).toContain("## Free tasks\n\n### Task 4 — Translate the glossary\n\n");
    expect(text).toContain("\n\n### Task 3 — Publish the glossary\n\n");
    expect(text).not.toContain("### Group");
    expect(text).not.toContain("####");
    expect(text).toContain("## Grouped tasks\n\nNot applicable yet — no groups formed.\n");
    const parsed = parseBacklog(text);
    expect(parsed.free.tasks.map((t) => t.number)).toEqual([4, 3]);
    expect(parsed.free.groups).toEqual([]);
    expect(parsed.grouped).toEqual([]);
  });

  describe("errores: no se escribe nada", () => {
    test("tarea que no está agrupada: dice dónde está", async () => {
      const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
      const before = snapshot(p.root);
      const free = await exec(["group-eject", "1", "--apply"], p);
      expect(free.code).toBe(1);
      expect(free.err).toContain("La Tarea 1 es una tarea libre, no está agrupada: solo se sacan de su grupo las tareas agrupadas. No se escribió nada.");
      expect((await exec(["group-eject", "6", "--apply"], p)).err).toContain("La Tarea 6 está en «bloqueadas / pospuestas», no está agrupada: solo se sacan");
      expect((await exec(["group-eject", "8", "--apply"], p)).err).toContain("La Tarea 8 está pausada: solo se sacan de su grupo las tareas agrupadas. No se escribió nada.");
      expect((await exec(["group-eject", "11", "--apply"], p)).err).toContain("La Tarea 11 ya está cerrada (figura en history.md): solo se sacan");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("tarea en curso: lo dice con palabras, no con la clave interna", async () => {
      const p = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_CURRENT, "backlog.md": BACKLOG_RICH, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH });
      const before = snapshot(p.root);
      const { code, err } = await exec(["group-eject", "12", "--apply"], p);
      expect(code).toBe(1);
      expect(err).toContain("La Tarea 12 es la tarea en curso: solo se sacan de su grupo las tareas agrupadas. No se escribió nada.");
      expect(err).not.toContain("in-progress");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("tarea agrupada que además figura en otro lugar: se niega y no escribe nada", async () => {
      const handoff = `${HANDOFF_IDLE}\n### Tarea 14 — Redactar \`costs.md\`\n\n- **Qué falta:** todo.\n`;
      const p = project({ folders: ["gersom"], contents: { "handoff.md": handoff, "backlog.md": BACKLOG_RICH, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH });
      const before = snapshot(p.root);
      const { code, err } = await exec(["group-eject", "14", "--apply"], p);
      expect(code).toBe(1);
      expect(err).toContain("La Tarea 14 aparece en 2 lugares (pausada, agrupadas): una tarea vive en un solo lugar; corrígelo a mano. No se escribió nada.");
      expect(err).not.toContain("paused");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("tarea inexistente: lo dice y muestra los números conocidos", async () => {
      const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
      const before = snapshot(p.root);
      const { code, err } = await exec(["group-eject", "99", "--apply"], p);
      expect(code).toBe(1);
      expect(err).toContain("No existe la Tarea 99. Números conocidos:");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("tarea de otro operador (T-N@op): se niega", async () => {
      const p = project({ folders: ["gersom", "ana"], ...idle(BACKLOG_RICH), folderContents: { ana: idle(BACKLOG_RICH).contents } });
      const before = snapshot(p.root);
      for (const arg of ["T-14@ana", "14@ana"]) {
        const { code, err } = await exec(["group-eject", arg, "--apply"], p);
        expect(code).toBe(1);
        expect(err).toContain(`group-eject solo saca tareas de tu propia carpeta; «${arg}» es de otro operador (solo lectura). No se escribió nada.`);
      }
      expect(snapshot(p.root)).toEqual(before);
    });

    test("uso: sin argumento, dos argumentos, texto no numérico", async () => {
      const p = project({ folders: ["gersom"], ...idle(BACKLOG_RICH) });
      const before = snapshot(p.root);
      const none = await exec(["group-eject", "--apply"], p);
      expect(none.code).toBe(2);
      expect(none.err).toContain("Indica la tarea agrupada que sacas de su grupo: `group-eject <N>`.");
      const two = await exec(["group-eject", "14", "15", "--apply"], p);
      expect(two.code).toBe(2);
      expect(two.err).toContain("Indica la tarea agrupada que sacas de su grupo: `group-eject <N>`.");
      const title = await exec(["group-eject", "Redactar costs", "--apply"], p);
      expect(title.code).toBe(2);
      expect(title.err).toContain("«Redactar costs» no es un número de tarea: `group-eject <N>`.");
      expect((await exec(["group-eject", "uno", "--apply"], p)).err).toContain("«uno» no es un número de tarea");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("carpeta de otro operador (--operator): se niega", async () => {
      const p = project({ folders: ["gersom", "ana"], ...idle(BACKLOG_RICH), folderContents: { ana: idle(BACKLOG_RICH).contents } });
      const before = snapshot(p.root);
      expect((await exec(["group-eject", "14", "--operator", "ana", "--apply"], p)).err).toContain("«ana» no es la tuya");
      expect(snapshot(p.root)).toEqual(before);
    });
  });
});
