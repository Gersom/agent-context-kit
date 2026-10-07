import { describe, expect, test } from "bun:test";
import { parseOperators } from "../../parse/operators.ts";

const HEADER = "# Operadores\n\n- **Carpeta:** nombre corto, minúsculas.\n\n---\n\n";

describe("parseOperators", () => {
  test("lee carpeta y correos, en minúsculas, con varios correos por operador", () => {
    const text = `${HEADER}<!-- agent-context-kit:section=operators -->\n## Lista\n\n- gersom: Gersom@Mail.com, g@work.com\n- ana: ana@mail.com\n`;
    expect(parseOperators(text)).toEqual({
      operators: [
        { folder: "gersom", emails: ["gersom@mail.com", "g@work.com"], folderless: false },
        { folder: "ana", emails: ["ana@mail.com"], folderless: false },
      ],
      unreadable: [],
    });
  });

  test("marca (solo team-backlog): operador sin carpeta", () => {
    const text = `${HEADER}<!-- agent-context-kit:section=operators -->\n## Lista\n\n- luis (solo team-backlog): luis@mail.com\n`;
    expect(parseOperators(text).operators).toEqual([{ folder: "luis", emails: ["luis@mail.com"], folderless: true }]);
  });

  test("ignora la lista de reglas anterior al ancla, los placeholders y los comentarios", () => {
    const text = `${HEADER}<!-- agent-context-kit:section=operators -->\n## Lista\n\n<!-- - x: x@x.com -->\n- [Placeholder — carpeta]: [Placeholder — correo]\n- ana: ana@mail.com\n`;
    expect(parseOperators(text).operators.map((o) => o.folder)).toEqual(["ana"]);
  });

  test("las líneas que no encajan quedan en unreadable", () => {
    const text = `${HEADER}<!-- agent-context-kit:section=operators -->\n## Lista\n\n- sin-correos:\n- ana ana@mail.com\n- bien: b@mail.com\n`;
    const result = parseOperators(text);
    expect(result.operators.map((o) => o.folder)).toEqual(["bien"]);
    expect(result.unreadable).toEqual(["sin-correos:", "ana ana@mail.com"]);
  });

  test("sin anclas usa la primera sección ## (plan B)", () => {
    const text = `${HEADER}## Lista\n\n- ana: ana@mail.com\n`;
    expect(parseOperators(text).operators.map((o) => o.folder)).toEqual(["ana"]);
  });

  test("documento vacío", () => {
    expect(parseOperators("")).toEqual({ operators: [], unreadable: [] });
  });
});
