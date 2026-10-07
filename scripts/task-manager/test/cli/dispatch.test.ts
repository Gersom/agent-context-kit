import { afterAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CliError } from "../../src/cli/errors.ts";
import { run, validateCommands } from "../../src/cli/dispatch.ts";
import type { Command, CommandContext } from "../../src/cli/types.ts";
import { insertAt } from "../../src/edit/edits.ts";
import { captureIo, makeProject } from "../helpers.ts";

const project = makeProject({ folders: ["gersom"] });
afterAll(() => project.cleanup());

/** Comando de prueba que guarda el contexto que recibe. */
function probe(seen: CommandContext[], extra: Partial<Command> = {}): Command {
  return {
    name: "probe",
    summary: "Comando de prueba",
    usage: "probe <x> [--titulo <t>]",
    flags: {
      titulo: { type: "string", description: "Un título" },
      detalles: { type: "string", description: "Texto largo", stdin: true, valueName: "texto" },
      fuerza: { type: "boolean", description: "Fuerza" },
    },
    run(ctx) {
      seen.push(ctx);
    },
    ...extra,
  };
}

async function exec(argv: string[], commands: Command[], extra: Parameters<typeof run>[1] = {}) {
  const cap = captureIo();
  const code = await run(argv, { commands, io: cap.io, email: "g@work.com", baseDir: project.root, ...extra });
  return { code, out: cap.out.join("\n"), err: cap.err.join("\n") };
}

describe("ayuda", () => {
  test("sin argumentos y con --help: lista los comandos registrados, código 0", async () => {
    for (const argv of [[], ["--help"], ["-h"], ["help"]]) {
      const { code, out } = await exec(argv, [probe([])]);
      expect(code).toBe(0);
      expect(out).toContain("Uso: bun run task <comando>");
      expect(out).toMatch(/probe\s+Comando de prueba/);
      expect(out).toContain("--dry-run");
      expect(out).toContain("--agents <ruta>");
    }
  });

  test("ayuda de un comando: `<comando> --help` y `help <comando>`", async () => {
    for (const argv of [["probe", "--help"], ["help", "probe"]]) {
      const { code, out } = await exec(argv, [probe([])]);
      expect(code).toBe(0);
      expect(out).toContain("Uso: bun run task probe <x> [--titulo <t>]");
      expect(out).toContain("--detalles <texto|->");
      expect(out).toContain("--fuerza");
    }
  });

  test("la ayuda no ejecuta el comando", async () => {
    const seen: CommandContext[] = [];
    await exec(["probe", "--help"], [probe(seen)]);
    expect(seen).toHaveLength(0);
  });

  test("help de un comando inexistente: error de uso", async () => {
    const { code, err } = await exec(["help", "nada"], [probe([])]);
    expect(code).toBe(2);
    expect(err).toContain("Comando desconocido: «nada»");
  });
});

describe("errores y códigos de salida", () => {
  test("comando desconocido: código 2, mensaje en español y pista de ayuda", async () => {
    const { code, err, out } = await exec(["nada"], [probe([])]);
    expect(code).toBe(2);
    expect(out).toBe("");
    expect(err).toContain("Error: Comando desconocido: «nada». Comandos: probe.");
    expect(err).toContain("bun run task --help");
  });

  test("flags sin comando: falta el comando (código 2)", async () => {
    const { code, err } = await exec(["--dry-run"], [probe([])]);
    expect(code).toBe(2);
    expect(err).toContain("Falta el comando.");
  });

  test("flag desconocido o sin valor: código 2", async () => {
    expect((await exec(["probe", "--nada"], [probe([])])).code).toBe(2);
    const { code, err } = await exec(["probe", "--titulo"], [probe([])]);
    expect(code).toBe(2);
    expect(err).toContain("Falta el valor de --titulo.");
  });

  test("CliError del comando: código 1 y mensaje sin stack", async () => {
    const failing = probe([], {
      run() {
        throw new CliError("No se puede.");
      },
    });
    const { code, err } = await exec(["probe"], [failing]);
    expect(code).toBe(1);
    expect(err).toBe("Error: No se puede.");
  });

  test("código de salida devuelto por el comando", async () => {
    expect((await exec(["probe"], [probe([], { run: () => 3 })])).code).toBe(3);
    expect((await exec(["probe"], [probe([], { run: async () => undefined })])).code).toBe(0);
  });

  test("error inesperado (bug): código 1 y «Error inesperado»", async () => {
    const buggy = probe([], {
      run() {
        throw new TypeError("boom");
      },
    });
    const { code, err } = await exec(["probe"], [buggy]);
    expect(code).toBe(1);
    expect(err).toContain("Error inesperado");
    expect(err).toContain("boom");
  });
});

