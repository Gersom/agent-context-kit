import { describe, expect, test } from "bun:test";
import { runChecks } from "../../src/checks/index.ts";
import { checkSkillVersion, VERSION_MARKER_RE } from "../../src/checks/skill-version.ts";
import { makeRules } from "../../src/context.ts";
import { RULES } from "../fixtures.ts";
import { brief, makeCtx, PATHS, withCode } from "../helpers.ts";

const MARKER = "<!-- agent-context-kit:version 1.9.0 — ignorar al leer, no es contenido. -->";

describe("skill-version", () => {
  test("el rules.md de la plantilla trae el marcador: sin hallazgos", () => {
    expect(RULES.split("\n")[0]).toMatch(VERSION_MARKER_RE);
    expect(checkSkillVersion(makeCtx())).toEqual([]);
  });

  test("marcador en la línea 1, 2 o 3: sin hallazgos", () => {
    expect(checkSkillVersion(makeCtx({ rules: `${MARKER}\n# Reglas\n` }))).toEqual([]);
    expect(checkSkillVersion(makeCtx({ rules: `# Reglas\n${MARKER}\n` }))).toEqual([]);
    expect(checkSkillVersion(makeCtx({ rules: `# Reglas\n\n${MARKER}\n` }))).toEqual([]);
  });

  test("marcador solo con la versión, sin texto después: sin hallazgos", () => {
    expect(checkSkillVersion(makeCtx({ rules: "<!-- agent-context-kit:version 2.10.3-->\n# Reglas\n" }))).toEqual([]);
  });

  test("rules.md sin marcador: aviso sobre el archivo entero", () => {
    const findings = checkSkillVersion(makeCtx({ rules: "# Reglas del proyecto\n\nTexto.\n" }));
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "skill-version", file: `${PATHS.flat}/rules.md`, line: null }]);
    expect(findings[0].message).toContain("Falta el marcador de versión de la skill");
    expect(findings[0].message).toContain("1.9.0");
  });

  test("rules.md vacío: aviso de que falta el marcador", () => {
    const findings = checkSkillVersion(makeCtx({ rules: "" }));
    expect(findings.map((f) => f.code)).toEqual(["skill-version"]);
    expect(findings[0].message).toContain("Falta el marcador");
  });

  test("marcador fuera de las primeras 3 líneas: cuenta como ausente", () => {
    const findings = checkSkillVersion(makeCtx({ rules: `# Reglas\n\nTexto.\n${MARKER}\n` }));
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "skill-version", file: `${PATHS.flat}/rules.md`, line: null }]);
  });

  test("versión mal formada: aviso de formato inválido con la línea", () => {
    for (const bad of ["1.9", "1.9.x", "v1.9.0"]) {
      const findings = checkSkillVersion(makeCtx({ rules: `# Reglas\n<!-- agent-context-kit:version ${bad} -->\n` }));
      expect(findings.map(brief)).toEqual([{ severity: "warning", code: "skill-version", file: `${PATHS.flat}/rules.md`, line: 2 }]);
      expect(findings[0].message).toContain("formato");
    }
  });

  test("comentario sin cerrar: aviso de formato inválido", () => {
    const findings = checkSkillVersion(makeCtx({ rules: "<!-- agent-context-kit:version 1.9.0\n# Reglas\n" }));
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "skill-version", file: `${PATHS.flat}/rules.md`, line: 1 }]);
    expect(findings[0].message).toContain("formato");
  });

  test("rules.md inexistente: no dice nada", () => {
    expect(checkSkillVersion(makeCtx({ rules: null }))).toEqual([]);
    expect(withCode(runChecks(makeCtx({ rules: null })), "skill-version")).toEqual([]);
  });

  test("con CRLF el marcador se reconoce", () => {
    expect(checkSkillVersion(makeCtx({ rules: `${MARKER}\r\n# Reglas\r\n` }))).toEqual([]);
  });

  test("runChecks incluye el aviso y no cambia el resto", () => {
    const findings = runChecks(makeCtx({ rules: "# Reglas\n" }));
    expect(findings.map((f) => f.code)).toEqual(["skill-version"]);
  });

  test("makeRules conserva solo la cabecera", () => {
    const rules = makeRules("docs/agents/rules.md", "a\r\nb\r\nc\r\nd\r\ne\r\n");
    expect(rules).toEqual({ file: "docs/agents/rules.md", exists: true, head: "a\nb\nc" });
    expect(makeRules("docs/agents/rules.md", null)).toEqual({ file: "docs/agents/rules.md", exists: false, head: "" });
  });
});
