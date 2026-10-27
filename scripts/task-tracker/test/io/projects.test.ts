import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultProjects, readProjectRows } from "../../src/io/projects.ts";
import { requireFixture } from "../../../_shared/test/helpers.ts";

const OPERATORS = `# Operadores

---

<!-- agent-context-skill:section=operators -->
## Lista

- gersom: gersom@mail.com
- ana: ana@mail.com
- luis (solo team-backlog): luis@mail.com
`;

let root: string;
let multi: string;
let flat: string;
let noDocs: string;
let hasGit = true;

/** Copia los archivos de un fixture a `dir`. */
function copyFixture(name: string, dir: string, files = ["handoff.md", "backlog.md", "history.md"]): void {
  mkdirSync(dir, { recursive: true });
  for (const file of files) writeFileSync(join(dir, file), requireFixture(name, file));
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "task-tracker-projects-"));

  // Multi-operador: ana tiene el fixture completo; gersom, el set mínimo (solo handoff.md).
  multi = join(root, "multi-app");
  const agents = join(multi, "docs", "agents");
  copyFixture("es-anchors", join(agents, "ana"));
  copyFixture("minimal", join(agents, "gersom"), ["handoff.md"]);
  writeFileSync(join(agents, "operators.md"), OPERATORS);
  hasGit = spawnSync("git", ["-C", multi, "init", "-q"]).status === 0;
  if (hasGit) spawnSync("git", ["-C", multi, "config", "user.email", "Ana@Mail.com"]);

  // Plano: un solo backlog en docs/agents.
  flat = join(root, "flat-app");
  copyFixture("es-anchors", join(flat, "docs", "agents"));

  noDocs = join(root, "sin-docs");
  mkdirSync(noDocs, { recursive: true });
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("readProjectRows", () => {
  test("repo multi: solo el operador del correo, con su tarea en curso y sus conteos", () => {
    const [row] = readProjectRows([multi], { email: "ana@mail.com" });
    expect(row).toEqual({
      name: "multi-app",
      path: multi,
      operator: "ana",
      work: { current: { label: "Tarea", number: 12, title: "Implementar el parser de anclas" }, counts: { free: 4, blocked: 2 } },
      warning: null,
    });
  });

  test("repo multi con otro operador: se lee su carpeta, no la de ana", () => {
    const [row] = readProjectRows([multi], { email: "gersom@mail.com" });
    expect(row).toMatchObject({ operator: "gersom", work: { current: null, counts: { free: 0, blocked: 0 } }, warning: null });
  });

  test("repo multi con correo no registrado o ilegible: sin operador y sin tarea ni conteos", () => {
    for (const email of ["otro@mail.com", "luis@mail.com", null]) {
      const [row] = readProjectRows([multi], { email });
      expect(row).toEqual({ name: "multi-app", path: multi, operator: null, work: null, warning: null });
    }
  });

  test("repo plano: sin operador, con la tarea y los conteos del único backlog", () => {
    const [row] = readProjectRows([flat], { email: "ana@mail.com" });
    expect(row).toEqual({
      name: "flat-app",
      path: flat,
      operator: null,
      work: { current: { label: "Tarea", number: 12, title: "Implementar el parser de anclas" }, counts: { free: 4, blocked: 2 } },
      warning: null,
    });
  });

  test("ruta inexistente o sin docs: fila con aviso, y el resto de la lista se lee igual", () => {
    const missing = join(root, "no-existe");
    const rows = readProjectRows([missing, flat, noDocs], { email: null });
    expect(rows.map((row) => row.path)).toEqual([missing, flat, noDocs]);
    expect(rows[0]).toEqual({ name: "no-existe", path: missing, operator: null, work: null, warning: `No existe la carpeta: ${missing}` });
    expect(rows[1].warning).toBeNull();
    expect(rows[2]).toMatchObject({ name: "sin-docs", work: null, warning: "No se encontró handoff.md en ninguna de estas carpetas" });
  });

  test("sin lista no hay filas", () => {
    expect(readProjectRows([])).toEqual([]);
  });

  test("sin pasar el correo, usa el de git de ese repo", () => {
    if (!hasGit) return;
    const [row] = readProjectRows([multi]);
    expect(row.operator).toBe("ana");
  });
});

describe("defaultProjects", () => {
  const KEYS = ["INIT_CWD", "npm_config_local_prefix"];
  const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  test("el repo de la carpeta de invocación, si tiene docs de la skill", () => {
    delete process.env.npm_config_local_prefix;
    process.env.INIT_CWD = flat;
    expect(defaultProjects()).toEqual([flat]);
  });

  test("sin docs de la skill ahí, la lista queda vacía", () => {
    delete process.env.npm_config_local_prefix;
    process.env.INIT_CWD = noDocs;
    expect(defaultProjects()).toEqual([]);
  });
});
