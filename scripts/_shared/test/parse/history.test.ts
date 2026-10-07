import { describe, expect, test } from "bun:test";
import { parseEntry, parseHistory } from "../../parse/history.ts";
import { normalizeEol } from "../../parse/positions.ts";
import { lineNumbersMatch, requireFixture, sliceRange } from "../helpers.ts";

describe("parseHistory", () => {
  test("toma las entradas en el orden del archivo e ignora comentarios y placeholders", () => {
    const { entries } = parseHistory(requireFixture("es-anchors", "history.md"));
    expect(entries.map((e) => e.number)).toEqual([11, 10, null, 9, 7, 6]);
    expect(entries[0]).toMatchObject({ date: "2026-10-05", status: "done", number: 11, label: "Tarea", title: "Escribir el `parser` de secciones" });
  });

  test("descartada: estado y título sin el sufijo entre paréntesis", () => {
    const { entries } = parseHistory(requireFixture("es-anchors", "history.md"));
    expect(entries[1]).toMatchObject({ status: "discarded", number: 10, title: "Usar YAML para las tareas" });
  });

  test("entrada sin número: solo título", () => {
    const { entries } = parseHistory(requireFixture("es-anchors", "history.md"));
    expect(entries[2]).toMatchObject({ date: "2026-10-03", status: "done", number: null, label: null, title: 'Agregar la sección "Qué es este proyecto"' });
  });

  test("en inglés y con guion corto o común", () => {
    const { entries } = parseHistory(requireFixture("en-no-anchors", "history.md"));
    expect(entries).toMatchObject([
      { date: "2026-10-05", status: "done", number: 20, label: "Task", title: "Draft the English glossary" },
      { date: "2026-10-04", status: "discarded", number: 19, label: "Task", title: "Machine translation" },
    ]);
  });

  test("ignora headers dentro de bloques de código y headers sin marca", () => {
    const text = ["## Introducción", "```", "## 2026-01-01 — ✅ Tarea 1 — en código", "```", "## 2026-01-02 — ✅ Tarea 2 — real"].join("\n");
    expect(parseHistory(text).entries.map((e) => e.number)).toEqual([2]);
  });

  test("parseEntry: sin marca o placeholder → null", () => {
    expect(parseEntry("Introducción")).toBeNull();
    expect(parseEntry("[Placeholder fecha] — ✅ [Placeholder título]")).toBeNull();
  });
});

describe("parseHistory: posiciones en el texto original", () => {
  const DOC = [
    "# Historial", // 1
    "", // 2
    "<!--", // 3
    "## [Placeholder fecha] — ✅ [Placeholder título]", // 4
    "-->", // 5
    "", // 6
    "## Notas", // 7
    "", // 8
    "## 2026-10-06 — ✅ Tarea 12 — Segunda", // 9
    "", // 10
    "- Detalle", // 11
    "```md", // 12
    "## 2026-01-01 — ✅ Tarea 99 — falsa, en un bloque de código", // 13
    "```", // 14
    "", // 15
    "## 2026-10-05 — ❌ Tarea 11 — Primera (descartada)", // 16
    "", // 17
    "<!-- comentario -->", // 18
    "- Motivo", // 19
  ].join("\n");

  test("cada entrada va de su header hasta antes del siguiente `## ` (sea o no entrada), o el fin del texto", () => {
    const { entries } = parseHistory(DOC);
    expect(entries.map((e) => e.number)).toEqual([12, 11]);
    expect(sliceRange(DOC, entries[0].range!)).toBe(DOC.split("\n").slice(8, 15).join("\n") + "\n");
    expect(entries[0].range).toMatchObject({ startLine: 9, endLine: 15 });
    expect(sliceRange(DOC, entries[1].range!)).toBe(DOC.split("\n").slice(15).join("\n"));
    expect(entries[1].range).toMatchObject({ startLine: 16, endLine: 19, end: DOC.length });
    for (const e of entries) expect(lineNumbersMatch(DOC, e.range!)).toBe(true);
  });

  test("la primera entrada marca dónde insertar una nueva arriba de todas, después de los headers sin marca", () => {
    const { entries } = parseHistory(DOC);
    expect(DOC.slice(entries[0].range!.start)).toStartWith("## 2026-10-06 — ✅ Tarea 12");
    expect(DOC.slice(0, entries[0].range!.start)).toEndWith("## Notas\n\n");
  });

  test("insertar en `entries[0].range.start` conserva el parseo y no toca el resto", () => {
    const { entries } = parseHistory(DOC);
    const entry = "## 2026-10-07 — ✅ Tarea 13 — Nueva\n\n- Hecho\n\n";
    const edited = DOC.slice(0, entries[0].range!.start) + entry + DOC.slice(entries[0].range!.start);
    expect(parseHistory(edited).entries.map((e) => e.number)).toEqual([13, 12, 11]);
    expect(edited.replace(entry, "")).toBe(DOC);
  });

  test("borrar el rango de una entrada deja las demás intactas", () => {
    const { entries } = parseHistory(DOC);
    const edited = DOC.slice(0, entries[0].range!.start) + DOC.slice(entries[0].range!.end);
    expect(parseHistory(edited).entries.map((e) => e.number)).toEqual([11]);
  });

  test("una sola entrada con el header en la última línea, sin salto de línea final", () => {
    const text = "## 2026-10-05 — ✅ Tarea 1 — Única";
    const [entry] = parseHistory(text).entries;
    expect(entry.range).toEqual({ startLine: 1, endLine: 1, start: 0, end: text.length });
  });

  test("sin entradas (solo placeholders y texto): lista vacía, no hay dónde insertar arriba", () => {
    expect(parseHistory("# Historial\n\n<!--\n## [Placeholder] — ✅ x\n-->\n").entries).toEqual([]);
  });

  test("fixture es-anchors: cada rango empieza en su header y no se pisan", () => {
    const text = requireFixture("es-anchors", "history.md");
    const { entries } = parseHistory(text);
    expect(entries).toHaveLength(6);
    for (const e of entries) {
      expect(sliceRange(text, e.range!)).toStartWith("## ");
      expect(lineNumbersMatch(text, e.range!)).toBe(true);
    }
    // Los rangos son contiguos o dejan solo headers sin marca entre ellos, y no se pisan.
    entries.slice(1).forEach((e, i) => expect(e.range!.start).toBeGreaterThanOrEqual(entries[i].range!.end));
  });

  test("CRLF: las mismas posiciones sobre el texto normalizado, traducibles al crudo", () => {
    const crlf = DOC.replace(/\n/g, "\r\n");
    const info = normalizeEol(crlf);
    const parsed = parseHistory(info.text);
    expect(parsed).toEqual(parseHistory(DOC));
    const [s, e] = info.rawSpan(parsed.entries[1].range!);
    expect(crlf.slice(s, e)).toBe(DOC.split("\n").slice(15).join("\r\n"));
  });

  test("archivo vacío", () => {
    expect(parseHistory("")).toEqual({ entries: [] });
  });
});
