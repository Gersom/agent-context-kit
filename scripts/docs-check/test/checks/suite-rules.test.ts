import { describe, expect, test } from "bun:test";
import { SUITE_BLOCK } from "../../../_shared/rules-block.ts";
import { runChecks } from "../../src/checks/index.ts";
import { checkSuiteRules } from "../../src/checks/suite-rules.ts";
import { RULES, TEMPLATE_RULES } from "../fixtures.ts";
import { brief, makeCtx, PATHS, withCode } from "../helpers.ts";

describe("suite-rules", () => {
  test("rules.md con el bloque de la suite: sin hallazgos", () => {
    expect(RULES).toContain(SUITE_BLOCK);
    expect(checkSuiteRules(makeCtx())).toEqual([]);
  });

  test("el bloque desactualizado cuenta como presente (eso lo arregla `acsuite init`)", () => {
    const stale = TEMPLATE_RULES.replace("## Al cerrar", "<!-- agent-context-suite:start -->\nviejo\n<!-- agent-context-suite:end -->\n\n## Al cerrar");
    expect(checkSuiteRules(makeCtx({ rules: stale }))).toEqual([]);
  });

  test("rules.md de la plantilla, sin el bloque: aviso sobre el archivo entero", () => {
    const findings = checkSuiteRules(makeCtx({ rules: TEMPLATE_RULES }));
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "suite-rules", file: `${PATHS.flat}/rules.md`, line: null }]);
    expect(findings[0].message).toBe(
      "rules.md no tiene la sección de agent-context-suite: ejecuta `acsuite init` para que el agente sepa usar la suite.",
    );
  });

  test("rules.md vacío o con una sola marca: aviso", () => {
    expect(checkSuiteRules(makeCtx({ rules: "" })).map((f) => f.code)).toEqual(["suite-rules"]);
    expect(checkSuiteRules(makeCtx({ rules: "<!-- agent-context-suite:start -->\n# Reglas\n" })).map((f) => f.code)).toEqual(["suite-rules"]);
  });

  test("rules.md inexistente: no dice nada", () => {
    expect(checkSuiteRules(makeCtx({ rules: null }))).toEqual([]);
    expect(withCode(runChecks(makeCtx({ rules: null })), "suite-rules")).toEqual([]);
  });

  test("con CRLF el bloque se reconoce", () => {
    expect(checkSuiteRules(makeCtx({ rules: RULES.replace(/\n/g, "\r\n") }))).toEqual([]);
  });

  test("runChecks incluye el aviso y no cambia el resto", () => {
    expect(runChecks(makeCtx({ rules: TEMPLATE_RULES })).map((f) => f.code)).toEqual(["suite-rules"]);
  });
});
