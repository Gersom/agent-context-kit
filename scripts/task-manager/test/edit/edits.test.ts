import { describe, expect, test } from "bun:test";
import { normalizeEol } from "../../../_shared/parse/positions.ts";
import { parseHandoff } from "../../../_shared/parse/handoff.ts";
import { CliError } from "../../src/cli/errors.ts";
import { applyEdits, deleteRange, insertAt, replaceRange } from "../../src/edit/edits.ts";

const LF = "uno\ndos\ntres\ncuatro\n";
const CRLF = LF.replace(/\n/g, "\r\n");

/** Aplica sobre el crudo, calculando los offsets en el texto normalizado como hace un comando. */
function apply(raw: string, make: (text: string) => Parameters<typeof applyEdits>[2]): string {
  const eol = normalizeEol(raw);
  return applyEdits(raw, eol, make(eol.text));
}

/** Rango `[start, end)` de la línea n (0-based) incluyendo su salto de línea. */
function line(text: string, n: number): { start: number; end: number } {
  const lines = text.split("\n");
  const start = lines.slice(0, n).reduce((sum, l) => sum + l.length + 1, 0);
  return { start, end: start + lines[n].length + 1 };
}

describe("applyEdits — LF", () => {
  test("reemplaza un rango", () => {
    expect(apply(LF, (t) => [replaceRange(line(t, 1), "DOS\n")])).toBe("uno\nDOS\ntres\ncuatro\n");
  });

  test("inserta en un offset, al inicio y al final", () => {
    expect(apply(LF, (t) => [insertAt(line(t, 2).start, "nueva\n")])).toBe("uno\ndos\nnueva\ntres\ncuatro\n");
    expect(apply(LF, (t) => [insertAt(0, "primera\n")])).toBe("primera\n" + LF);
    expect(apply(LF, (t) => [insertAt(t.length, "última\n")])).toBe(LF + "última\n");
  });

  test("borra un rango", () => {
    expect(apply(LF, (t) => [deleteRange(line(t, 1))])).toBe("uno\ntres\ncuatro\n");
  });

  test("varias ediciones en cualquier orden se aplican sobre el original", () => {
    const edits = (t: string) => [
      deleteRange(line(t, 3)),
      replaceRange(line(t, 0), "UNO\n"),
      insertAt(line(t, 2).start, "entre\n"),
    ];
    expect(apply(LF, edits)).toBe("UNO\ndos\nentre\ntres\n");
    expect(apply(LF, (t) => edits(t).reverse())).toBe("UNO\ndos\nentre\ntres\n");
  });

  test("sin ediciones devuelve el texto igual", () => {
    expect(apply(LF, () => [])).toBe(LF);
  });

  test("reemplazo por el mismo texto o inserción vacía: sin cambio", () => {
    expect(apply(LF, (t) => [replaceRange(line(t, 1), "dos\n"), insertAt(3, "")])).toBe(LF);
  });

  test("edición dentro de una línea (rango de una línea, sin el salto)", () => {
    expect(apply(LF, (t) => [replaceRange({ start: line(t, 1).start, end: line(t, 1).end - 1 }, "DOS")])).toBe("uno\nDOS\ntres\ncuatro\n");
  });
});

