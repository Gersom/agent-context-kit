import { describe, expect, test } from "bun:test";
import { stripComments } from "../../parse/markdown.ts";
import { BodyPos, LineIndex, normalizeEol, toEol } from "../../parse/positions.ts";

describe("LineIndex", () => {
  const index = new LineIndex("ab\ncd\n\nef");

  test("lineOf: línea 1-based de un offset; el fin del texto cae en la última línea", () => {
    expect([0, 1, 2, 3, 5, 6, 7, 9].map((o) => index.lineOf(o))).toEqual([1, 1, 1, 2, 2, 3, 4, 4]);
  });

  test("lineStart: offset de inicio de la línea; pasada la última, el fin del texto", () => {
    expect([1, 2, 3, 4, 5].map((l) => index.lineStart(l))).toEqual([0, 3, 6, 7, 9]);
  });

  test("range: líneas inclusivas; vacío → endLine = startLine - 1", () => {
    expect(index.range(3, 6)).toEqual({ startLine: 2, endLine: 2, start: 3, end: 6 });
    expect(index.range(0, 7)).toEqual({ startLine: 1, endLine: 3, start: 0, end: 7 });
    expect(index.range(3, 3)).toEqual({ startLine: 2, endLine: 1, start: 3, end: 3 });
  });

  test("texto vacío: una sola línea vacía", () => {
    const empty = new LineIndex("");
    expect(empty.lineOf(0)).toBe(1);
    expect(empty.lineStart(1)).toBe(0);
    expect(empty.lineStart(2)).toBe(0);
    expect(empty.range(0, 0)).toEqual({ startLine: 1, endLine: 0, start: 0, end: 0 });
  });
});

describe("BodyPos", () => {
  // Original con un comentario inline, uno multilínea y uno al final de la línea.
  const raw = "uno <!-- a --> dos\n<!--\nmultilínea\n-->tres\ncuatro <!-- fin -->\ncinco";
  const base = 100; // el cuerpo no empieza en el offset 0 del archivo
  const index = new LineIndex("x".repeat(base - 1) + "\n" + raw);
  const pos = new BodyPos(raw, base, index);

  test("el texto es exactamente el de stripComments", () => {
    expect(pos.text).toBe(stripComments(raw));
    expect(pos.text).toBe("uno  dos\ntres\ncuatro \ncinco");
  });

  test("start: traduce offsets del texto sin comentarios al original", () => {
    const at = (word: string) => pos.start(pos.text.indexOf(word));
    expect(raw.slice(at("uno") - base)).toStartWith("uno");
    expect(raw.slice(at("dos") - base)).toStartWith("dos");
    expect(raw.slice(at("tres") - base)).toStartWith("tres");
    expect(raw.slice(at("cinco") - base)).toStartWith("cinco");
  });

  test("lineRange: una línea sin salto, hasta el último carácter visible", () => {
    const cuatro = pos.lineRange(2); // el comentario al final de la línea queda fuera
    expect(raw.slice(cuatro.start - base, cuatro.end - base)).toBe("cuatro ");
    expect(cuatro.startLine).toBe(cuatro.endLine);
    const uno = pos.lineRange(0); // el comentario del medio queda dentro
    expect(raw.slice(uno.start - base, uno.end - base)).toBe("uno <!-- a --> dos");
  });

  test("contentLines: hasta el salto de línea final de la última línea", () => {
    const r = pos.contentLines(1, 3); // "tres" empieza después de un comentario multilínea
    expect(raw.slice(r.start - base, r.end - base)).toBe("tres\ncuatro <!-- fin -->\n");
  });

  test("blockLines: hasta el inicio de la línea siguiente o el límite del cuerpo", () => {
    const first = pos.blockLines(0, 2);
    expect(raw.slice(first.start - base, first.end - base)).toBe("uno <!-- a --> dos\n<!--\nmultilínea\n-->tres\n");
    expect(pos.blockLines(2, pos.lines.length).end).toBe(base + raw.length);
  });

  test("charRange: un carácter del texto sin comentarios", () => {
    const o = pos.text.indexOf("dos");
    expect(raw.slice(pos.charRange(o).start - base, pos.charRange(o).end - base)).toBe("d");
  });

  test("cuerpo vacío", () => {
    const empty = new BodyPos("", 5, new LineIndex("12345"));
    expect(empty.text).toBe("");
    expect(empty.lines).toEqual([""]);
    expect(empty.lineRange(0)).toMatchObject({ start: 5, end: 5 });
    expect(empty.blockLines(0, 1)).toMatchObject({ start: 5, end: 5 });
  });

  test("un comentario sin cerrar se descarta hasta el final", () => {
    const open = new BodyPos("a\n<!-- sin cerrar\nb", 0, new LineIndex("a\n<!-- sin cerrar\nb"));
    expect(open.text).toBe("a\n");
    expect(open.lines).toEqual(["a", ""]);
  });
});

