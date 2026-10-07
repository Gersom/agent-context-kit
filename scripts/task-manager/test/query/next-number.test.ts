import { describe, expect, test } from "bun:test";
import { requireFixture } from "../../../_shared/test/helpers.ts";
import { findNextTaskNumber } from "../../src/query/next-number.ts";

describe("findNextTaskNumber", () => {
  test("etiqueta en español, con su línea", () => {
    expect(findNextTaskNumber(requireFixture("es-anchors", "backlog.md"))).toEqual({ value: 20, line: 5 });
  });

  test("etiqueta en inglés: no depende del idioma", () => {
    expect(findNextTaskNumber(requireFixture("en-no-anchors", "backlog.md"))).toEqual({ value: 30, line: 3 });
  });

  test("acepta `**Etiqueta**: N`", () => {
    expect(findNextTaskNumber("# B\n\n**Next**: 7\n")).toEqual({ value: 7, line: 3 });
  });

  test("ignora comentarios HTML y bloques de código", () => {
    const text = "# B\n\n<!--\n**Próximo número de tarea:** 99\n-->\n\n```\n**Próximo número de tarea:** 98\n```\n\n**Próximo número de tarea:** 5\n";
    expect(findNextTaskNumber(text)).toEqual({ value: 5, line: 11 });
  });

  test("solo mira la introducción: se detiene en la primera ancla o sección", () => {
    expect(findNextTaskNumber("# B\n\n<!-- agent-context-kit:section=free -->\n## Libres\n\n**Próximo número de tarea:** 5\n")).toBeNull();
    expect(findNextTaskNumber("# B\n\n## Libres\n\n**Próximo número de tarea:** 5\n")).toBeNull();
  });

  test("un campo en negrita que no es solo un número no cuenta", () => {
    expect(findNextTaskNumber("# B\n\n**Ciclo de vida:** una tarea pasa por 3 etapas\n")).toBeNull();
  });

  test("sin la línea: null", () => {
    expect(findNextTaskNumber("")).toBeNull();
    expect(findNextTaskNumber("# Backlog\n")).toBeNull();
  });
});
