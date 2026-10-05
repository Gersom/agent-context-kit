// Tests del script entero (index.ts) corriéndolo como proceso aparte con Bun.spawn.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { FIXTURES } from "../helpers.ts";

const INDEX = join(import.meta.dir, "..", "..", "index.ts");

/** Corre index.ts con los argumentos dados, sin datos de entrada y sin colores. */
async function run(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  // Sin variables de `bun run` heredadas: las rutas relativas no deben depender de quién lanzó los tests.
  const env: Record<string, string | undefined> = { ...process.env, NO_COLOR: "1" };
  delete env.INIT_CWD;
  delete env.npm_config_local_prefix;

  const proc = Bun.spawn([process.execPath, INDEX, ...args], {
    env,
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
  test("--once contra un fixture: pinta la pantalla y sale con código 0", async () => {
    const { stdout, code } = await run([join(FIXTURES, "es-anchors"), "--once"]);
    expect(code).toBe(0);
    expect(stdout).toContain("Tarea 12 — Implementar el parser de anclas");
    expect(stdout).toContain("Ctrl+C para salir");
    expect(stdout).not.toMatch(/\x1b\[/);
  });

  test("set mínimo con --once: sin secciones de backlog", async () => {
    const { stdout, code } = await run([join(FIXTURES, "minimal"), "--once"]);
    expect(code).toBe(0);
    expect(stdout).toContain("Sin tarea en curso");
    expect(stdout).not.toContain("LIBRES");
  });

  test("ruta inexistente por argumento: código 1 sin preguntar", async () => {
    const { stdout, stderr, code } = await run([join(FIXTURES, "no-existe"), "--once"]);
    expect(code).toBe(1);
    expect(stderr).toContain("No existe la carpeta");
    expect(stdout).not.toContain("Ruta del proyecto");
  });

  test("sin argumento y sin datos de entrada: código 1", async () => {
    const { stderr, code } = await run(["--once"]);
    expect(code).toBe(1);
    expect(stderr).toContain("No se recibió ninguna ruta");
  });
});
