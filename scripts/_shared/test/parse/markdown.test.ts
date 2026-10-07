import { describe, expect, test } from "bun:test";
import { commentSpans, stripComments } from "../../parse/markdown.ts";

describe("stripComments", () => {
  test("quita comentarios inline y multilínea", () => {
    expect(stripComments("a <!-- x --> b\n<!--\nlinea\n-->\nc")).toBe("a  b\n\nc");
  });
  test("descarta un comentario sin cerrar hasta el final", () => {
    expect(stripComments("a\n<!-- abierto\nb")).toBe("a\n");
  });
});

describe("commentSpans", () => {
  test("son exactamente los tramos que quita stripComments (inline, multilínea y sin cerrar)", () => {
    const text = "a <!-- x --> b\n<!--\nlinea\n-->\nc <!-- abierto\nd";
    const spans = commentSpans(text);
    expect(spans.map(([s, e]) => text.slice(s, e))).toEqual(["<!-- x -->", "<!--\nlinea\n-->", "<!-- abierto\nd"]);
    let rest = "";
    let at = 0;
    for (const [s, e] of spans) {
      rest += text.slice(at, s);
      at = e;
    }
    expect(rest + text.slice(at)).toBe(stripComments(text));
  });
  test("sin comentarios: ningún tramo; se puede llamar varias veces (el regex no guarda estado)", () => {
    expect(commentSpans("sin nada")).toEqual([]);
    expect(commentSpans("<!-- a -->")).toEqual(commentSpans("<!-- a -->"));
  });
});
