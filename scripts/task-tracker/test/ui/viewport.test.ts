import { describe, expect, test } from "bun:test";
import { fitToHeight } from "../../src/ui/viewport.ts";

/** `n` líneas `l0`, `l1`… */
const make = (n: number) => Array.from({ length: n }, (_, i) => `l${i}`);

describe("fitToHeight", () => {
  const lines = make(20); // l0..l17 de contenido y l18, l19 de pie

  test("si caben en el alto, devuelve las mismas líneas", () => {
    expect(fitToHeight(lines, { rows: 20, selected: { start: 5, end: 7 }, footer: 2 })).toEqual(lines);
    expect(fitToHeight(lines, { rows: 40, selected: null, footer: 2 })).toEqual(lines);
  });

  test("sin selección, la ventana arranca desde arriba y solo hay indicador abajo", () => {
    const out = fitToHeight(lines, { rows: 10, selected: null, footer: 2 });
    expect(out).toHaveLength(10);
    expect(out.slice(0, 7)).toEqual(make(7));
    expect(out[7]).toBe("↓ 11 más"); // l7..l17 ocultas (la última visible, l7, la reemplaza el indicador)
    expect(out.slice(8)).toEqual(["l18", "l19"]);
  });

  test("la selección cerca del inicio no oculta nada arriba", () => {
    const out = fitToHeight(lines, { rows: 10, selected: { start: 2, end: 3 }, footer: 2 });
    expect(out[0]).toBe("l0");
    expect(out.some((l) => l.startsWith("↑"))).toBe(false);
    expect(out).toContain("l3");
  });

  test("la selección en medio: indicadores arriba y abajo, selección completa y pie intacto", () => {
    const out = fitToHeight(lines, { rows: 10, selected: { start: 9, end: 11 }, footer: 2 });
    expect(out).toHaveLength(10);
    expect(out[0]).toMatch(/^↑ \d+ más$/);
    expect(out[7]).toMatch(/^↓ \d+ más$/);
    expect(out).toEqual(expect.arrayContaining(["l9", "l10", "l11"]));
    expect(out.slice(-2)).toEqual(["l18", "l19"]);
  });

  test("N cuenta las líneas ocultas, también las que reemplazan los indicadores", () => {
    const out = fitToHeight(lines, { rows: 10, selected: { start: 9, end: 11 }, footer: 2 });
    const above = Number(out[0].match(/\d+/)![0]);
    const below = Number(out[7].match(/\d+/)![0]);
    const visible = out.slice(1, 7);
    // Cada línea de contenido está oculta arriba, visible o oculta abajo.
    expect(above + visible.length + below).toBe(18);
    expect(visible[0]).toBe(`l${above}`);
  });

  test("la selección al final: solo indicador arriba", () => {
    const out = fitToHeight(lines, { rows: 10, selected: { start: 16, end: 17 }, footer: 2 });
    expect(out[0]).toMatch(/^↑ \d+ más$/);
    expect(out.some((l) => l.startsWith("↓"))).toBe(false);
    expect(out.slice(-4)).toEqual(["l16", "l17", "l18", "l19"]);
  });

  test("cada fila posible queda visible, con el alto exacto y el pie", () => {
    for (const rows of [6, 8, 10, 15]) {
      for (let start = 0; start <= 16; start += 2) {
        const out = fitToHeight(lines, { rows, selected: { start, end: start + 1 }, footer: 2 });
        expect(out).toHaveLength(rows);
        expect(out).toEqual(expect.arrayContaining([`l${start}`, `l${start + 1}`]));
        expect(out.slice(-2)).toEqual(["l18", "l19"]);
      }
    }
  });

  test("una selección más alta que la ventana prioriza su inicio", () => {
    const out = fitToHeight(lines, { rows: 7, selected: { start: 6, end: 14 }, footer: 2 });
    expect(out).toHaveLength(7);
    expect(out[0]).toBe("↑ 6 más");
    expect(out[1]).toBe("l6");
    expect(out[4]).toMatch(/^↓/);
  });

  test("el estilo de los indicadores sale de `paint` y no se aplica a las demás líneas", () => {
    const out = fitToHeight(lines, { rows: 10, selected: { start: 9, end: 11 }, footer: 2, paint: (s) => `<${s}>` });
    expect(out[0]).toMatch(/^<↑ \d+ más>$/);
    expect(out[7]).toMatch(/^<↓ \d+ más>$/);
    expect(out.filter((l) => l.startsWith("<"))).toHaveLength(2);
  });

  test("con muy poco alto no falla: devuelve lo que quepa, empezando por el pie", () => {
    expect(fitToHeight(lines, { rows: 3, selected: { start: 5, end: 5 }, footer: 2 })).toEqual(["l5", "l18", "l19"]);
    expect(fitToHeight(lines, { rows: 2, selected: { start: 5, end: 5 }, footer: 2 })).toEqual(["l18", "l19"]);
    expect(fitToHeight(lines, { rows: 1, selected: { start: 5, end: 5 }, footer: 2 })).toEqual(["l19"]);
    expect(fitToHeight(lines, { rows: 0, selected: null, footer: 2 })).toEqual([]);
    expect(fitToHeight(lines, { rows: -1, selected: null, footer: 2 })).toEqual([]);
  });

  test("con 1 o 2 líneas para el contenido no hay indicadores, pero la selección se ve", () => {
    for (const rows of [3, 4]) {
      const out = fitToHeight(lines, { rows, selected: { start: 9, end: 9 }, footer: 2 });
      expect(out).toHaveLength(rows);
      expect(out).toContain("l9");
      expect(out.some((l) => l.includes("más"))).toBe(false);
    }
  });

  test("sin pie, o con un pie mayor que las líneas, no falla", () => {
    expect(fitToHeight(lines, { rows: 6, selected: { start: 19, end: 19 }, footer: 0 })).toHaveLength(6);
    expect(fitToHeight(make(3), { rows: 2, selected: null, footer: 10 })).toEqual(["l1", "l2"]);
  });

  test("una selección fuera de las líneas se acota", () => {
    const out = fitToHeight(lines, { rows: 10, selected: { start: 90, end: 99 }, footer: 2 });
    expect(out).toHaveLength(10);
    expect(out.slice(-3)).toEqual(["l17", "l18", "l19"]);
  });
});
