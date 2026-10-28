// Tests del script entero (index.ts) en modo multi-operador, contra un repo temporal con git.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireFixture } from "../../../_shared/test/helpers.ts";

const INDEX = join(import.meta.dir, "..", "..", "index.ts");

const OPERATORS = `# Operadores

---

<!-- agent-context-skill:section=operators -->
## Lista

- gersom: gersom@mail.com
- ana: ana@mail.com
- luis (solo team-backlog): luis@mail.com
`;

const TEAM_BACKLOG = `<!-- agent-context-skill:section=free -->
## Tareas libres

### Revisar el copy del onboarding

- **Descripción:** ajustar textos

<!-- agent-context-skill:section=blocked -->
## Tareas bloqueadas / pospuestas

### Integrar la pasarela

- **Bloqueos:** \`[dependencia]\` espera la cuenta del cliente
`;

let repo: string;
// Carpeta de config del usuario (`ACSUITE_HOME`) de todas las corridas: temporal, nunca la real.
let home: string;
let hasGit = true;

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), "task-tracker-multi-"));
  home = mkdtempSync(join(tmpdir(), "task-tracker-multi-home-"));
  const agents = join(repo, "docs", "agents");
  for (const folder of ["gersom", "ana"]) {
    mkdirSync(join(agents, folder), { recursive: true });
    for (const file of ["handoff.md", "backlog.md", "history.md"]) {
      writeFileSync(join(agents, folder, file), requireFixture("es-anchors", file));
    }
  }
  writeFileSync(join(agents, "operators.md"), OPERATORS);
  writeFileSync(join(agents, "team-backlog.md"), TEAM_BACKLOG);

  hasGit = spawnSync("git", ["-C", repo, "init", "-q"]).status === 0;
  if (hasGit) spawnSync("git", ["-C", repo, "config", "user.email", "Ana@Mail.com"]);
});

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

/** Corre index.ts con los argumentos dados, sin datos de entrada y sin colores. */
async function run(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  const env: Record<string, string | undefined> = { ...process.env, NO_COLOR: "1", ACSUITE_HOME: home };
  delete env.INIT_CWD;
  delete env.npm_config_local_prefix;
  const proc = Bun.spawn([process.execPath, INDEX, ...args], { env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { stdout, stderr, code };
}

describe("index.ts en modo multi-operador", () => {
  test("sin operador: vista de equipo con EQUIPO, el operador del correo de git y SIN DUEÑO", async () => {
    const { stdout, code } = await run([repo, "--once"]);
    expect(code).toBe(0);
    const [title, location] = stdout.split("\n");
    expect(title).toBe("▣ EQUIPO");
    expect(location).toMatch(/^ {2}[A-Z0-9 ]+ {3}\S/); // nombre del proyecto y ruta, sin operador
    expect(location).not.toContain(" · ");
    expect(stdout).toContain("╭─ EQUIPO (3)");
    expect(stdout).toMatch(/luis\s+\(solo team-backlog\)/);
    expect(stdout).toContain("╭─ SIN DUEÑO (2)");
    expect(stdout).toContain("• Integrar la pasarela [dependencia]");
    expect(stdout).not.toContain("Ctrl+C");
    if (hasGit) expect(stdout).toContain("› ana (tú)");
  });

  test("con operador como segundo argumento: abre su panel, con SIN DUEÑO encima de BLOQUEADAS", async () => {
    const { stdout, code } = await run([repo, "ana", "--once"]);
    expect(code).toBe(0);
    const [title, location] = stdout.split("\n");
    expect(title).toBe("▣ TAREAS");
    expect(location).toMatch(/^ {2}[A-Z0-9 ]+ · ana {3}\S/);
    expect(stdout).not.toContain("EQUIPO (");
    expect(stdout).toContain("╭─ EN PROGRESO");
    expect(stdout.indexOf("╭─ SIN DUEÑO")).toBeLessThan(stdout.indexOf("╭─ BLOQUEADAS"));
    expect(stdout.indexOf("╭─ BLOQUEADAS")).toBeLessThan(stdout.indexOf("╭─ EN PROGRESO"));
    expect(stdout.indexOf("╭─ EN PROGRESO")).toBeLessThan(stdout.indexOf("─ history.md ─╮"));
  });

  test("--compact y --no-arrows: una sola tarea por recuadro y sin flechas, también en SIN DUEÑO", async () => {
    const { stdout, code } = await run([repo, "ana", "--once", "--compact", "--no-arrows"]);
    expect(code).toBe(0);
    expect(stdout).not.toMatch(/^ {3}[↑↓]/m);
    expect(stdout).toContain("• Integrar la pasarela [dependencia] · +1 más");
    expect(stdout).toContain("· +3 más");
    expect(stdout).toContain("Tarea 12 — Implementar el parser de anclas"); // en progreso no se compacta
  });

  test("--operator equivale al segundo argumento y no distingue mayúsculas", async () => {
    const { stdout, code } = await run([repo, "--operator", "GERSOM", "--once"]);
    expect(code).toBe(0);
    expect(stdout.split("\n")[1]).toMatch(/^ {2}[A-Z0-9 ]+ · gersom {3}\S/);
  });

  test("operador que no existe o sin carpeta: código 1 con la lista de operadores", async () => {
    for (const name of ["nadie", "luis"]) {
      const { stderr, code } = await run([repo, name, "--once"]);
      expect(code).toBe(1);
      expect(stderr).toContain("no figura con carpeta");
      expect(stderr).toContain("Operadores con carpeta: gersom, ana");
    }
  });

  test("la carpeta de un operador pasada como ruta abre su panel", async () => {
    const { stdout, code } = await run([join(repo, "docs", "agents", "ana"), "--once"]);
    expect(code).toBe(0);
    expect(stdout.split("\n")[1]).toMatch(/^ {2}[A-Z0-9 ]+ · ana {3}\S/);
  });
});
