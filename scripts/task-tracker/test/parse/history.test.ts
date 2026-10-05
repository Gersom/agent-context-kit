import { describe, expect, test } from "bun:test";
import { parseEntry, parseHistory } from "../../src/parse/history.ts";
import { requireFixture } from "../helpers.ts";

describe("parseHistory", () => {
  test("toma las entradas en el orden del archivo e ignora comentarios y placeholders", () => {
    const { entries } = parseHistory(requireFixture("es-anchors", "history.md"));
    expect(entries.map((e) => e.number)).toEqual([11, 10, null, 9, 7, 6]);
    expect(entries[0]).toEqual({ date: "2026-10-05", status: "done", number: 11, label: "Tarea", title: "Escribir el `parser` de secciones" });
  });

  test("descartada: estado y título sin el sufijo entre paréntesis", () => {
    const { entries } = parseHistory(requireFixture("es-anchors", "history.md"));
    expect(entries[1]).toMatchObject({ status: "discarded", number: 10, title: "Usar YAML para las tareas" });
  });

  test("entrada sin número: solo título", () => {
    const { entries } = parseHistory(requireFixture("es-anchors", "history.md"));
    expect(entries[2]).toEqual({ date: "2026-10-03", status: "done", number: null, label: null, title: 'Agregar la sección "Qué es este proyecto"' });
  });

  test("en inglés y con guion corto o común", () => {
    const { entries } = parseHistory(requireFixture("en-no-anchors", "history.md"));
    expect(entries).toEqual([
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
