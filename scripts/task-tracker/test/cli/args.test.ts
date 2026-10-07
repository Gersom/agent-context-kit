import { describe, expect, test } from "bun:test";
import { parseArgs } from "../../src/cli/args.ts";

describe("parseArgs", () => {
  test("sin argumentos", () => {
    expect(parseArgs([])).toEqual({ once: false, pathArg: undefined, operator: undefined });
  });

  test("ruta y --once", () => {
    expect(parseArgs(["D:\repo", "--once"])).toEqual({ once: true, pathArg: "D:\repo", operator: undefined });
  });

  test("--operator con valor separado o con =", () => {
    expect(parseArgs(["repo", "--operator", "ana"])).toEqual({ once: false, pathArg: "repo", operator: "ana" });
    expect(parseArgs(["--operator=ana", "repo"])).toEqual({ once: false, pathArg: "repo", operator: "ana" });
  });

  test("el segundo argumento es el operador (equivale a --operator); --operator gana si se dan los dos", () => {
    expect(parseArgs(["repo", "ana"])).toEqual({ once: false, pathArg: "repo", operator: "ana" });
    expect(parseArgs(["repo", "ana", "--once"])).toEqual({ once: true, pathArg: "repo", operator: "ana" });
    expect(parseArgs(["repo", "ana", "--operator", "gersom"]).operator).toBe("gersom");
  });

  test("el valor de --operator no se toma como ruta", () => {
    expect(parseArgs(["--operator", "ana"]).pathArg).toBeUndefined();
  });

  test("--operator sin valor se ignora", () => {
    expect(parseArgs(["repo", "--operator"]).operator).toBeUndefined();
  });
});
