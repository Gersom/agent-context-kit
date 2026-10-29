import { describe, expect, test } from "bun:test";
import { DEFAULT_OPTIONS, parseArgs, resolveOptions } from "../../src/cli/args.ts";

describe("parseArgs", () => {
  test("sin argumentos", () => {
    expect(parseArgs([])).toEqual({ once: false, pathArg: undefined, operator: undefined });
  });

  test("ruta y --once", () => {
    expect(parseArgs(["D:\\repo", "--once"])).toMatchObject({ once: true, pathArg: "D:\\repo", operator: undefined });
  });

  test("el segundo argumento es el operador", () => {
    expect(parseArgs(["repo", "ana"])).toMatchObject({ pathArg: "repo", operator: "ana" });
    expect(parseArgs(["repo", "ana", "--once"])).toMatchObject({ once: true, pathArg: "repo", operator: "ana" });
  });

  test("sin ruta (proyecto de la carpeta actual): pathArg queda sin definir", () => {
    expect(parseArgs(["--once"])).toEqual({ once: true, pathArg: undefined, operator: undefined });
  });

  test("con un solo argumento posicional, es la ruta (compatibilidad con la 1.9)", () => {
    expect(parseArgs(["ana"])).toMatchObject({ pathArg: "ana", operator: undefined });
  });

  test("con ruta y operador (board <ruta> <operador>)", () => {
    expect(parseArgs(["D:/repo", "ana"])).toEqual({ once: false, pathArg: "D:/repo", operator: "ana" });
  });

  test("sin flags indebidos no hay error", () => {
    expect(parseArgs(["repo", "ana", "--once"]).error).toBeUndefined();
  });

  test("cada flag quitado da un error que dice qué usar", () => {
    const keys = "usa las teclas c / f; se recuerdan en settings.json";
    const follow = "usa la tecla o; se recuerda en settings.json";
    const expected: Record<string, string> = {
      "--compact": keys,
      "--no-compact": keys,
      "--arrows": keys,
      "--no-arrows": keys,
      "--follow": follow,
      "--no-follow": follow,
      "--operator": "pásalo como segundo argumento tras la ruta: acsuite board <ruta> <operador>",
    };
    for (const [flag, hint] of Object.entries(expected)) {
      expect(parseArgs([flag]).error).toBe(`Ya no existe el flag ${flag} del board: ${hint}`);
    }
  });

  test("--operator con valor (con o sin ruta) o con =: error, no toma el valor como ruta", () => {
    for (const argv of [["--operator", "ana"], ["--operator", "ana", "repo"], ["--operator=ana", "repo"]]) {
      expect(parseArgs(argv).error).toStartWith("Ya no existe el flag --operator del board: ");
    }
  });

  test("un flag desconocido da error", () => {
    expect(parseArgs(["--algo"]).error).toBe("Flag desconocido: --algo. Mira acsuite board --help.");
    expect(parseArgs(["repo", "--once", "--algo=1"]).error).toBe("Flag desconocido: --algo. Mira acsuite board --help.");
  });
});

describe("resolveOptions", () => {
  const resolve = ({ saved = {}, hasPath = false, once = false }: { saved?: Parameters<typeof resolveOptions>[0]["saved"]; hasPath?: boolean; once?: boolean } = {}) =>
    resolveOptions({ saved, hasPath, once });

  test("sin nada guardado: los defectos", () => {
    expect(resolve()).toEqual(DEFAULT_OPTIONS);
    expect(DEFAULT_OPTIONS).toEqual({ compact: false, arrows: true, follow: false });
  });

  test("lo guardado, propiedad por propiedad (a las que faltan, el defecto)", () => {
    expect(resolve({ saved: { compact: true, arrows: false, follow: true } })).toEqual({ compact: true, arrows: false, follow: true });
    expect(resolve({ saved: { compact: true } })).toEqual({ compact: true, arrows: true, follow: false });
  });

  test("follow guardado solo vale sin ruta y sin --once", () => {
    const saved = { follow: true };
    expect(resolve({ saved }).follow).toBe(true);
    expect(resolve({ saved, hasPath: true }).follow).toBe(false);
    expect(resolve({ saved, once: true }).follow).toBe(false);
    expect(resolve({ saved, hasPath: true, once: true }).follow).toBe(false);
  });

  test("compacto y flechas guardados valen también con ruta y con --once", () => {
    expect(resolve({ saved: { compact: true, arrows: false }, hasPath: true, once: true })).toMatchObject({ compact: true, arrows: false });
  });
});
