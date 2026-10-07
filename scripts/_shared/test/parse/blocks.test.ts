import { describe, expect, test } from "bun:test";
import { parseBlocks, parseFields } from "../../parse/blocks.ts";
import { BodyPos, LineIndex } from "../../parse/positions.ts";
import { lineNumbersMatch, sliceRange } from "../helpers.ts";

describe("parseFields", () => {
  test("lee etiqueta y valor sin depender del idioma, con continuaciones indentadas", () => {
    const fields = parseFields(["- **Blockers:** `[dependency]` waits.", "  - more detail", "- **Agregada:** 2026-10-05.", "texto suelto"]);
    expect(fields).toEqual([
      { label: "Blockers", value: "`[dependency]` waits.\n- more detail", isPlaceholder: false },
      { label: "Agregada", value: "2026-10-05.", isPlaceholder: false },
    ]);
  });
  test("acepta `**Etiqueta**:` y marca placeholders", () => {
    expect(parseFields(["- **Detalles**: [Placeholder]"])[0]).toEqual({ label: "Detalles", value: "[Placeholder]", isPlaceholder: true });
  });
});

describe("parseBlocks", () => {
  test("acepta —, – y - como separador", () => {
    const { tasks } = parseBlocks("### Tarea 1 — a\n### Task 2 – b\n### Task 3 - c\n### Tarea [N] — placeholder");
    expect(tasks.map((t) => [t.number, t.label, t.title])).toEqual([
      [1, "Tarea", "a"],
      [2, "Task", "b"],
      [3, "Task", "c"],
    ]);
  });
});

describe("posiciones de bloques y campos en el texto original", () => {
  const DOC = [
    "### Tarea 1 — a", // 1
    "", // 2
    "- **Desc:** uno", // 3
    "  - sublista", // 4
    "", // 5
    "  - tras una línea en blanco", // 6
    "- **Otro:** dos", // 7
    "", // 8
    "<!-- comentario", // 9
    "multilínea -->", // 10
    "### Tarea 2 — b <!-- inline -->", // 11
    "- **X:** <!-- c --> valor", // 12
    "texto suelto", // 13
    "", // 14
    "### Grupo — contenedor", // 15
    "", // 16
    "#### Tarea 3 — c", // 17
    "- **Y:** y", // 18
    "#### Tarea 4 — d", // 19
    "### Grupo — ref (Tareas 3, 4)", // 20
    "- **Resumen:** r", // 21
  ].join("\n");

  function parse(text: string) {
    const pos = new BodyPos(text, 0, new LineIndex(text));
    return parseBlocks(pos.text, pos);
  }

  test("cada tarea abarca de su header hasta antes del siguiente bloque, con lo que haya entremedio", () => {
    const { tasks, groups } = parse(DOC);
    const [t1, t2] = tasks;
    const [t3, t4] = groups[0].tasks;
    expect(sliceRange(DOC, t1.range!)).toBe(DOC.split("\n").slice(0, 10).join("\n") + "\n");
    expect(t1.range).toMatchObject({ startLine: 1, endLine: 10 });
    expect(sliceRange(DOC, t2.range!)).toBe(DOC.split("\n").slice(10, 14).join("\n") + "\n");
    expect(t2.range).toMatchObject({ startLine: 11, endLine: 14 });
    // `#### ` dentro de un grupo: hasta la siguiente tarea o el siguiente `### `.
    expect(sliceRange(DOC, t3.range!)).toBe("#### Tarea 3 — c\n- **Y:** y\n");
    expect(sliceRange(DOC, t4.range!)).toBe("#### Tarea 4 — d\n");
    for (const t of [...tasks, t3, t4]) expect(lineNumbersMatch(DOC, t.range!)).toBe(true);
  });

  test("grupos: el contenedor incluye sus tareas; la referencia llega hasta el fin del texto", () => {
    const { groups } = parse(DOC);
    expect(groups.map((g) => g.title)).toEqual(["contenedor", "ref"]);
    expect(sliceRange(DOC, groups[0].range!)).toBe(
      "### Grupo — contenedor\n\n#### Tarea 3 — c\n- **Y:** y\n#### Tarea 4 — d\n",
    );
    expect(groups[0].range).toMatchObject({ startLine: 15, endLine: 19 });
    expect(sliceRange(DOC, groups[1].range!)).toBe("### Grupo — ref (Tareas 3, 4)\n- **Resumen:** r");
    expect(groups[1].range!.end).toBe(DOC.length);
  });

  test("campos: su línea y sus continuaciones, sin las líneas en blanco ni el texto suelto que siguen", () => {
    const { tasks: [t1, t2], groups } = parse(DOC);
    const [t3] = groups[0].tasks;
    expect(t1.fields.map((f) => sliceRange(DOC, f.range!))).toEqual([
      "- **Desc:** uno\n  - sublista\n\n  - tras una línea en blanco\n",
      "- **Otro:** dos\n",
    ]);
    expect(t1.fields[0].range).toMatchObject({ startLine: 3, endLine: 6 });
    expect(t1.fields[1].range).toMatchObject({ startLine: 7, endLine: 7 });
    expect(sliceRange(DOC, t2.fields[0].range!)).toBe("- **X:** <!-- c --> valor\n");
    expect(sliceRange(DOC, t3.fields[0].range!)).toBe("- **Y:** y\n");
  });

  test("un comentario inline al final de la línea del campo no lo corta; uno multilínea entre campos queda fuera", () => {
    const text = "### Tarea 1 — a\n- **A:** uno <!-- c -->\n<!--\nmulti\n-->\n- **B:** dos\n";
    const [task] = parse(text).tasks;
    expect(task.fields.map((f) => sliceRange(text, f.range!))).toEqual(["- **A:** uno <!-- c -->\n", "- **B:** dos\n"]);
    expect(sliceRange(text, task.range!)).toBe(text);
  });

  test("un comentario con un header falso no abre bloque y queda dentro del anterior", () => {
    const text = "### Tarea 1 — a\n<!--\n### Tarea 9 — falsa\n-->\n### Tarea 2 — b\n";
    const { tasks } = parse(text);
    expect(tasks.map((t) => t.number)).toEqual([1, 2]);
    expect(sliceRange(text, tasks[0].range!)).toBe("### Tarea 1 — a\n<!--\n### Tarea 9 — falsa\n-->\n");
    expect(sliceRange(text, tasks[1].range!)).toBe("### Tarea 2 — b\n");
  });

  test("con un cuerpo que empieza en un offset distinto de 0 y un límite propio", () => {
    const doc = "XXXX\n### Tarea 1 — a\n- **A:** uno\n<!-- ancla -->\n## Otra";
    const base = doc.indexOf("### Tarea");
    const limit = doc.indexOf("<!-- ancla");
    const pos = new BodyPos(doc.slice(base, doc.indexOf("## Otra") - 1), base, new LineIndex(doc), limit);
    const [task] = parseBlocks(pos.text, pos).tasks;
    expect(sliceRange(doc, task.range!)).toBe("### Tarea 1 — a\n- **A:** uno\n");
  });

  test("sin posiciones no agrega rangos (comportamiento anterior)", () => {
    const { tasks, groups } = parseBlocks(DOC);
    expect(tasks.every((t) => t.range === undefined && t.fields.every((f) => f.range === undefined))).toBe(true);
    expect(groups.every((g) => g.range === undefined)).toBe(true);
  });

  test("cuerpo vacío: sin tareas ni grupos", () => {
    expect(parse("")).toEqual({ tasks: [], groups: [] });
  });
});