describe("contexto de un comando", () => {
  test("posicionales y flags propios (sin los globales); globales aparte", async () => {
    const seen: CommandContext[] = [];
    await exec(["probe", "a", "--titulo", "T", "b", "--fuerza", "--dry-run", "--operator", "gersom"], [probe(seen)]);
    expect(seen[0].args).toEqual(["a", "b"]);
    expect(seen[0].flags).toEqual({ titulo: "T", fuerza: true });
    expect(seen[0].global).toEqual({ dryRun: true, apply: false });
  });

  test("flags globales antes del nombre del comando", async () => {
    const seen: CommandContext[] = [];
    await exec(["--dry-run", "--operator", "gersom", "probe"], [probe(seen)]);
    expect(seen[0].global.dryRun).toBe(true);
    expect(seen[0].workspace().operator?.folder).toBe("gersom");
  });

  test("valor `-` lee la entrada estándar", async () => {
    const seen: CommandContext[] = [];
    await exec(["probe", "--detalles", "-"], [probe(seen)], { readStdin: async () => "Texto\nlargo\n" });
    expect(seen[0].flags.detalles).toBe("Texto\nlargo");
  });

  test("dos flags con `-`: error de uso", async () => {
    const two = probe([], { flags: { a: { type: "string", description: "a", stdin: true }, b: { type: "string", description: "b", stdin: true } } });
    const { code, err } = await exec(["probe", "--a", "-", "--b", "-"], [two], { readStdin: async () => "x" });
    expect(code).toBe(2);
    expect(err).toContain("Solo un flag puede leer");
  });

  test("el espacio de trabajo y los archivos son perezosos: un comando que no los pide no los resuelve", async () => {
    // Sin proyecto resoluble, el comando igual corre si no pide el workspace.
    const seen: CommandContext[] = [];
    const { code } = await exec(["probe"], [probe(seen)], { baseDir: "C:/no/existe", email: null });
    expect(code).toBe(0);
    expect(() => seen[0].workspace()).toThrow(CliError);
  });

  test("workspace y docs se resuelven una vez", async () => {
    const seen: CommandContext[] = [];
    await exec(["probe", "--agents", project.root], [probe(seen)]);
    expect(seen[0].workspace()).toBe(seen[0].workspace());
    expect(seen[0].docs()).toBe(seen[0].docs());
    expect(seen[0].docs().handoff.exists).toBe(true);
  });

  test("un error al resolver el operador sale como error del comando (código 1)", async () => {
    const needs = probe([], { run: (ctx) => void ctx.workspace() });
    const { code, err } = await exec(["probe", "--agents", project.root], [needs], { email: "otra@mail.com" });
    expect(code).toBe(1);
    expect(err).toContain("otra@mail.com no figura en operators.md");
  });

  test("commit: escribe, y con --dry-run muestra el diff y no escribe", async () => {
    const path = join(project.agents, "gersom", "history.md");
    const before = readFileSync(path, "utf8");
    const editing = probe([], {
      run(ctx) {
        const { history } = ctx.docs();
        ctx.commit([{ doc: history, edits: [insertAt(0, "<!-- nota -->\n")] }]);
      },
    });

    const dry = await exec(["probe", "--dry-run"], [editing]);
    expect(dry.code).toBe(0);
    expect(dry.out).toContain("+<!-- nota -->");
    expect(readFileSync(path, "utf8")).toBe(before);

    const real = await exec(["probe"], [editing]);
    expect(real.code).toBe(0);
    expect(readFileSync(path, "utf8")).toBe("<!-- nota -->\n" + before);
  });
});

describe("validateCommands", () => {
  const base = (over: Partial<Command>): Command => ({ name: "x", summary: "s", usage: "x", run() {}, ...over });

  test("acepta un registro válido", () => {
    expect(() => validateCommands([base({}), base({ name: "otro-cmd" })])).not.toThrow();
  });

  test("rechaza nombres repetidos, reservados o inválidos", () => {
    expect(() => validateCommands([base({}), base({})])).toThrow(/repetido/);
    expect(() => validateCommands([base({ name: "help" })])).toThrow(/reservado/);
    expect(() => validateCommands([base({ name: "Mal Nombre" })])).toThrow(/inválido/);
  });

  test("rechaza flags que chocan con los globales o stdin en un flag booleano", () => {
    expect(() => validateCommands([base({ flags: { "dry-run": { type: "boolean", description: "x" } } })])).toThrow(/choca/);
    expect(() => validateCommands([base({ flags: { a: { type: "boolean", description: "x", stdin: true } } })])).toThrow(/solo un flag de texto/);
  });

  test("run() falla con error inesperado si el registro es inválido", async () => {
    const { code, err } = await exec(["x"], [base({}), base({})]);
    expect(code).toBe(1);
    expect(err).toContain("Error inesperado");
  });
});
