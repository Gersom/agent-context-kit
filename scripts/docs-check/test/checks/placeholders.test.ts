import { describe, expect, test } from "bun:test";
import { checkPlaceholders } from "../../src/checks/placeholders.ts";
import {
  BACKLOG,
  HANDOFF,
  HISTORY,
  lineOf,
  TEAM_BACKLOG,
  TEMPLATE_BACKLOG,
  TEMPLATE_HANDOFF,
  TEMPLATE_HISTORY,
  TEMPLATE_TEAM_BACKLOG,
} from "../fixtures.ts";
import { brief, makeCtx, PATHS } from "../helpers.ts";

describe("placeholder", () => {
  test("documentos completos: sin hallazgos", () => {
    expect(checkPlaceholders(makeCtx())).toEqual([]);
    expect(checkPlaceholders(makeCtx({ mode: "multi" }))).toEqual([]);
  });

  test("un placeholder en handoff.md: aviso con su línea", () => {
    const handoff = HANDOFF.replace("El paso 2 y el cierre.", "[Placeholder]");
    const findings = checkPlaceholders(makeCtx({ handoff }));
    expect(findings.map(brief)).toEqual([
      { severity: "warning", code: "placeholder", file: `${PATHS.flat}/handoff.md`, line: lineOf(handoff, "[Placeholder]") },
    ]);
    expect(findings[0].message).toContain("[Placeholder ...]");
  });

  test("placeholders en backlog.md, history.md y team-backlog.md", () => {
    const backlog = BACKLOG.replace("exportar el estado a JSON.", "[Placeholder]");
    const history = HISTORY.replace("- Commit: abc1234.", "- [Placeholder — qué se hizo]");
    const teamBacklog = TEAM_BACKLOG.replace("ajustar los textos.", "[Placeholder]");
    const findings = checkPlaceholders(makeCtx({ mode: "multi", backlog, history, teamBacklog }));
    expect(findings.map(brief)).toEqual([
      { severity: "warning", code: "placeholder", file: `${PATHS.multi}/backlog.md`, line: lineOf(backlog, "[Placeholder]") },
      { severity: "warning", code: "placeholder", file: `${PATHS.multi}/history.md`, line: lineOf(history, "[Placeholder") },
      { severity: "warning", code: "placeholder", file: PATHS.teamBacklog, line: lineOf(teamBacklog, "[Placeholder]") },
    ]);
  });

  test("varios en el mismo archivo: uno por línea", () => {
    const handoff = HANDOFF.replace("El paso 2 y el cierre.", "[Placeholder uno]").replace("Ninguna.", "[Placeholder dos]");
    expect(checkPlaceholders(makeCtx({ handoff })).map((f) => f.line)).toEqual([
      lineOf(handoff, "[Placeholder uno]"),
      lineOf(handoff, "[Placeholder dos]"),
    ]);
  });

  test("un placeholder dentro de un comentario HTML (una línea o varias) no cuenta", () => {
    const handoff = HANDOFF.replace(
      "El paso 2 y el cierre.",
      "<!-- Poner aquí [Placeholder] -->\n<!--\nrelleno [Placeholder]\n[Placeholder]\n-->\nEl paso 2 y el cierre.",
    );
    expect(checkPlaceholders(makeCtx({ handoff }))).toEqual([]);
  });

  test("un placeholder dentro de un bloque de código (``` o ~~~) no cuenta", () => {
    const handoff = HANDOFF.replace(
      "El paso 2 y el cierre.",
      "```\n[Placeholder]\n```\n\n~~~md\n[Placeholder]\n~~~\n\nEl paso 2 y el cierre.",
    );
    expect(checkPlaceholders(makeCtx({ handoff }))).toEqual([]);
  });

  test("un placeholder fuera del comentario en la misma línea sí cuenta", () => {
    const handoff = HANDOFF.replace("El paso 2 y el cierre.", "<!-- nota --> [Placeholder]");
    expect(checkPlaceholders(makeCtx({ handoff })).map((f) => f.line)).toEqual([lineOf(handoff, "[Placeholder]")]);
  });

  test("un archivo ausente no se revisa", () => {
    expect(checkPlaceholders(makeCtx({ handoff: null, backlog: null, history: null }))).toEqual([]);
  });

  test("las plantillas sin completar avisan en cada archivo, con la línea del primer placeholder", () => {
    const ctx = makeCtx({ mode: "multi", handoff: TEMPLATE_HANDOFF, backlog: TEMPLATE_BACKLOG, history: TEMPLATE_HISTORY, teamBacklog: TEMPLATE_TEAM_BACKLOG });
    const findings = checkPlaceholders(ctx);
    const first = (file: string) => findings.find((f) => f.file.endsWith(file))?.line;
    expect(first("handoff.md")).toBe(lineOf(TEMPLATE_HANDOFF, "**Tarea:** [Placeholder"));
    expect(first("backlog.md")).toBe(lineOf(TEMPLATE_BACKLOG, "### Tarea [N] — [Placeholder"));
    expect(first("history.md")).toBe(lineOf(TEMPLATE_HISTORY, "## [Placeholder fecha]"));
    expect(first("team-backlog.md")).toBe(lineOf(TEMPLATE_TEAM_BACKLOG, "### [Placeholder"));
    expect(findings.every((f) => f.severity === "warning" && f.code === "placeholder")).toBe(true);
  });
});
