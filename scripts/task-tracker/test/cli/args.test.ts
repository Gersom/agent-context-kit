import { describe, expect, test } from "bun:test";
import { parseArgs } from "../../src/cli/args.ts";

describe("parseArgs", () => {
  test("sin argumentos", () => {
    expect(parseArgs([])).toEqual({ once: false, pathArg: undefined, operator: undefined, compact: false, arrows: true });
  });

  test("ruta y --once", () => {
    expect(parseArgs(["D:\\repo", "--once"])).toMatchObject({ once: true, pathArg: "D:\\repo", operator: undefined });
  });

  test("--operator con valor separado o con =", () => {
    expect(parseArgs(["repo", "--operator", "ana"])).toMatchObject({ pathArg: "repo", operator: "ana" });
    expect(parseArgs(["--operator=ana", "repo"])).toMatchObject({ pathArg: "repo", operator: "ana" });
  });

  test("el segundo argumento es el operador (equivale a --operator); --operator gana si se dan los dos", () => {
    expect(parseArgs(["repo", "ana"])).toMatchObject({ pathArg: "repo", operator: "ana" });
    expect(parseArgs(["repo", "ana", "--once"])).toMatchObject({ once: true, pathArg: "repo", operator: "ana" });
    expect(parseArgs(["repo", "ana", "--operator", "gersom"]).operator).toBe("gersom");
  });

  test("el valor de --operator no se toma como ruta", () => {
    expect(parseArgs(["--operator", "ana"]).pathArg).toBeUndefined();
  });

  test("--operator sin valor se ignora", () => {
    expect(parseArgs(["repo", "--operator"]).operator).toBeUndefined();
  });

  test("--compact arranca con los recuadros compactos y --no-arrows sin flechas", () => {
    expect(parseArgs(["repo", "--compact"])).toMatchObject({ pathArg: "repo", compact: true, arrows: true });
    expect(parseArgs(["repo", "--no-arrows"])).toMatchObject({ pathArg: "repo", compact: false, arrows: false });
    expect(parseArgs(["--compact", "--no-arrows", "repo", "ana"])).toMatchObject({ pathArg: "repo", operator: "ana", compact: true, arrows: false });
  });
});
