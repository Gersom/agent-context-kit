import { describe, expect, test } from "bun:test";
import { unifiedDiff } from "../../src/edit/diff.ts";

const lines = (n: number) => Array.from({ length: n }, (_, i) => `línea ${i + 1}`);
const text = (arr: string[]) => arr.join("\n") + "\n";

describe("unifiedDiff", () => {
  test("sin diferencias: vacío", () => {
    expect(unifiedDiff(text(lines(5)), text(lines(5)))).toEqual([]);
  });

  test("una línea cambiada: -/+ con contexto", () => {
    const after = lines(10);
    after[4] = "CAMBIADA";
    expect(unifiedDiff(text(lines(10)), text(after))).toEqual([
      "@@ -3,5 +3,5 @@",
      " línea 3",
      " línea 4",
      "-línea 5",
      "+CAMBIADA",
      " línea 6",
      " línea 7",
    ]);
  });

  test("inserción y borrado", () => {
    const base = lines(6);
    expect(unifiedDiff(text(base), text([...base.slice(0, 3), "NUEVA", ...base.slice(3)]), 1)).toEqual([
      "@@ -3,2 +3,3 @@",
      " línea 3",
      "+NUEVA",
      " línea 4",
    ]);
    expect(unifiedDiff(text(base), text(base.filter((l) => l !== "línea 4")), 1)).toEqual([
      "@@ -3,3 +3,2 @@",
      " línea 3",
      "-línea 4",
      " línea 5",
    ]);
  });

  test("cambios lejanos van en bloques separados; cercanos, en uno", () => {
    const far = lines(30);
    far[2] = "A";
    far[25] = "B";
    const out = unifiedDiff(text(lines(30)), text(far));
    expect(out.filter((l) => l.startsWith("@@"))).toHaveLength(2);

    const near = lines(30);
    near[2] = "A";
    near[6] = "B";
    expect(unifiedDiff(text(lines(30)), text(near)).filter((l) => l.startsWith("@@"))).toHaveLength(1);
  });

  test("archivo nuevo (antes vacío) y archivo vaciado", () => {
    expect(unifiedDiff("", "a\nb\n")).toEqual(["@@ -0,0 +1,2 @@", "+a", "+b"]);
    expect(unifiedDiff("a\nb\n", "")).toEqual(["@@ -1,2 +0,0 @@", "-a", "-b"]);
  });

  test("ignora los finales de línea (CRLF contra LF no ensucia el diff)", () => {
    expect(unifiedDiff("a\r\nb\r\n", "a\nb\n")).toEqual([]);
    expect(unifiedDiff("a\r\nb\r\n", "a\r\nB\r\n", 0)).toEqual(["@@ -2,1 +2,1 @@", "-b", "+B"]);
  });

  test("solo cambia el salto de línea final: lo avisa", () => {
    expect(unifiedDiff("a\nb", "a\nb\n")).toEqual(["(solo cambia el salto de línea al final del archivo)"]);
  });

  test("zona cambiada enorme: cae a quitar y agregar todo, sin colgarse", () => {
    const a = Array.from({ length: 2500 }, (_, i) => `a${i}`);
    const b = Array.from({ length: 2500 }, (_, i) => `b${i}`);
    const out = unifiedDiff(text(a), text(b));
    expect(out.filter((l) => l.startsWith("-"))).toHaveLength(2500);
    expect(out.filter((l) => l.startsWith("+"))).toHaveLength(2500);
  });
});
