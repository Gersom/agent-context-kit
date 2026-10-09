import { describe, expect, test } from "bun:test";
import { checkHistoryEntries } from "../../src/checks/history.ts";
import { HISTORY, HISTORY_EMPTY, HISTORY_ENTRIES, lineOf, TEMPLATE_HISTORY } from "../fixtures.ts";
import { brief, makeCtx, PATHS } from "../helpers.ts";

const FILE = `${PATHS.flat}/history.md`;

describe("history-entry", () => {
  test("entradas con ✅ o ❌, con y sin número: sin hallazgos", () => {
    expect(checkHistoryEntries(makeCtx())).toEqual([]);
  });

  test("history.md sin entradas: sin hallazgos", () => {
    expect(checkHistoryEntries(makeCtx({ history: HISTORY_EMPTY }))).toEqual([]);
  });

  test("un header sin ✅ ni ❌ después del `---`: aviso en su línea", () => {
    const history = HISTORY.replace("## 2026-10-02 — ❌ Tarea 2 — Soportar YAML", "## 2026-10-02 — Tarea 2 — Soportar YAML");
    const findings = checkHistoryEntries(makeCtx({ history }));
    expect(findings.map(brief)).toEqual([
      { severity: "warning", code: "history-entry", file: FILE, line: lineOf(history, "## 2026-10-02 — Tarea 2") },
    ]);
    expect(findings[0].message).toContain("✅");
    expect(findings[0].message).toContain("❌");
  });

  test("varias entradas mal escritas: un aviso por cada una", () => {
    const history = `${HISTORY_EMPTY}## 2026-10-04 — Hecho algo\n\n- x\n\n## Otro encabezado\n\n- y\n\n${HISTORY_ENTRIES}`;
    const findings = checkHistoryEntries(makeCtx({ history }));
    expect(findings.map((f) => f.line)).toEqual([lineOf(history, "## 2026-10-04"), lineOf(history, "## Otro encabezado")]);
  });

  test("los headers de antes del `---` (la introducción) no se revisan", () => {
    const history = HISTORY.replace("# History\n", "# History\n\n## Una nota de la introducción\n");
    expect(checkHistoryEntries(makeCtx({ history }))).toEqual([]);
  });

  test("un header dentro de un comentario HTML o de un bloque de código no se revisa", () => {
    const history = `${HISTORY_EMPTY}<!--\n## Ejemplo sin marca\n-->\n\n\`\`\`\n## Otro ejemplo sin marca\n\`\`\`\n\n${HISTORY_ENTRIES}`;
    expect(checkHistoryEntries(makeCtx({ history }))).toEqual([]);
  });

  test("un header `###` no es una entrada", () => {
    const history = `${HISTORY}\n### Detalle sin marca\n`;
    expect(checkHistoryEntries(makeCtx({ history }))).toEqual([]);
  });

  test("el placeholder de la plantilla no avisa aquí (lo hace el check de placeholders)", () => {
    expect(checkHistoryEntries(makeCtx({ history: TEMPLATE_HISTORY }))).toEqual([]);
  });

  test("history.md ausente: sin hallazgos", () => {
    expect(checkHistoryEntries(makeCtx({ history: null }))).toEqual([]);
  });
});
