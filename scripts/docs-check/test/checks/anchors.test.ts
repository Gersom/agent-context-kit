import { describe, expect, test } from "bun:test";
import { checkAnchors } from "../../src/checks/anchors.ts";
import { ANCHOR, BACKLOG, HANDOFF, HANDOFF_IDLE, lineOf, TEAM_BACKLOG } from "../fixtures.ts";
import { brief, makeCtx, PATHS, withCode } from "../helpers.ts";

const HANDOFF_FILE = `${PATHS.flat}/handoff.md`;
const BACKLOG_FILE = `${PATHS.flat}/backlog.md`;

/** Quita las líneas de ancla (todas, o solo las de `ids`) del texto. */
function withoutAnchors(text: string, ids?: string[]): string {
  return text
    .split("\n")
    .filter((line) => !(ids ?? ["in-progress", "paused", "free", "blocked", "grouped"]).some((id) => line === ANCHOR(id)))
    .join("\n");
}

describe("anchors: documentos válidos", () => {
  test("con todas las anclas en su lugar: sin hallazgos", () => {
    expect(checkAnchors(makeCtx())).toEqual([]);
    expect(checkAnchors(makeCtx({ mode: "multi" }))).toEqual([]);
  });

  test("líneas en blanco entre el ancla y su header: permitido", () => {
    const handoff = HANDOFF.replace(`${ANCHOR("paused")}\n`, `${ANCHOR("paused")}\n\n\n`);
    expect(checkAnchors(makeCtx({ handoff }))).toEqual([]);
  });

  test("un ancla dentro de un bloque de código o de un comentario no cuenta", () => {
    const example = `\n\`\`\`\n${ANCHOR("free")}\nTexto\n\`\`\`\n\n<!--\n${ANCHOR("paused")}\nTexto\n-->\n`;
    const handoff = HANDOFF.replace("### Próximo paso concreto", `${example}\n### Próximo paso concreto`);
    expect(checkAnchors(makeCtx({ handoff }))).toEqual([]);
  });
});

describe("anchor-missing", () => {
  test("falta el ancla de «paused» en handoff.md: error sobre el archivo", () => {
    const handoff = withoutAnchors(HANDOFF, ["paused"]);
    const findings = withCode(checkAnchors(makeCtx({ handoff })), "anchor-missing");
    expect(findings.map(brief)).toEqual([{ severity: "error", code: "anchor-missing", file: HANDOFF_FILE, line: null }]);
    expect(findings[0].message).toContain("«paused»");
    expect(findings[0].message).toContain(ANCHOR("paused"));
  });

  test("falta la sección «grouped» de backlog.md", () => {
    const backlog = BACKLOG.slice(0, BACKLOG.indexOf(ANCHOR("grouped")));
    const findings = checkAnchors(makeCtx({ backlog }));
    expect(findings.map(brief)).toEqual([{ severity: "error", code: "anchor-missing", file: BACKLOG_FILE, line: null }]);
    expect(findings[0].message).toContain("«grouped»");
  });

  test("falta el ancla de «blocked» en team-backlog.md", () => {
    const teamBacklog = withoutAnchors(TEAM_BACKLOG, ["blocked"]);
    const findings = withCode(checkAnchors(makeCtx({ mode: "multi", teamBacklog })), "anchor-missing");
    expect(findings.map(brief)).toEqual([{ severity: "error", code: "anchor-missing", file: PATHS.teamBacklog, line: null }]);
    expect(findings[0].message).toContain("«blocked»");
  });

  test("faltan varias: un error por sección", () => {
    const backlog = withoutAnchors(BACKLOG, ["blocked", "grouped"]);
    const findings = withCode(checkAnchors(makeCtx({ backlog })), "anchor-missing");
    expect(findings.map((f) => f.message.match(/«(\w+)»/)?.[1])).toEqual(["blocked", "grouped"]);
  });

  test("un archivo que no existe no se revisa", () => {
    expect(checkAnchors(makeCtx({ handoff: null }))).toEqual([]);
  });
});

