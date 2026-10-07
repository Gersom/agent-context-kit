import { describe, expect, test } from "bun:test";
import { GLOBAL_FLAGS, parseFlags, resolveStdinFlags, splitCommandLine } from "../../src/cli/args.ts";
import { UsageError } from "../../src/cli/errors.ts";
import type { FlagSpec } from "../../src/cli/types.ts";

const spec: Record<string, FlagSpec> = {
  ...GLOBAL_FLAGS,
  titulo: { type: "string", description: "t" },
  detalles: { type: "string", description: "d", stdin: true },
  nota: { type: "string", description: "n", stdin: true },
  fuerza: { type: "boolean", description: "f" },
  nueva: { type: "string", description: "n", multiple: true },
};

describe("splitCommandLine", () => {
  test("el comando es el primer argumento que no es un flag", () => {
    expect(splitCommandLine(["show", "3"])).toEqual({ name: "show", rest: ["3"] });
    expect(splitCommandLine(["add", "--titulo", "x", "--dry-run"])).toEqual({ name: "add", rest: ["--titulo", "x", "--dry-run"] });
  });

  test("los flags globales pueden ir antes del comando (y su valor no se toma por comando)", () => {
    expect(splitCommandLine(["--dry-run", "start"])).toEqual({ name: "start", rest: ["--dry-run"] });
    expect(splitCommandLine(["--agents", "D:/x", "--operator=ana", "status"])).toEqual({
      name: "status",
      rest: ["--agents", "D:/x", "--operator=ana"],
    });
  });

  test("sin comando", () => {
    expect(splitCommandLine([])).toEqual({ name: null, rest: [] });
    expect(splitCommandLine(["--help"])).toEqual({ name: null, rest: ["--help"] });
    expect(splitCommandLine(["--agents", "x"])).toEqual({ name: null, rest: ["--agents", "x"] });
  });
});

describe("parseFlags", () => {
  test("un flag repetible devuelve la lista de sus valores", () => {
    expect(parseFlags(["--nueva", "uno", "--fuerza", "--nueva=dos"], spec).values).toEqual({ nueva: ["uno", "dos"], fuerza: true });
    expect(parseFlags(["--fuerza"], spec).values.nueva).toBeUndefined();
  });

  test("flags de texto, booleanos, con = y posicionales", () => {
    const { values, positionals } = parseFlags(["3", "--titulo", "Hola mundo", "--fuerza", "--agents=D:/p", "-h"], spec);
    expect(values).toEqual({ titulo: "Hola mundo", fuerza: true, agents: "D:/p", help: true });
    expect(positionals).toEqual(["3"]);
  });

  test("el valor «-» llega tal cual (lo resuelve resolveStdinFlags)", () => {
    expect(parseFlags(["--detalles", "-"], spec).values).toEqual({ detalles: "-" });
    expect(parseFlags(["--detalles=-"], spec).values).toEqual({ detalles: "-" });
  });

  test("flag desconocido, sin valor o ambiguo: UsageError en español", () => {
    expect(() => parseFlags(["--nada"], spec)).toThrow(UsageError);
    expect(() => parseFlags(["--nada"], spec)).toThrow("Flag desconocido: --nada.");
    expect(() => parseFlags(["--titulo"], spec)).toThrow("Falta el valor de --titulo.");
    expect(() => parseFlags(["--titulo", "--fuerza"], spec)).toThrow(/ambiguo/);
  });

  test("texto que empieza con guion, con =", () => {
    expect(parseFlags(["--titulo=-5 grados"], spec).values).toEqual({ titulo: "-5 grados" });
  });
});

describe("resolveStdinFlags", () => {
  test("«-» se reemplaza por la entrada estándar, en LF y sin el salto final", async () => {
    const values = await resolveStdinFlags({ detalles: "-", titulo: "x" }, spec, async () => "línea 1\r\nlínea 2\r\n");
    expect(values).toEqual({ detalles: "línea 1\nlínea 2", titulo: "x" });
  });

  test("solo quita UN salto de línea final", async () => {
    expect((await resolveStdinFlags({ detalles: "-" }, spec, async () => "a\n\n"))["detalles"]).toBe("a\n");
  });

  test("sin «-» no se lee la entrada", async () => {
    let read = false;
    const values = await resolveStdinFlags({ detalles: "texto" }, spec, async () => ((read = true), ""));
    expect(read).toBe(false);
    expect(values).toEqual({ detalles: "texto" });
  });

  test("«-» en un flag que no admite stdin queda como texto literal", async () => {
    expect(await resolveStdinFlags({ titulo: "-" }, spec, async () => "no")).toEqual({ titulo: "-" });
  });

  test("dos flags con «-»: error de uso (la entrada se lee una vez)", async () => {
    await expect(resolveStdinFlags({ detalles: "-", nota: "-" }, spec, async () => "x")).rejects.toThrow(/Solo un flag puede leer/);
  });
});
