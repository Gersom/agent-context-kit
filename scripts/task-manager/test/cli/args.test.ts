import { describe, expect, test } from "bun:test";
import { GLOBAL_FLAGS, parseFlags, resolveStdinFlags, splitCommandLine } from "../../src/cli/args.ts";
import { UsageError } from "../../src/cli/errors.ts";
import type { FlagSpec } from "../../src/cli/types.ts";

const spec: Record<string, FlagSpec> = {
  ...GLOBAL_FLAGS,
  title: { type: "string", description: "t" },
  details: { type: "string", description: "d", stdin: true },
  nota: { type: "string", description: "n", stdin: true },
  fuerza: { type: "boolean", description: "f" },
  new: { type: "string", description: "n", multiple: true },
};

describe("splitCommandLine", () => {
  test("el comando es el primer argumento que no es un flag", () => {
    expect(splitCommandLine(["show", "3"])).toEqual({ name: "show", rest: ["3"] });
    expect(splitCommandLine(["add", "--title", "x", "--dry-run"])).toEqual({ name: "add", rest: ["--title", "x", "--dry-run"] });
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
    expect(parseFlags(["--new", "uno", "--fuerza", "--new=dos"], spec).values).toEqual({ new: ["uno", "dos"], fuerza: true });
    expect(parseFlags(["--fuerza"], spec).values.new).toBeUndefined();
  });

  test("flags de texto, booleanos, con = y posicionales", () => {
    const { values, positionals } = parseFlags(["3", "--title", "Hola mundo", "--fuerza", "--agents=D:/p", "-h"], spec);
    expect(values).toEqual({ title: "Hola mundo", fuerza: true, agents: "D:/p", help: true });
    expect(positionals).toEqual(["3"]);
  });

  test("el valor «-» llega tal cual (lo resuelve resolveStdinFlags)", () => {
    expect(parseFlags(["--details", "-"], spec).values).toEqual({ details: "-" });
    expect(parseFlags(["--details=-"], spec).values).toEqual({ details: "-" });
  });

  test("flag desconocido, sin valor o ambiguo: UsageError en español", () => {
    expect(() => parseFlags(["--nada"], spec)).toThrow(UsageError);
    expect(() => parseFlags(["--nada"], spec)).toThrow("Flag desconocido: --nada.");
    expect(() => parseFlags(["--title"], spec)).toThrow("Falta el valor de --title.");
    expect(() => parseFlags(["--title", "--fuerza"], spec)).toThrow(/ambiguo/);
  });

  test("texto que empieza con guion, con =", () => {
    expect(parseFlags(["--title=-5 grados"], spec).values).toEqual({ title: "-5 grados" });
  });
});

describe("resolveStdinFlags", () => {
  test("«-» se reemplaza por la entrada estándar, en LF y sin el salto final", async () => {
    const values = await resolveStdinFlags({ details: "-", title: "x" }, spec, async () => "línea 1\r\nlínea 2\r\n");
    expect(values).toEqual({ details: "línea 1\nlínea 2", title: "x" });
  });

  test("solo quita UN salto de línea final", async () => {
    expect((await resolveStdinFlags({ details: "-" }, spec, async () => "a\n\n"))["details"]).toBe("a\n");
  });

  test("sin «-» no se lee la entrada", async () => {
    let read = false;
    const values = await resolveStdinFlags({ details: "texto" }, spec, async () => ((read = true), ""));
    expect(read).toBe(false);
    expect(values).toEqual({ details: "texto" });
  });

  test("«-» en un flag que no admite stdin queda como texto literal", async () => {
    expect(await resolveStdinFlags({ title: "-" }, spec, async () => "no")).toEqual({ title: "-" });
  });

  test("dos flags con «-»: error de uso (la entrada se lee una vez)", async () => {
    await expect(resolveStdinFlags({ details: "-", nota: "-" }, spec, async () => "x")).rejects.toThrow(/Solo un flag puede leer/);
  });
});
