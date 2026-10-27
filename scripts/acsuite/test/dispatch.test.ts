import { describe, expect, test } from "bun:test";
import { dispatch, helpText, SUBCOMMANDS } from "../dispatch.ts";

function setup() {
  const calls: Array<[string, string[]]> = [];
  const subcommands = {
    board: { run: (argv: string[]) => (calls.push(["board", argv]), 0) },
    task: { run: async (argv: string[]) => (calls.push(["task", argv]), 3) },
  };
  const out: string[] = [];
  const err: string[] = [];
  const run = (argv: string[]) => dispatch(argv, subcommands, (line) => out.push(line), (line) => err.push(line));
  return { calls, out, err, run };
}

describe("dispatch", () => {
  test("pasa el resto de los argumentos al subcomando y devuelve su código de salida", async () => {
    const { calls, run } = setup();
    expect(await run(["task", "start", "72", "--apply"])).toBe(3);
    expect(await run(["board", ".", "--once"])).toBe(0);
    expect(calls).toEqual([
      ["task", ["start", "72", "--apply"]],
      ["board", [".", "--once"]],
    ]);
  });

  test("sin subcomando muestra la ayuda por stderr y sale con 2", async () => {
    const { err, out, run } = setup();
    expect(await run([])).toBe(2);
    expect(err).toEqual([helpText()]);
    expect(out).toEqual([]);
  });

  test("--help, -h y help muestran la ayuda por stdout y salen con 0", async () => {
    for (const flag of ["--help", "-h", "help"]) {
      const { out, err, run } = setup();
      expect(await run([flag])).toBe(0);
      expect(out).toEqual([helpText()]);
      expect(err).toEqual([]);
    }
  });

  test("un subcomando desconocido da error de uso (2) y lista los válidos", async () => {
    const { calls, err, run } = setup();
    expect(await run(["tasks"])).toBe(2);
    expect(err[0]).toContain("Subcomando desconocido: «tasks».");
    expect(err[0]).toContain("board");
    expect(calls).toEqual([]);
  });

  test("no confunde propiedades heredadas de Object con subcomandos", async () => {
    const { err, run } = setup();
    expect(await run(["constructor"])).toBe(2);
    expect(err[0]).toContain("Subcomando desconocido");
  });
});

describe("SUBCOMMANDS", () => {
  test("registra board, task, check e init, y la ayuda los lista", () => {
    expect(Object.keys(SUBCOMMANDS)).toEqual(["board", "task", "check", "init"]);
    for (const name of Object.keys(SUBCOMMANDS)) expect(helpText()).toContain(name);
  });
});
