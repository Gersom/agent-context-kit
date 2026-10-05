import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanPathInput, invocationDir, projectNameFor, resolveAgentsDir } from "../../src/io/paths.js";

let root;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "task-tracker-"));
  mkdirSync(join(root, "mi-app", "docs", "agents"), { recursive: true });
  writeFileSync(join(root, "mi-app", "docs", "agents", "handoff.md"), "# Handoff\r\n\r\nx\r\n");
  mkdirSync(join(root, "otra", "agent-context", "agents"), { recursive: true });
  writeFileSync(join(root, "otra", "agent-context", "agents", "handoff.md"), "# Handoff\n");
  mkdirSync(join(root, "vacia"));
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("resolveAgentsDir", () => {
  test("acepta la raíz del proyecto y busca docs/agents", () => {
    const result = resolveAgentsDir(join(root, "mi-app"));
    expect(result.ok).toBe(true);
    expect(result.agentsDir).toBe(join(root, "mi-app", "docs", "agents"));
    expect(result.projectName).toBe("mi-app");
  });

  test("acepta la carpeta directa, relativa a la base y con comillas", () => {
    const result = resolveAgentsDir(`"${join("mi-app", "docs", "agents")}"`, root);
    expect(result.ok).toBe(true);
    expect(result.projectName).toBe("mi-app");
  });

  test("busca también agent-context/agents", () => {
    expect(resolveAgentsDir(join(root, "otra")).agentsDir).toBe(join(root, "otra", "agent-context", "agents"));
  });

  test("carpeta sin handoff.md lista dónde buscó", () => {
    const result = resolveAgentsDir(join(root, "vacia"));
    expect(result.ok).toBe(false);
    expect(result.tried).toHaveLength(3);
  });

  test("carpeta inexistente o ruta vacía", () => {
    expect(resolveAgentsDir(join(root, "no-existe")).ok).toBe(false);
    expect(resolveAgentsDir("   ").ok).toBe(false);
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
});

describe("invocationDir", () => {
  const KEYS = ["INIT_CWD", "npm_config_local_prefix"];
  let saved;

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
