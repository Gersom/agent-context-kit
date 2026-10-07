import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gitEmail, isMultiDir, operatorFolders, resolveOperator } from "../../src/io/operator.ts";

const OPERATORS = `# Operadores

- Reglas de ejemplo.

---

<!-- agent-context-kit:section=operators -->
## Lista

- gersom: Gersom@Mail.com, g@work.com
- ana: ana@mail.com
- luis (solo team-backlog): luis@mail.com
- fantasma: fantasma@mail.com
`;

let root: string;
const repoDir = () => root;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "task-tracker-op-"));
  writeFileSync(join(root, "operators.md"), OPERATORS);
  for (const folder of ["gersom", "ana"]) {
    mkdirSync(join(root, folder));
    writeFileSync(join(root, folder, "handoff.md"), "# Handoff\n");
  }
  mkdirSync(join(root, "fantasma")); // en operators.md, pero sin handoff.md
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("resolveOperator", () => {
  test("encuentra la carpeta por correo, sin distinguir mayúsculas y con varios correos", () => {
    expect(resolveOperator(root, { email: "GERSOM@mail.com", repoDir: repoDir() })).toEqual({ ok: true, folder: "gersom" });
    expect(resolveOperator(root, { email: "g@work.com", repoDir: repoDir() })).toEqual({ ok: true, folder: "gersom" });
  });

  test("correo que no figura: motivo y carpetas entre las que elegir", () => {
    const result = resolveOperator(root, { email: "otra@mail.com", repoDir: repoDir() });
    expect(result).toMatchObject({ ok: false, choices: ["gersom", "ana", "fantasma"] });
    expect(result.ok ? "" : result.error).toContain("otra@mail.com no figura");
  });

  test("operador «solo team-backlog»: no tiene carpeta propia", () => {
    const result = resolveOperator(root, { email: "luis@mail.com", repoDir: repoDir() });
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toContain("solo team-backlog");
  });

  test("sin correo disponible", () => {
    const result = resolveOperator(root, { email: null, repoDir: repoDir() });
    expect(result.ok ? "" : result.error).toContain("git config user.email");
  });

  test("--operator gana sobre el correo y no distingue mayúsculas", () => {
    expect(resolveOperator(root, { operator: "ANA", email: "gersom@mail.com", repoDir: repoDir() })).toEqual({ ok: true, folder: "ana" });
  });

  test("--operator desconocido, sin carpeta (luis) o con carpeta sin handoff.md", () => {
    expect(resolveOperator(root, { operator: "nadie", repoDir: repoDir() }).ok).toBe(false);
    expect(resolveOperator(root, { operator: "luis", repoDir: repoDir() }).ok).toBe(false);
    const ghost = resolveOperator(root, { operator: "fantasma", repoDir: repoDir() });
    expect(ghost.ok ? "" : ghost.error).toContain("no existe o no tiene handoff.md");
  });
});

describe("helpers de modo multi-operador", () => {
  test("isMultiDir y operatorFolders", () => {
    expect(isMultiDir(root)).toBe(true);
    expect(isMultiDir(join(root, "ana"))).toBe(false);
    expect(operatorFolders(root)).toEqual(["ana", "gersom"]);
    expect(operatorFolders(join(root, "no-existe"))).toEqual([]);
  });

  test("gitEmail devuelve null con una carpeta inexistente", () => {
    expect(gitEmail(join(root, "no-existe"))).toBeNull();
  });

  test("gitEmail lee el correo configurado en el repo, en minúsculas", () => {
    const repo = join(root, "repo-git");
    mkdirSync(repo);
    const git = (...args: string[]) => spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
    if (git("init", "-q").status !== 0) return; // sin git instalado, no hay nada que probar
    git("config", "user.email", "Dev@Mail.COM");
    expect(gitEmail(repo)).toBe("dev@mail.com");
  });
});
