// Tests del script entero (index.ts) como proceso: código de salida real, salida estándar y de error.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
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

const valid = project(flatTree());

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

  test("flag desconocido: código 2", async () => {
    expect((await runCli([valid.root, "--nada"], valid.root)).code).toBe(2);
  });

  test("--help: código 0 con la ayuda", async () => {
    const { stdout, code } = await runCli(["--help"], valid.root);
    expect(code).toBe(0);
    expect(stdout).toContain("Uso: acsuite check [ruta]");
  });
});

describe("index.ts sin ruta: el proyecto de la carpeta donde se lanza", () => {
  /** Un proyecto válido que es un repo git (con `src/app` como subcarpeta). */
  function gitProject(): TempProject {
    const tree = flatTree();
    tree["src/app/index.ts"] = "export {};\n";
    const p = project(tree);
    expect(spawnSync("git", ["init", "-q"], { cwd: p.root }).status).toBe(0);
    return p;
  }

  test("desde la raíz del proyecto: lo revisa y sale con 0", async () => {
    const p = gitProject();
    const { stdout, stderr, code } = await runCli(["--json"], p.root);
    expect(stderr).toBe("");
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({ ok: true, mode: "flat" });
  });

  test("desde una subcarpeta: sube hasta la raíz del repo git", async () => {
    const p = gitProject();
    const { stdout, code } = await runCli(["--json"], join(p.root, "src", "app"));
    expect(code).toBe(0);
    expect(realpathSync.native(JSON.parse(stdout).project)).toBe(realpathSync.native(p.root));
  });

  test("sin repo git: usa la carpeta misma", async () => {
    const p = project(flatTree());
    const { stdout, code } = await runCli(["--json"], p.root);
    expect(code).toBe(0);
    expect(realpathSync.native(JSON.parse(stdout).project)).toBe(realpathSync.native(p.root));
  });

  test("fuera de un proyecto (sin documentación de la skill): código 1 y un mensaje que dice qué falta", async () => {
    const p = project({ "README.md": "# Hola\n" });
    const { stdout, stderr, code } = await runCli([], p.root);
    expect(code).toBe(1);
    expect(stderr).toBe("");
    expect(stdout).toContain("[workspace]");
    expect(stdout).toContain("No se encontró la documentación de agentes");
    expect(stdout).toContain("Indica la raíz del proyecto o su carpeta de agentes.");
  });

  test("con ruta, la carpeta de lanzamiento no importa", async () => {
    const other = project({ "README.md": "# Hola\n" });
    const { code } = await runCli([valid.root], other.root);
    expect(code).toBe(0);
  });
});
