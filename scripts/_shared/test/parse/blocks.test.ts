import { describe, expect, test } from "bun:test";
import { parseBlocks, parseFields } from "../../parse/blocks.ts";

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
