import { describe, expect, test } from "bun:test";
import { DEFAULT_OPTIONS, parseArgs, resolveOptions } from "../../src/cli/args.ts";

describe("parseArgs", () => {
  test("sin argumentos", () => {
    expect(parseArgs([])).toEqual({ once: false, follow: undefined, pathArg: undefined, operator: undefined, compact: undefined, arrows: undefined });
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
    expect(parseArgs(["--once"])).toEqual({ once: true, follow: undefined, pathArg: undefined, operator: undefined, compact: undefined, arrows: undefined });
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
    expect(parseArgs(["D:/repo", "ana"])).toEqual({ once: false, follow: undefined, pathArg: "D:/repo", operator: "ana", compact: undefined, arrows: undefined });
  });

  test("el valor de --operator no se toma como ruta", () => {
    expect(parseArgs(["--operator", "ana"]).pathArg).toBeUndefined();
  });

  test("--operator sin valor se ignora", () => {
    expect(parseArgs(["repo", "--operator"]).operator).toBeUndefined();
  });

  test("--follow activa el modo observador, con o sin ruta; sin el flag queda sin definir", () => {
    expect(parseArgs([]).follow).toBeUndefined();
    expect(parseArgs(["--follow"])).toMatchObject({ follow: true, pathArg: undefined, operator: undefined });
    expect(parseArgs(["repo", "--follow", "--compact"])).toMatchObject({ follow: true, pathArg: "repo", compact: true });
  });

  test("--compact arranca con los recuadros compactos y --no-arrows sin flechas", () => {
    expect(parseArgs(["repo", "--compact"])).toMatchObject({ pathArg: "repo", compact: true, arrows: undefined });
    expect(parseArgs(["repo", "--no-arrows"])).toMatchObject({ pathArg: "repo", compact: undefined, arrows: false });
    expect(parseArgs(["--compact", "--no-arrows", "repo", "ana"])).toMatchObject({ pathArg: "repo", operator: "ana", compact: true, arrows: false });
  });

  test("cada opción tiene su par --x / --no-x; sin ninguno queda sin definir", () => {
    expect(parseArgs(["--no-compact", "--arrows", "--no-follow"])).toMatchObject({ compact: false, arrows: true, follow: false });
    expect(parseArgs(["--compact", "--no-arrows", "--follow"])).toMatchObject({ compact: true, arrows: false, follow: true });
    expect(parseArgs(["repo"])).toMatchObject({ compact: undefined, arrows: undefined, follow: undefined });
  });

  test("si se pasan los dos de un par, gana el último de la línea", () => {
    expect(parseArgs(["--compact", "--no-compact"]).compact).toBe(false);
    expect(parseArgs(["--no-compact", "--compact"]).compact).toBe(true);
    expect(parseArgs(["--no-arrows", "repo", "--arrows"])).toMatchObject({ pathArg: "repo", arrows: true });
    expect(parseArgs(["--follow", "--no-follow", "--follow"]).follow).toBe(true);
  });
});

describe("resolveOptions", () => {
  const args = (argv: string[]) => parseArgs(argv);

  test("sin flags ni nada guardado: los defectos", () => {
    expect(resolveOptions({ args: args([]), saved: {} })).toEqual(DEFAULT_OPTIONS);
    expect(DEFAULT_OPTIONS).toEqual({ compact: false, arrows: true, follow: false });
  });

  test("sin flags: lo guardado, propiedad por propiedad (a las que faltan, el defecto)", () => {
    expect(resolveOptions({ args: args([]), saved: { compact: true, arrows: false, follow: true } })).toEqual({ compact: true, arrows: false, follow: true });
    expect(resolveOptions({ args: args([]), saved: { compact: true } })).toEqual({ compact: true, arrows: true, follow: false });
  });

  test("un flag manda sobre lo guardado, en los dos sentidos", () => {
    const saved = { compact: true, arrows: false, follow: true };
    expect(resolveOptions({ args: args(["--no-compact", "--arrows", "--no-follow"]), saved })).toEqual({ compact: false, arrows: true, follow: false });
    expect(resolveOptions({ args: args(["--compact", "--no-arrows"]), saved: { compact: false, arrows: true } })).toMatchObject({ compact: true, arrows: false });
  });

  test("follow guardado solo vale sin ruta y sin --once", () => {
    const saved = { follow: true };
    expect(resolveOptions({ args: args([]), saved }).follow).toBe(true);
    expect(resolveOptions({ args: args(["--compact"]), saved }).follow).toBe(true);
    expect(resolveOptions({ args: args(["--operator", "ana"]), saved }).follow).toBe(true);
    expect(resolveOptions({ args: args(["repo"]), saved }).follow).toBe(false);
    expect(resolveOptions({ args: args(["--once"]), saved }).follow).toBe(false);
  });

  test("un --follow explícito vale aunque haya ruta o --once", () => {
    expect(resolveOptions({ args: args(["repo", "--follow"]), saved: {} }).follow).toBe(true);
    expect(resolveOptions({ args: args(["--once", "--follow"]), saved: {} }).follow).toBe(true);
  });

  test("--no-follow apaga el follow guardado", () => {
    expect(resolveOptions({ args: args(["--no-follow"]), saved: { follow: true } }).follow).toBe(false);
  });

  test("compacto y flechas guardados valen también con ruta y con --once", () => {
    expect(resolveOptions({ args: args(["repo", "--once"]), saved: { compact: true, arrows: false } })).toMatchObject({ compact: true, arrows: false });
  });
});
