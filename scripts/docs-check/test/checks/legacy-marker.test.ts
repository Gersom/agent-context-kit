import { describe, expect, test } from "bun:test";
import { checkLegacyMarkers } from "../../src/checks/legacy-marker.ts";
import { checkRootFiles } from "../../src/checks/files.ts";
import { BACKLOG, HANDOFF, OPERATORS, RULES, TEAM_BACKLOG } from "../fixtures.ts";
import { brief, makeCtx, PATHS } from "../helpers.ts";

const old = (text: string): string => text.replaceAll("agent-context-skill:", "agent-context-kit:");

describe("legacy-marker", () => {
  test("los archivos con el prefijo vigente: sin hallazgos", () => {
    expect(checkLegacyMarkers(makeCtx())).toEqual([]);
  });

  test("anclas con el prefijo anterior: aviso por archivo, en la primera línea, y las anclas siguen valiendo", () => {
    const ctx = makeCtx({ handoff: old(HANDOFF), backlog: old(BACKLOG) });
    const findings = checkLegacyMarkers(ctx);
    expect(findings.map(brief)).toEqual([
      { severity: "warning", code: "legacy-marker", file: `${PATHS.flat}/handoff.md`, line: expect.any(Number) },
      { severity: "warning", code: "legacy-marker", file: `${PATHS.flat}/backlog.md`, line: expect.any(Number) },
    ]);
    expect(findings[0].message).toContain("agent-context-skill:");
    expect(ctx.docs.handoff.parsed.missing).toEqual([]);
    expect(ctx.docs.backlog.parsed.missing).toEqual([]);
  });

  test("marcador de versión con el prefijo anterior: aviso en la línea 1", () => {
    const ctx = makeCtx({ rules: old(RULES) });
    expect(checkLegacyMarkers(ctx).map(brief)).toEqual([{ severity: "warning", code: "legacy-marker", file: `${PATHS.flat}/rules.md`, line: 1 }]);
  });

  test("bloque de AGENTS.md con el prefijo anterior: aviso, y el check de la raíz no pide el bloque", () => {
    const ctx = makeCtx({ agentsMd: "<!-- agent-docs-skill:start -->\nLee docs/agents.\n<!-- agent-docs-skill:end -->\n", claudeMd: "Ver AGENTS.md\n" });
    expect(checkRootFiles(ctx)).toEqual([]);
    expect(checkLegacyMarkers(ctx).map(brief)).toEqual([{ severity: "warning", code: "legacy-marker", file: "AGENTS.md", line: 1 }]);
  });

  test("operators.md y team-backlog.md en multi con el prefijo anterior: aviso en cada uno", () => {
    const ctx = makeCtx({ teamBacklog: old(TEAM_BACKLOG), operators: old(OPERATORS) });
    expect(checkLegacyMarkers(ctx).map((f) => f.file)).toEqual([PATHS.teamBacklog, PATHS.operators]);
    expect(checkLegacyMarkers(makeCtx({ teamBacklog: TEAM_BACKLOG, operators: OPERATORS }))).toEqual([]);
  });
});
