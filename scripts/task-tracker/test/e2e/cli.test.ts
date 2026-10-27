// Tests del script entero (index.ts) corriéndolo como proceso aparte con Bun.spawn.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FIXTURES, requireFixture } from "../../../_shared/test/helpers.ts";

const INDEX = join(import.meta.dir, "..", "..", "index.ts");

/** Corre index.ts con los argumentos dados (desde `cwd`, si se indica), sin datos de entrada y sin colores. */
async function run(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; code: number }> {
  // Sin variables de `bun run` heredadas: las rutas relativas no deben depender de quién lanzó los tests.
  const env: Record<string, string | undefined> = { ...process.env, NO_COLOR: "1" };
  delete env.INIT_CWD;
  delete env.npm_config_local_prefix;

  const proc = Bun.spawn([process.execPath, INDEX, ...args], {
    env,
    cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, code };
}

describe("index.ts", () => {
  test("--once contra un fixture: pinta los recuadros de los tres archivos y sale con código 0, sin atajos", async () => {
    const { stdout, code } = await run([join(FIXTURES, "es-anchors"), "--once"]);
    expect(code).toBe(0);
    expect(stdout).toContain("▣ ES ANCHORS");
    for (const box of ["─ history.md ─╮", "╭─ EN PROGRESO", "╭─ LIBRES", "╭─ BLOQUEADAS"]) expect(stdout).toContain(box);
    expect(stdout).toContain("T-11: Escribir el parser de secciones");
    expect(stdout).toContain("Tarea 12 — Implementar el parser de anclas");
    expect(stdout).toContain("T-4: Deploy en skills.sh [dependencia]");
    expect(stdout).not.toContain("Ctrl+C");
    expect(stdout).not.toMatch(/\x1b\[/);
  });

  test("set mínimo con --once: sin recuadros de backlog ni history", async () => {
    const { stdout, code } = await run([join(FIXTURES, "minimal"), "--once"]);
    expect(code).toBe(0);
    expect(stdout).toContain("Sin tarea en curso");
    expect(stdout).not.toContain("LIBRES");
    expect(stdout).not.toContain("history.md ─╮");
  });

  test("ruta inexistente por argumento: código 1 sin preguntar", async () => {
    const { stdout, stderr, code } = await run([join(FIXTURES, "no-existe"), "--once"]);
    expect(code).toBe(1);
    expect(stderr).toContain("No existe la carpeta");
    expect(stdout).not.toContain("Ruta del proyecto");
  });

});

describe("index.ts sin ruta: el proyecto de la carpeta donde se lanza", () => {
  const created: string[] = [];
  afterAll(() => created.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

  /** Un proyecto temporal con la documentación del fixture `es-anchors` en docs/agents (y, si se pide, un repo git). */
  function tempProject({ git, docs = true }: { git: boolean; docs?: boolean }): string {
    const root = mkdtempSync(join(tmpdir(), "board-cwd-"));
    created.push(root);
    mkdirSync(join(root, "src", "app"), { recursive: true });
    if (docs) {
      mkdirSync(join(root, "docs", "agents"), { recursive: true });
      for (const file of ["handoff.md", "backlog.md", "history.md"]) {
        writeFileSync(join(root, "docs", "agents", file), requireFixture("es-anchors", file));
      }
    }
    if (git) expect(spawnSync("git", ["init", "-q"], { cwd: root }).status).toBe(0);
    return root;
  }

  test("desde la raíz del proyecto: pinta el tablero y sale con 0", async () => {
    const root = tempProject({ git: true });
    const { stdout, stderr, code } = await run(["--once"], root);
    expect(stderr).toBe("");
    expect(code).toBe(0);
    expect(stdout).toContain("▣ ");
    expect(stdout).toContain("T-11: Escribir el parser de secciones");
  });

  test("desde una subcarpeta: sube hasta la raíz del repo git", async () => {
    const root = tempProject({ git: true });
    const { stdout, code } = await run(["--once"], join(root, "src", "app"));
    expect(code).toBe(0);
    expect(stdout).toContain("T-11: Escribir el parser de secciones");
  });

  test("sin repo git: usa la carpeta misma", async () => {
    const root = tempProject({ git: false });
    const { stdout, code } = await run(["--once"], root);
    expect(code).toBe(0);
    expect(stdout).toContain("T-11: Escribir el parser de secciones");
  });

  test("fuera de un proyecto (sin documentación): código 1, dice qué falta y cómo indicar otra ruta, sin preguntar", async () => {
    const root = tempProject({ git: false, docs: false });
    const { stdout, stderr, code } = await run(["--once"], root);
    expect(code).toBe(1);
    expect(stderr).toContain("No se pudo abrir el proyecto de la carpeta actual");
    expect(stderr).toContain("No se encontró handoff.md");
    expect(stderr).toContain("acsuite board <ruta>");
    expect(stdout).toBe("");
  });

  test("con ruta, la carpeta de lanzamiento no importa", async () => {
    const other = tempProject({ git: false, docs: false });
    const { stdout, code } = await run([join(FIXTURES, "es-anchors"), "--once"], other);
    expect(code).toBe(0);
    expect(stdout).toContain("▣ ES ANCHORS");
  });
});
