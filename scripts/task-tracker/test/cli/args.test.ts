import { describe, expect, test } from "bun:test";
import { parseArgs } from "../../src/cli/args.ts";

describe("parseArgs", () => {
  test("sin argumentos", () => {
    expect(parseArgs([])).toEqual({ once: false, follow: false, pathArg: undefined, operator: undefined, compact: false, arrows: true });
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

  test("sin ruta (proyecto de la carpeta actual): pathArg queda sin definir, con o sin flags", () => {
    expect(parseArgs(["--once"])).toEqual({ once: true, follow: false, pathArg: undefined, operator: undefined, compact: false, arrows: true });
    expect(parseArgs(["--compact", "--no-arrows"])).toMatchObject({ pathArg: undefined, operator: undefined, compact: true, arrows: false });
  });

  test("sin ruta, el operador se indica con --operator", () => {
    expect(parseArgs(["--operator", "ana"])).toMatchObject({ pathArg: undefined, operator: "ana" });
    expect(parseArgs(["--once", "--operator=ana"])).toMatchObject({ once: true, pathArg: undefined, operator: "ana" });
  });

  test("con un solo argumento posicional, es la ruta (compatibilidad con la 1.9)", () => {
    expect(parseArgs(["ana"])).toMatchObject({ pathArg: "ana", operator: undefined });
  });

  test("con ruta y operador (board <ruta> <operador>)", () => {
    expect(parseArgs(["D:/repo", "ana"])).toEqual({ once: false, follow: false, pathArg: "D:/repo", operator: "ana", compact: false, arrows: true });
  });

  test("el valor de --operator no se toma como ruta", () => {
    expect(parseArgs(["--operator", "ana"]).pathArg).toBeUndefined();
  });

  test("--operator sin valor se ignora", () => {
    expect(parseArgs(["repo", "--operator"]).operator).toBeUndefined();
  });

  test("--follow activa el modo observador, con o sin ruta; por defecto está apagado", () => {
    expect(parseArgs([]).follow).toBe(false);
    expect(parseArgs(["--follow"])).toMatchObject({ follow: true, pathArg: undefined, operator: undefined });
    expect(parseArgs(["repo", "--follow", "--compact"])).toMatchObject({ follow: true, pathArg: "repo", compact: true });
  });

  test("--compact arranca con los recuadros compactos y --no-arrows sin flechas", () => {
    expect(parseArgs(["repo", "--compact"])).toMatchObject({ pathArg: "repo", compact: true, arrows: true });
    expect(parseArgs(["repo", "--no-arrows"])).toMatchObject({ pathArg: "repo", compact: false, arrows: false });
    expect(parseArgs(["--compact", "--no-arrows", "repo", "ana"])).toMatchObject({ pathArg: "repo", operator: "ana", compact: true, arrows: false });
  });
});