describe("applyEdits — solapamiento y validación", () => {
  test("dos reemplazos que se solapan se rechazan", () => {
    expect(() => apply(LF, (t) => [replaceRange({ start: 0, end: 6 }, "x"), replaceRange({ start: 4, end: 10 }, "y")])).toThrow(CliError);
    expect(() => apply(LF, () => [replaceRange({ start: 0, end: 6 }, "x"), replaceRange({ start: 4, end: 10 }, "y")])).toThrow(/solapadas/);
  });

  test("una inserción dentro de un rango reemplazado o borrado se rechaza", () => {
    expect(() => apply(LF, () => [replaceRange({ start: 0, end: 8 }, "x"), insertAt(4, "y")])).toThrow(/solapadas/);
    expect(() => apply(LF, () => [deleteRange({ start: 0, end: 8 }), insertAt(4, "y")])).toThrow(/solapadas/);
  });

  test("borrar un rango dentro de otro ya reemplazado se rechaza", () => {
    expect(() => apply(LF, () => [replaceRange({ start: 0, end: 12 }, ""), deleteRange({ start: 2, end: 4 })])).toThrow(/solapadas/);
  });

  test("ediciones que solo se tocan en un borde NO se solapan", () => {
    // Inserción justo antes y justo después de un reemplazo, y dos reemplazos contiguos.
    const out = apply(LF, () => [
      insertAt(4, "<"),
      replaceRange({ start: 4, end: 8 }, "DOS\n"),
      insertAt(8, ">"),
      replaceRange({ start: 8, end: 13 }, "TRES\n"),
    ]);
    expect(out).toBe("uno\n<DOS\n>TRES\ncuatro\n");
  });

  test("varias inserciones en el mismo offset quedan en el orden en que se pasaron", () => {
    expect(apply(LF, () => [insertAt(4, "a"), insertAt(4, "b"), insertAt(4, "c")])).toBe("uno\nabcdos\ntres\ncuatro\n");
  });

  test("rangos fuera del texto o invertidos se rechazan", () => {
    expect(() => apply(LF, () => [replaceRange({ start: 0, end: LF.length + 1 }, "")])).toThrow(/no cabe/);
    expect(() => apply(LF, () => [insertAt(-1, "x")])).toThrow(/no cabe/);
    expect(() => apply(LF, () => [replaceRange({ start: 5, end: 2 }, "")])).toThrow(/no cabe/);
    expect(() => apply(LF, () => [insertAt(1.5, "x")])).toThrow(/no cabe/);
  });
});

describe("applyEdits — CRLF", () => {
  test("reemplazar, insertar y borrar conservan CRLF y convierten lo insertado", () => {
    expect(apply(CRLF, (t) => [replaceRange(line(t, 1), "DOS\nextra\n")])).toBe("uno\r\nDOS\r\nextra\r\ntres\r\ncuatro\r\n");
    expect(apply(CRLF, (t) => [insertAt(line(t, 2).start, "nueva\n")])).toBe("uno\r\ndos\r\nnueva\r\ntres\r\ncuatro\r\n");
    expect(apply(CRLF, (t) => [deleteRange(line(t, 1))])).toBe("uno\r\ntres\r\ncuatro\r\n");
  });

  test("rango de una línea: no toca el final de línea", () => {
    expect(apply(CRLF, (t) => [replaceRange({ start: line(t, 1).start, end: line(t, 1).end - 1 }, "DOS")])).toBe(
      "uno\r\nDOS\r\ntres\r\ncuatro\r\n",
    );
  });

  test("texto a insertar con CRLF o LF mezclados sale con el final de línea del archivo", () => {
    expect(apply(CRLF, (t) => [insertAt(t.length, "a\r\nb\nc\n")])).toBe(CRLF + "a\r\nb\r\nc\r\n");
    expect(apply(LF, (t) => [insertAt(t.length, "a\r\nb\nc\n")])).toBe(LF + "a\nb\nc\n");
  });

  test("lo que no se toca queda byte a byte igual (también con finales de línea mezclados)", () => {
    const mixed = "uno\r\ndos\ntres\r\ncuatro\n";
    const out = apply(mixed, (t) => [replaceRange(line(t, 0), "UNO\n")]);
    expect(out.slice(out.indexOf("dos"))).toBe("dos\ntres\r\ncuatro\n");
  });

  test("sobre un handoff real parseado: el reemplazo por rango da un diff de una sola línea", () => {
    const raw = "# Handoff\r\n\r\n<!-- agent-context-kit:section=in-progress -->\r\n## Tarea en progreso\r\n\r\nTarea 3 — viejo\r\n\r\n### Plan\r\n\r\n- [ ] Paso 1 — a\r\n\r\n<!-- agent-context-kit:section=paused -->\r\n## Tareas pausadas\r\n\r\nNinguna.\r\n";
    const eol = normalizeEol(raw);
    const handoff = parseHandoff(eol.text);
    const mark = handoff.inProgress.steps[0].markRange!;
    const out = applyEdits(raw, eol, [replaceRange(mark, "x"), replaceRange(handoff.inProgress.task!.range!, "Tarea 3 — nuevo")]);
    expect(out).toBe(raw.replace("[ ]", "[x]").replace("viejo", "nuevo"));
  });
});
