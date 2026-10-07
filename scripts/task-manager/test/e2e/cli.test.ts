// Tests del script entero (index.ts) como proceso, contra un proyecto temporal con git.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { makeProject, type Project } from "../helpers.ts";

const INDEX = join(import.meta.dir, "..", "..", "index.ts");

let project: Project;
let hasGit = true;

beforeAll(() => {
  project = makeProject({ folders: ["gersom", "ana"], teamBacklog: true });
  const init = spawnSync("git", ["init", "-q", project.root]);
  hasGit = init.status === 0;
  if (hasGit) spawnSync("git", ["-C", project.root, "config", "user.email", "ANA@mail.com"]);
});
afterAll(() => project.cleanup());

/** Corre index.ts desde `cwd`, sin colores ni variables de npm/bun que cambien la carpeta de invocación. */
async function runCli(args: string[], options: { cwd?: string } = {}) {
  const env: Record<string, string | undefined> = { ...process.env, NO_COLOR: "1" };
  delete env.INIT_CWD;
  delete env.npm_config_local_prefix;
  const proc = Bun.spawn([process.execPath, INDEX, ...args], {
    env,
    cwd: options.cwd ?? project.root,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { stdout, stderr, code };
}

describe("index.ts", () => {
  test("sin argumentos: la ayuda con los comandos, código 0", async () => {
    const { stdout, code } = await runCli([]);
    expect(code).toBe(0);
    expect(stdout).toContain("whoami");
    expect(stdout).toContain("anchors");
  });

  test("whoami usa el repo actual y el correo de git (sin --agents)", async () => {
    if (!hasGit) return;
    const { stdout, code } = await runCli(["whoami"]);
    expect(code).toBe(0);
    expect(stdout).toContain("Operador: ana");
    expect(stdout).toContain("Carpeta propia: sí");
  });

  test("whoami desde una subcarpeta del repo encuentra el mismo proyecto", async () => {
    if (!hasGit) return;
    const { stdout, code } = await runCli(["whoami"], { cwd: join(project.root, "docs") });
    expect(code).toBe(0);
    expect(stdout).toContain("Operador: ana");
  });

  test("--agents y --operator, en cualquier posición", async () => {
    const { stdout, code } = await runCli(["--operator", "gersom", "whoami", "--agents", project.root], { cwd: join(project.root, "..") });
    expect(code).toBe(0);
    expect(stdout).toContain("Operador: gersom");
  });

  test("anchors: código 0 con todo en orden", async () => {
    const { stdout, code } = await runCli(["anchors", "--operator", "gersom"]);
    expect(code).toBe(0);
    expect(stdout).toContain("Todas las anclas están en su lugar.");
  });

  test("comando desconocido: código distinto de 0 y mensaje en stderr", async () => {
    const { stderr, code, stdout } = await runCli(["nada"]);
    expect(code).toBe(2);
    expect(stdout).toBe("");
    expect(stderr).toContain("Comando desconocido");
  });

  test("operador que no existe: código 1 con el motivo", async () => {
    const { stderr, code } = await runCli(["whoami", "--operator", "nadie"]);
    expect(code).toBe(1);
    expect(stderr).toContain("«nadie» no figura en operators.md");
  });
});
