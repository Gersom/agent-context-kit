import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanPathInput, invocationDir, projectDirFor, projectNameFor, resolveAgentsDir } from "../../src/io/paths.ts";
import type { ResolveError, ResolveOk, ResolveResult } from "../../src/shared/types.ts";

/** Afirma que la ruta se resolvió bien y lo deja tipado como tal. */
function expectOk(result: ResolveResult): ResolveOk {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
  return result;
}

/** Afirma que la ruta no se pudo resolver y lo deja tipado como tal. */
function expectError(result: ResolveResult): ResolveError {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error(`Se esperaba un error y se resolvió ${result.agentsDir}`);
  return result;
}

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "task-tracker-"));
  mkdirSync(join(root, "mi-app", "docs", "agents"), { recursive: true });
  writeFileSync(join(root, "mi-app", "docs", "agents", "handoff.md"), "# Handoff\r\n\r\nx\r\n");
  mkdirSync(join(root, "otra", "agent-context", "agents"), { recursive: true });
  writeFileSync(join(root, "otra", "agent-context", "agents", "handoff.md"), "# Handoff\n");
  mkdirSync(join(root, "vacia"));

  // Modo multi-operador: operators.md y una carpeta por operador.
  const multi = join(root, "multi-app", "docs", "agents");
  mkdirSync(join(multi, "ana"), { recursive: true });
  writeFileSync(
    join(multi, "operators.md"),
    "# Operadores\n\n<!-- agent-context-kit:section=operators -->\n## Lista\n\n- ana: ana@mail.com\n- luis (solo team-backlog): luis@mail.com\n",
  );
  writeFileSync(join(multi, "ana", "handoff.md"), "# Handoff\n");
  // Carpetas de operador sin operators.md: estado inconsistente.
  mkdirSync(join(root, "rota", "docs", "agents", "ana"), { recursive: true });
  writeFileSync(join(root, "rota", "docs", "agents", "ana", "handoff.md"), "# Handoff\n");
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("resolveAgentsDir", () => {
  test("acepta la raíz del proyecto y busca docs/agents", () => {
    const result = expectOk(resolveAgentsDir(join(root, "mi-app")));
    expect(result.agentsDir).toBe(join(root, "mi-app", "docs", "agents"));
    expect(result.projectDir).toBe(join(root, "mi-app"));
    expect(result.projectName).toBe("mi-app");
  });

  test("acepta la carpeta directa, relativa a la base y con comillas", () => {
    const result = expectOk(resolveAgentsDir(`"${join("mi-app", "docs", "agents")}"`, root));
    expect(result.projectName).toBe("mi-app");
  });

  test("busca también agent-context/agents", () => {
    expect(expectOk(resolveAgentsDir(join(root, "otra"))).agentsDir).toBe(join(root, "otra", "agent-context", "agents"));
  });

  test("carpeta sin handoff.md lista dónde buscó", () => {
    const result = expectError(resolveAgentsDir(join(root, "vacia")));
    expect(result.tried).toHaveLength(3);
  });

  test("carpeta inexistente o ruta vacía", () => {
    expect(resolveAgentsDir(join(root, "no-existe")).ok).toBe(false);
    expect(resolveAgentsDir("   ").ok).toBe(false);
  });
});

describe("resolveAgentsDir en modo multi-operador", () => {
  const multi = () => join(root, "multi-app");

  test("detecta operators.md: vigila la raíz de agentes (vista de equipo) y deja al operador del correo como preferido", () => {
    const result = expectOk(resolveAgentsDir(multi(), undefined, { email: "Ana@Mail.com" }));
    expect(result.agentsDir).toBe(join(multi(), "docs", "agents"));
    expect(result.multi).toEqual({ preferred: "ana" });
    expect(result.projectName).toBe("multi-app");
    expect(result.projectDir).toBe(multi());
  });

  test("un correo que no figura (o figura sin carpeta) no es un error: solo no hay preferido", () => {
    expect(expectOk(resolveAgentsDir(multi(), undefined, { email: "otra@mail.com" })).multi).toEqual({ preferred: null });
    expect(expectOk(resolveAgentsDir(multi(), undefined, { email: "luis@mail.com" })).multi).toEqual({ preferred: null });
    expect(expectOk(resolveAgentsDir(multi(), undefined, { email: null })).multi).toEqual({ preferred: null });
  });

  test("el operador pedido abre su panel de frente, sin mirar el correo", () => {
    const result = expectOk(resolveAgentsDir(multi(), undefined, { operator: "ANA", email: null }));
    expect(result.multi).toEqual({ preferred: null, operator: "ana" });
  });

  test("un operador que no figura con carpeta es un error que lista los que sí", () => {
    const unknown = expectError(resolveAgentsDir(multi(), undefined, { operator: "nadie", email: null }));
    expect(unknown.error).toContain("«nadie» no figura con carpeta");
    expect(unknown.error).toContain("Operadores con carpeta: ana");
    expect(expectError(resolveAgentsDir(multi(), undefined, { operator: "luis", email: null })).error).toContain("no figura con carpeta");
  });

  test("la carpeta de un operador pasada directamente abre su panel", () => {
    const result = expectOk(resolveAgentsDir(join(multi(), "docs", "agents", "ana"), undefined, { email: null }));
    expect(result.agentsDir).toBe(join(multi(), "docs", "agents"));
    expect(result.multi).toEqual({ preferred: null, operator: "ana" });
    expect(result.projectName).toBe("multi-app");
  });

  test("carpetas de operador sin operators.md: avisa en vez de asumir modo plano", () => {
    const result = expectError(resolveAgentsDir(join(root, "rota")));
    expect(result.error).toContain("falta operators.md");
    expect(result.error).toContain("ana");
  });
});

describe("helpers de rutas", () => {
  test("cleanPathInput quita comillas y espacios", () => {
    expect(cleanPathInput(`  '"D:\\a b"'  `)).toBe("D:\\a b");
  });

  test("projectNameFor usa la carpeta que contiene docs/agents", () => {
    expect(projectNameFor(join("x", "proy", "docs", "agents"))).toBe("proy");
    expect(projectNameFor(join("x", "suelta"))).toBe("suelta");
  });

  test("projectDirFor: la raíz del repo, o la carpeta vigilada si no sigue la estructura", () => {
    expect(projectDirFor(join("x", "proy", "docs", "agents"))).toBe(join("x", "proy"));
    expect(projectDirFor(join("x", "otra", "agent-context", "agents"))).toBe(join("x", "otra"));
    expect(projectDirFor(join("x", "suelta"))).toBe(join("x", "suelta"));
  });
});

describe("invocationDir", () => {
  const KEYS = ["INIT_CWD", "npm_config_local_prefix"];
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  test("precedencia: INIT_CWD > npm_config_local_prefix > cwd", () => {
    process.env.INIT_CWD = "/desde-init";
    process.env.npm_config_local_prefix = "/desde-prefix";
    expect(invocationDir()).toBe("/desde-init");

    delete process.env.INIT_CWD;
    expect(invocationDir()).toBe("/desde-prefix");

    delete process.env.npm_config_local_prefix;
    expect(invocationDir()).toBe(process.cwd());
  });
});
