import { describe, expect, test } from "bun:test";
import { stripComments } from "../../parse/markdown.ts";

describe("stripComments", () => {
  test("quita comentarios inline y multilínea", () => {
    expect(stripComments("a <!-- x --> b\n<!--\nlinea\n-->\nc")).toBe("a  b\n\nc");
  });
  test("descarta un comentario sin cerrar hasta el final", () => {
    expect(stripComments("a\n<!-- abierto\nb")).toBe("a\n");
  });
});