describe("normalizeEol", () => {
  const raw = "# T\r\n\r\n- uno\r\n- dos\r\n";

  test("CRLF → LF, con el final de línea predominante", () => {
    const info = normalizeEol(raw);
    expect(info.text).toBe("# T\n\n- uno\n- dos\n");
    expect(info.eol).toBe("\r\n");
  });

  test("LF puro: el texto no cambia y toRaw es la identidad", () => {
    const info = normalizeEol("a\nb\n");
    expect(info.text).toBe("a\nb\n");
    expect(info.eol).toBe("\n");
    expect([0, 1, 2, 4].map(info.toRaw)).toEqual([0, 1, 2, 4]);
  });

  test("toRaw: un offset al inicio de línea queda después del CRLF; uno sobre el `\n` queda en su `\r`", () => {
    const info = normalizeEol(raw);
    const lineStart = info.text.indexOf("- uno");
    expect(raw.slice(info.toRaw(lineStart))).toStartWith("- uno");
    const newline = info.text.indexOf("\n"); // el `\n` de "# T"
    expect(raw.slice(info.toRaw(newline))).toStartWith("\r\n");
  });

  test("reemplazar una línea con rawSpan no altera los finales de línea", () => {
    const info = normalizeEol(raw);
    const start = info.text.indexOf("- uno");
    const [s, e] = info.rawSpan({ startLine: 3, endLine: 3, start, end: start + "- uno".length });
    expect(raw.slice(0, s) + "- UNO" + raw.slice(e)).toBe("# T\r\n\r\n- UNO\r\n- dos\r\n");
  });

  test("insertar con toEol usa el final de línea del archivo", () => {
    const info = normalizeEol(raw);
    const at = info.toRaw(info.text.length);
    expect(raw.slice(0, at) + toEol("- tres\n", info.eol)).toBe(raw + "- tres\r\n");
    expect(toEol("a\r\nb\nc\rd", "\n")).toBe("a\nb\nc\nd");
  });

  test("finales mezclados: lo no reemplazado queda byte a byte; lo insertado usa el predominante", () => {
    const mixed = "a\r\nb\nc\r\nd\r\n";
    const info = normalizeEol(mixed);
    expect(info.text).toBe("a\nb\nc\nd\n");
    expect(info.eol).toBe("\r\n");
    const start = info.text.indexOf("c");
    const [s, e] = info.rawSpan({ startLine: 3, endLine: 3, start, end: start + 1 });
    expect(mixed.slice(0, s) + "C" + mixed.slice(e)).toBe("a\r\nb\nC\r\nd\r\n");
  });

  test("`\r` suelto se trata como salto de línea (igual que el task-tracker)", () => {
    const info = normalizeEol("a\rb\r\nc");
    expect(info.text).toBe("a\nb\nc");
    expect(info.toRaw(4)).toBe(5);
  });

  test("texto vacío", () => {
    const info = normalizeEol("");
    expect(info.text).toBe("");
    expect(info.eol).toBe("\n");
    expect(info.toRaw(0)).toBe(0);
  });
});
