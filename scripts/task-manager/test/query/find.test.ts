import { afterAll, describe, expect, test } from "bun:test";
import { CliError } from "../../src/cli/errors.ts";
import { describeKnownNumbers, findTask, findTeamTasks, locationText, parseTarget, readOperatorDocs } from "../../src/query/find.ts";
import { resolveWorkspace } from "../../src/workspace/workspace.ts";
import { BACKLOG_RICH, HANDOFF_CURRENT, HANDOFF_EMPTY, HISTORY_RICH, TEAM_RICH } from "../fixtures.ts";
import { loadDocs, makeProject, type Project } from "../helpers.ts";

const projects: Project[] = [];
function project(options: Parameters<typeof makeProject>[0]): Project {
  const p = makeProject(options);
  projects.push(p);
  return p;
}
afterAll(() => projects.forEach((p) => p.cleanup()));

const RICH = { contents: { "handoff.md": HANDOFF_CURRENT, "backlog.md": BACKLOG_RICH, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH };
const p = project({ folders: ["gersom"], ...RICH });
const docs = loadDocs(p, "gersom", true);

describe("findTask: cada lugar", () => {
  test("en curso: la sección completa (tarea, plan y subsecciones), sin el header ni las líneas en blanco", () => {
    const [found, ...rest] = findTask(docs, 12);
    expect(rest).toEqual([]);
    expect(found).toMatchObject({ place: "in-progress", number: 12, title: "Implementar el parser", group: null, outcome: null });
    const text = locationText(found);
    expect(text.startsWith("Tarea 12 — Implementar el parser")).toBe(true);
    expect(text).toContain("### Plan");
    expect(text).toContain("Segunda línea del paso.");
    expect(text).not.toContain("Tareas pausadas");
    expect(text.endsWith("\n")).toBe(false);
  });

  test("pausada: su bloque", () => {
    const [found] = findTask(docs, 8);
    expect(found.place).toBe("paused");
    expect(locationText(found).startsWith("### Tarea 8 — Migrar la documentación vieja")).toBe(true);
    expect(locationText(found)).not.toContain("Tarea 9");
  });

  test("libre, bloqueada y agrupada (con su grupo)", () => {
    const [free] = findTask(docs, 1);
    const [blocked] = findTask(docs, 6);
    const [grouped] = findTask(docs, 14);
    expect([free.place, blocked.place, grouped.place]).toEqual(["free", "blocked", "grouped"]);
    expect(grouped.group).toBe("Documentar los planes");
    expect(locationText(free)).toContain("CUERPO-1");
    expect(locationText(free)).not.toContain("Tarea 3");
    expect(locationText(grouped)).toContain("CUERPO-14");
    expect(locationText(grouped)).not.toContain("Tarea 15");
  });

  test("history: la entrada con su resultado, sin las demás", () => {
    const [done] = findTask(docs, 11);
    const [discarded] = findTask(docs, 10);
    expect([done.place, done.outcome, discarded.outcome]).toEqual(["history", "done", "discarded"]);
    expect(locationText(done)).toContain("CUERPO-HISTORY-11");
    expect(locationText(done)).not.toContain("CUERPO-HISTORY-10");
    expect(locationText(done).length).toBeLessThan(docs.history.text.length / 2);
  });

  test("las líneas de cada hallazgo coinciden con su texto", () => {
    for (const n of [12, 8, 1, 6, 14, 11]) {
      const [found] = findTask(docs, n);
      const lines = found.doc.text.split("\n");
      expect(lines.slice(found.range.startLine - 1, found.range.endLine).join("\n")).toBe(locationText(found));
    }
  });

  test("número inexistente: lista vacía", () => {
    expect(findTask(docs, 99)).toEqual([]);
  });

  test("una tarea en más de un lugar: devuelve todos, en orden en curso → history", () => {
    const backlog = BACKLOG_RICH.replace("### Tarea 18 — Revisar los links", "### Tarea 11 — Duplicada\n\n- **Descripción:** CUERPO-DUP\n\n### Tarea 18 — Revisar los links");
    const dup = project({ folders: ["gersom"], contents: { ...RICH.contents, "backlog.md": backlog } });
    const found = findTask(loadDocs(dup, "gersom"), 11);
    expect(found.map((f) => f.place)).toEqual(["free", "history"]);
    expect(locationText(found[0])).toContain("CUERPO-DUP");
  });

  test("sin backlog ni history: solo busca en el handoff", () => {
    const min = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_CURRENT }, omit: ["backlog.md", "history.md"] });
    const minDocs = loadDocs(min, "gersom");
    expect(findTask(minDocs, 12)).toHaveLength(1);
    expect(findTask(minDocs, 1)).toEqual([]);
  });
});

