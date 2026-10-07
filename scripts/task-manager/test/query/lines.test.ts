import { describe, expect, test } from "bun:test";
import { lineAt, trimRange } from "../../src/query/lines.ts";

const TEXT = ["uno", "", "### Tarea 1", "cuerpo", "", "", "### Tarea 2", "fin", ""].join("\n");

describe("lineAt", () => {
  test("línea 1-based de un offset", () => {
    expect(lineAt(TEXT, 0)).toBe(1);
    expect(lineAt(TEXT, TEXT.indexOf("###"))).toBe(3);
    expect(lineAt(TEXT, TEXT.indexOf("fin"))).toBe(8);
  });
});

describe("trimRange", () => {
  test("quita las líneas en blanco de los extremos y recalcula las líneas", () => {
    // Del primer salto de línea hasta el inicio de «### Tarea 2»: arrastra la línea en blanco previa y las finales.
    const start = TEXT.indexOf("\n") + 1;
    const end = TEXT.indexOf("### Tarea 2");
    const trimmed = trimRange(TEXT, { startLine: 2, endLine: 6, start, end });
    expect(TEXT.slice(trimmed.start, trimmed.end)).toBe("### Tarea 1\ncuerpo");
    expect(trimmed.startLine).toBe(3);
    expect(trimmed.endLine).toBe(4);
  });

  test("conserva la sangría de la primera línea con contenido", () => {
    const text = "\n  - sangrado\n";
    const trimmed = trimRange(text, { startLine: 1, endLine: 2, start: 0, end: text.length });
    expect(text.slice(trimmed.start, trimmed.end)).toBe("  - sangrado");
  });

  test("un rango de solo espacios queda vacío", () => {
    const trimmed = trimRange("a\n\n\nb", { startLine: 2, endLine: 3, start: 2, end: 4 });
    expect(trimmed.end).toBe(trimmed.start);
    expect(trimmed.endLine).toBe(trimmed.startLine - 1);
  });
});
