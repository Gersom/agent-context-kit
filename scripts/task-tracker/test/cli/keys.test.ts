import { describe, expect, test } from "bun:test";
import { keyAction } from "../../src/cli/keys.ts";

describe("keyAction", () => {
  test("q, Q y Ctrl+C salen; r y R redibujan; el resto no hace nada", () => {
    expect(["q", "Q", "\u0003"].map(keyAction)).toEqual(["quit", "quit", "quit"]);
    expect(["r", "R"].map(keyAction)).toEqual(["redraw", "redraw"]);
    expect(["x", " ", "\r"].map(keyAction)).toEqual([null, null, null]);
  });
});
