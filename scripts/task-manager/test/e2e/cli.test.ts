// Tests del script entero (index.ts) como proceso, contra un proyecto temporal con git.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

  test("status, next y show --json leen el repo actual con el correo de git", async () => {
    if (!hasGit) return;
    const status = await runCli(["status"]);
    expect(status.code).toBe(0);
    expect(status.stdout).toContain("Operador: ana");
    expect(status.stdout).toContain("En curso: Tarea 12");
    expect(status.stdout).toContain("Próximo número de tarea: 20");
    expect((await runCli(["next"])).stdout).toContain("En curso: Tarea 12");
    const show = JSON.parse((await runCli(["show", "12", "--json"])).stdout);
    expect(show.matches[0]).toMatchObject({ place: "in-progress", number: 12, operator: null });
    const missing = await runCli(["show", "999"]);
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain("No existe la Tarea 999");
  });

  test("add: sin --apply solo muestra el diff; con --apply escribe en la carpeta propia (la del correo de git)", async () => {
    if (!hasGit) return;
    const backlog = join(project.agents, "ana", "backlog.md");
    const before = readFileSync(backlog, "utf8");
    const preview = await runCli(["add", "--titulo", "Probar el e2e", "--descripcion", "Desde el proceso"]);
    expect(preview.code).toBe(0);
    expect(preview.stdout).toContain("+### Tarea 20 — Probar el e2e");
    expect(preview.stdout).toContain("No se escribió nada; repite con --apply");
    expect(readFileSync(backlog, "utf8")).toBe(before);

    const applied = await runCli(["add", "--titulo", "Probar el e2e", "--descripcion", "Desde el proceso", "--apply"]);
    expect(applied.code).toBe(0);
    expect(applied.stdout).toContain("Tarea 20 agregada");
    const after = readFileSync(backlog, "utf8");
    expect(after).toContain("### Tarea 20 — Probar el e2e");
    expect(after).toContain("**Próximo número de tarea:** 21");

    // la carpeta de otro operador es de solo lectura
    const other = await runCli(["add", "--titulo", "X", "--descripcion", "Y", "--operator", "gersom", "--apply"]);
    expect(other.code).toBe(1);
    expect(other.stderr).toContain("«gersom» no es la tuya");
  });

  test("la ayuda de un comando de escritura avisa de --apply", async () => {
    const { stdout, code } = await runCli(["start", "--help"]);
    expect(code).toBe(0);
    expect(stdout).toContain("sin --apply solo muestra el diff");
    expect(stdout).toContain("--force");
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
