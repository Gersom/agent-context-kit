import { describe, expect, test } from "bun:test";
import { UsageError } from "../../task-manager/src/cli/errors.ts";
import { HELP, parseCheckArgs } from "../src/args.ts";

describe("parseCheckArgs", () => {
  test("solo la ruta: el resto en sus valores por defecto", () => {
    expect(parseCheckArgs(["../otro"])).toEqual({ path: "../otro", operator: undefined, json: false, strict: false, help: false });
  });

  test("todos los flags, antes o después de la ruta", () => {
    const expected = { path: "D:/p", operator: "ana", json: true, strict: true, help: false };
    expect(parseCheckArgs(["D:/p", "--operator", "ana", "--json", "--strict"])).toEqual(expected);
    expect(parseCheckArgs(["--strict", "--json", "--operator", "ana", "D:/p"])).toEqual(expected);
  });

  test("--operator con = y con espacio", () => {
    expect(parseCheckArgs(["p", "--operator=luis"]).operator).toBe("luis");
    expect(parseCheckArgs(["p", "--operator", "luis"]).operator).toBe("luis");
  });

  test("-h y --help piden la ayuda y no exigen la ruta", () => {
    expect(parseCheckArgs(["-h"])).toMatchObject({ help: true, path: null });
    expect(parseCheckArgs(["--help"])).toMatchObject({ help: true, path: null });
    expect(parseCheckArgs(["p", "--help"])).toMatchObject({ help: true, path: "p" });
  });

  test("sin ruta: UsageError (código 2)", () => {
    expect(() => parseCheckArgs([])).toThrow(UsageError);
    expect(() => parseCheckArgs([])).toThrow("Falta la ruta del proyecto a verificar.");
    expect(() => parseCheckArgs(["--json"])).toThrow("Falta la ruta");
  });

  test("más de una ruta: UsageError que dice cuáles sobran", () => {
    expect(() => parseCheckArgs(["a", "b", "c"])).toThrow(UsageError);
    expect(() => parseCheckArgs(["a", "b", "c"])).toThrow("Sobran argumentos: b c.");
  });

  test("flag desconocido: UsageError en español", () => {
    expect(() => parseCheckArgs(["p", "--nada"])).toThrow(UsageError);
    expect(() => parseCheckArgs(["p", "--nada"])).toThrow("Flag desconocido: --nada.");
    expect(() => parseCheckArgs(["p", "-x"])).toThrow("Flag desconocido: -x.");
  });

  test("--operator sin valor o con otro flag como valor: UsageError", () => {
    expect(() => parseCheckArgs(["p", "--operator"])).toThrow("Falta el valor de --operator.");
    expect(() => parseCheckArgs(["p", "--operator", "--json"])).toThrow(UsageError);
  });

  test("un flag booleano con valor es mal uso", () => {
    expect(() => parseCheckArgs(["p", "--json=si"])).toThrow(UsageError);
  });

  test("todos los errores de uso salen con código 2", () => {
    for (const argv of [[], ["a", "b"], ["p", "--nada"], ["p", "--operator"]]) {
      try {
        parseCheckArgs(argv);
        throw new Error("debía fallar");
      } catch (caught) {
        expect(caught).toBeInstanceOf(UsageError);
        expect((caught as UsageError).exitCode).toBe(2);
      }
    }
  });
});

describe("HELP", () => {
  test("describe el uso, los flags y los códigos de salida", () => {
    const text = HELP.join("\n");
    for (const part of ["bun run check <ruta>", "--operator", "--json", "--strict", "--help", "Código de salida"]) {
      expect(text).toContain(part);
    }
  });
});
