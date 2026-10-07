import { describe, expect, test } from "bun:test";
import { parseKeys } from "../../src/cli/keys.ts";

describe("parseKeys", () => {
  test("q, Q y Ctrl+C salen; r y R redibujan; el resto no hace nada", () => {
    expect(parseKeys("qQ\u0003")).toEqual(["quit", "quit", "quit"]);
    expect(parseKeys("rR")).toEqual(["redraw", "redraw"]);
    expect(parseKeys("x 1")).toEqual([]);
  });

  test("c compacta o expande y f oculta o muestra las flechas del flujo (mayúscula o minúscula)", () => {
    expect(parseKeys("cC")).toEqual(["compact", "compact"]);
    expect(parseKeys("fF")).toEqual(["flow", "flow"]);
  });

  test("las flechas llegan como secuencias de varios caracteres (CSI y SS3)", () => {
    expect(parseKeys("\u001b[A")).toEqual(["up"]);
    expect(parseKeys("\u001b[B")).toEqual(["down"]);
    expect(parseKeys("\u001bOA\u001bOB")).toEqual(["up", "down"]);
  });

  test("Enter abre; b, B, Retroceso y un Esc suelto vuelven", () => {
    expect(parseKeys("\r")).toEqual(["enter"]);
    expect(parseKeys("\n")).toEqual(["enter"]);
    expect(parseKeys("bB\u007f")).toEqual(["back", "back", "back"]);
    expect(parseKeys("\u001b")).toEqual(["back"]);
  });

  test("otras secuencias (flechas laterales, teclas con parámetros) se ignoran enteras", () => {
    expect(parseKeys("\u001b[C\u001b[D")).toEqual([]);
    expect(parseKeys("\u001b[1;5Aq")).toEqual(["up", "quit"]);
    expect(parseKeys("\u001b[3~")).toEqual([]);
  });

  test("varias teclas en una misma lectura, en orden", () => {
    expect(parseKeys("\u001b[B\u001b[B\r")).toEqual(["down", "down", "enter"]);
  });
});