describe("anchor-fallback", () => {
  test("sin ninguna ancla, el plan B ubica las secciones por orden: aviso en el header de cada una", () => {
    const handoff = withoutAnchors(HANDOFF);
    const findings = checkAnchors(makeCtx({ handoff }));
    expect(findings.map(brief)).toEqual([
      { severity: "warning", code: "anchor-fallback", file: HANDOFF_FILE, line: lineOf(handoff, "## Tarea en progreso") },
      { severity: "warning", code: "anchor-fallback", file: HANDOFF_FILE, line: lineOf(handoff, "## Tareas pausadas") },
    ]);
    expect(findings[0].message).toContain("«in-progress»");
    expect(findings[0].message).toContain("«Tarea en progreso»");
    expect(findings[0].message).toContain(ANCHOR("in-progress"));
  });

  test("backlog sin anclas: un aviso por sección", () => {
    const backlog = withoutAnchors(BACKLOG);
    const findings = checkAnchors(makeCtx({ backlog }));
    expect(findings.map((f) => f.code)).toEqual(["anchor-fallback", "anchor-fallback", "anchor-fallback"]);
    expect(findings.map((f) => f.line)).toEqual([
      lineOf(backlog, "## Tareas libres"),
      lineOf(backlog, "## Tareas bloqueadas / pospuestas"),
      lineOf(backlog, "## Tareas agrupadas"),
    ]);
  });

  test("team-backlog sin anclas", () => {
    const teamBacklog = withoutAnchors(TEAM_BACKLOG);
    const findings = checkAnchors(makeCtx({ mode: "multi", teamBacklog }));
    expect(findings.map(brief)).toEqual([
      { severity: "warning", code: "anchor-fallback", file: PATHS.teamBacklog, line: lineOf(teamBacklog, "## Tareas libres") },
      { severity: "warning", code: "anchor-fallback", file: PATHS.teamBacklog, line: lineOf(teamBacklog, "## Tareas bloqueadas / pospuestas") },
    ]);
  });
});

describe("anchor-duplicate", () => {
  test("un ancla repetida: aviso en la segunda, que dice dónde está la primera", () => {
    // El ancla de «grouped» pasa a ser un segundo «free».
    const backlog = BACKLOG.replace(ANCHOR("grouped"), ANCHOR("free"));
    const findings = withCode(checkAnchors(makeCtx({ backlog })), "anchor-duplicate");
    expect(findings.map(brief)).toEqual([
      { severity: "warning", code: "anchor-duplicate", file: BACKLOG_FILE, line: backlog.split("\n").lastIndexOf(ANCHOR("free")) + 1 },
    ]);
    expect(findings[0].message).toContain("«free»");
    expect(findings[0].message).toContain(`línea ${lineOf(backlog, ANCHOR("free"))}`);
  });

  test("el ancla repetida deja la sección que le tocaba sin ancla (anchor-missing)", () => {
    const backlog = BACKLOG.replace(ANCHOR("grouped"), ANCHOR("free"));
    const missing = withCode(checkAnchors(makeCtx({ backlog })), "anchor-missing");
    expect(missing.map((f) => f.message.match(/«(\w+)»/)?.[1])).toEqual(["grouped"]);
  });
});

describe("anchor-position", () => {
  test("texto entre el ancla y el header: aviso en la línea del ancla", () => {
    const handoff = HANDOFF.replace(`${ANCHOR("paused")}\n`, `${ANCHOR("paused")}\nUn párrafo suelto.\n`);
    const findings = withCode(checkAnchors(makeCtx({ handoff })), "anchor-position");
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "anchor-position", file: HANDOFF_FILE, line: lineOf(handoff, ANCHOR("paused")) }]);
    expect(findings[0].message).toContain("«paused»");
    expect(findings[0].message).toContain(`después viene la línea ${lineOf(handoff, ANCHOR("paused")) + 1}`);
  });

  test("ancla seguida de un header que no es `## `", () => {
    const handoff = HANDOFF_IDLE.replace("## Tareas pausadas", "### Tareas pausadas");
    const findings = withCode(checkAnchors(makeCtx({ handoff })), "anchor-position");
    expect(findings.map((f) => f.line)).toEqual([lineOf(handoff, ANCHOR("paused"))]);
  });

  test("ancla al final del archivo, sin nada después: aviso sin «después viene»", () => {
    const handoff = `${HANDOFF_IDLE}\n${ANCHOR("extra")}\n`;
    const findings = withCode(checkAnchors(makeCtx({ handoff })), "anchor-position");
    expect(findings.map((f) => f.line)).toEqual([lineOf(handoff, ANCHOR("extra"))]);
    expect(findings[0].message).not.toContain("después viene");
  });

  test("ancla seguida de un bloque de código: aviso", () => {
    const handoff = HANDOFF_IDLE.replace(`${ANCHOR("paused")}\n`, `${ANCHOR("paused")}\n\`\`\`\n## Tareas pausadas\n\`\`\`\n`);
    const findings = withCode(checkAnchors(makeCtx({ handoff })), "anchor-position");
    expect(findings).toHaveLength(1);
  });
});
