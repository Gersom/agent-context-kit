// Tests del script entero (index.ts) como proceso: código de salida real, salida estándar y de error.

import { afterAll, describe, expect, test } from "bun:test";
import { basename, dirname, join } from "node:path";
import { flatTree, type TempProject, writeProject } from "../helpers.ts";

const INDEX = join(import.meta.dir, "..", "..", "index.ts");

const created: TempProject[] = [];
afterAll(() => created.forEach((p) => p.cleanup()));

function project(tree: Record<string, string>): TempProject {
  const p = writeProject(tree);
  created.push(p);
  return p;
}

/** Corre index.ts desde `cwd`, sin variables de npm/bun que cambien la carpeta de invocación. */
async function runCli(args: string[], cwd: string) {
  const env: Record<string, string | undefined> = { ...process.env, NO_COLOR: "1" };
  delete env.INIT_CWD;
  delete env.npm_config_local_prefix;
  const proc = Bun.spawn([process.execPath, INDEX, ...args], { env, cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { stdout, stderr, code };
}

describe("index.ts", () => {
  const valid = project(flatTree());

  test("proyecto válido: código 0 y el informe por la salida estándar", async () => {
    const { stdout, stderr, code } = await runCli([valid.root], valid.root);
    expect(code).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Listo para trabajar");
  });

  test("proyecto con avisos: 0, y 1 con --strict", async () => {
    // Sin AGENTS.md solo hay un aviso.
    const tree = flatTree();
    delete tree["AGENTS.md"];
    const p = project(tree);
    expect((await runCli([p.root], p.root)).code).toBe(0);
    expect((await runCli([p.root, "--strict"], p.root)).code).toBe(1);
  });

  test("proyecto con errores: código 1", async () => {
    const tree = flatTree();
    delete tree["docs/agents/backlog.md"];
    const p = project(tree);
    const { stdout, code } = await runCli([p.root], p.root);
    expect(code).toBe(1);
    expect(stdout).toContain("[file-missing]");
  });

  test("--json: la salida estándar es solo el objeto JSON", async () => {
    const { stdout, code } = await runCli([valid.root, "--json"], valid.root);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ ok: true, mode: "flat" });
  });

  test("una ruta relativa se resuelve desde la carpeta donde se lanza", async () => {
    const { code, stdout } = await runCli([basename(valid.root), "--json"], dirname(valid.root));
    expect(code).toBe(0);
    expect(JSON.parse(stdout).project).toBe(valid.root);
  });

  test("sin argumentos: código 2 y el error por la salida de error", async () => {
    const { stdout, stderr, code } = await runCli([], valid.root);
    expect(code).toBe(2);
    expect(stdout).toBe("");
    expect(stderr).toContain("Falta la ruta");
  });

  test("flag desconocido: código 2", async () => {
    expect((await runCli([valid.root, "--nada"], valid.root)).code).toBe(2);
  });

  test("--help: código 0 con la ayuda", async () => {
    const { stdout, code } = await runCli(["--help"], valid.root);
    expect(code).toBe(0);
    expect(stdout).toContain("Uso: bun run check <ruta>");
  });
});