describe("findTeamTasks", () => {
  test("título exacto, sin distinguir mayúsculas ni acentos", () => {
    const found = findTeamTasks(docs, "revisar el COPY del onboarding");
    expect(found.map((f) => [f.place, f.title])).toEqual([["team-free", "Revisar el copy del onboarding"]]);
    expect(locationText(found[0])).toContain("CUERPO-TEAM-1");
    expect(locationText(found[0])).not.toContain("CUERPO-TEAM-2");
  });

  test("parte del título; también en las bloqueadas", () => {
    expect(findTeamTasks(docs, "migrar")[0].title).toBe("Migrar el CI");
    expect(findTeamTasks(docs, "proveedor")[0].place).toBe("team-blocked");
    expect(findTeamTasks(docs, "ONBOARDING")).toHaveLength(1);
  });

  test("una parte que coincide con varias devuelve todas; el título exacto gana", () => {
    expect(findTeamTasks(docs, "el").map((f) => f.title)).toEqual(["Revisar el copy del onboarding", "Migrar el CI"]);
    expect(findTeamTasks(docs, "migrar el ci")).toHaveLength(1);
  });

  test("sin coincidencia, consulta vacía o sin team-backlog: vacío", () => {
    expect(findTeamTasks(docs, "nada de esto")).toEqual([]);
    expect(findTeamTasks(docs, "  ")).toEqual([]);
    expect(findTeamTasks(loadDocs(p, "gersom"), "migrar")).toEqual([]);
  });
});

describe("parseTarget", () => {
  test("número, T-N y T-N@operador", () => {
    expect(parseTarget("24")).toEqual({ kind: "number", number: 24, operator: null });
    expect(parseTarget("T-24")).toEqual({ kind: "number", number: 24, operator: null });
    expect(parseTarget("t-9@Ana")).toEqual({ kind: "number", number: 9, operator: "Ana" });
    expect(parseTarget("9@ana")).toEqual({ kind: "number", number: 9, operator: "ana" });
  });

  test("cualquier otro texto es un título", () => {
    expect(parseTarget(" Migrar el CI ")).toEqual({ kind: "title", query: "Migrar el CI" });
    expect(parseTarget("2024 plan")).toEqual({ kind: "title", query: "2024 plan" });
  });
});

describe("describeKnownNumbers", () => {
  test("rango, total y próximo número", () => {
    expect(describeKnownNumbers(docs)).toBe("Números conocidos: 1 a 18 (15 tareas). «Próximo número de tarea»: 20.");
  });

  test("sin tareas numeradas", () => {
    const empty = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_EMPTY }, omit: ["backlog.md", "history.md"] });
    expect(describeKnownNumbers(loadDocs(empty, "gersom"))).toBe("No hay tareas numeradas.");
  });
});

describe("readOperatorDocs", () => {
  const multi = project({
    folders: ["gersom", "ana"],
    folderContents: { ana: { "history.md": "# History\n\n## 2026-10-01 — ✅ Tarea 77 — De Ana\n\n- CUERPO-ANA\n" } },
  });
  const ws = () => resolveWorkspace({ agents: multi.root, email: "gersom@mail.com" });

  test("lee la carpeta de otro operador por operators.md (sin distinguir mayúsculas)", () => {
    const { folder, docs: other } = readOperatorDocs(ws(), "ANA");
    expect(folder).toBe("ana");
    expect(findTask(other, 77)[0].place).toBe("history");
    expect(other.teamBacklog).toBeNull();
  });

  test("operador desconocido, «solo team-backlog» y repo plano: errores claros", () => {
    expect(() => readOperatorDocs(ws(), "nadie")).toThrow(/«nadie» no figura en operators\.md.*Operadores con carpeta: gersom, ana, fantasma/);
    expect(() => readOperatorDocs(ws(), "luis")).toThrow(/solo team-backlog/);
    expect(() => readOperatorDocs(ws(), "fantasma")).toThrow(CliError);
    const flat = project({ flat: true });
    expect(() => readOperatorDocs(resolveWorkspace({ agents: flat.root, email: null }), "ana")).toThrow(/repo es plano/);
  });
});
