import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createProjectList, defaultProjects, isDubiousOwnership, readProjectRows } from "../../src/io/projects.ts";
import { removeProject } from "../../src/io/user-config.ts";
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
// Archivo de config que citan los avisos de guardado y de quitar (no se escribe nada ahí).
const configFile = join(resolve("/cfg"), "projects.json");

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
  const KEYS = ["INIT_CWD", "npm_config_local_prefix", "ACSUITE_HOME"];
  const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  let home: string;
  beforeEach(() => {
    // Nunca la carpeta de config real: cada test con la suya, vacía.
    home = mkdtempSync(join(root, "home-"));
    process.env.ACSUITE_HOME = home;
  });
  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  test("sin archivo guardado, la lista queda vacía y sin aviso, aunque la carpeta de invocación tenga docs", () => {
    delete process.env.npm_config_local_prefix;
    process.env.INIT_CWD = flat;
    expect(defaultProjects()).toEqual([]);
    expect(defaultProjects.warning?.()).toBeNull();
  });

  test("los repos del archivo guardado, en su orden (también el que ya no existe: sale como fila con aviso)", () => {
    const gone = join(root, "ya-no-existe");
    writeFileSync(join(home, "projects.json"), JSON.stringify({ version: 1, projects: [multi, gone, flat] }));
    expect(defaultProjects()).toEqual([multi, gone, flat]);
    expect(defaultProjects.warning?.()).toBeNull();
    expect(readProjectRows(defaultProjects(), { email: null }).map((row) => [row.path, row.warning === null])).toEqual([
      [multi, true],
      [gone, false],
      [flat, true],
    ]);
  });

  test("archivo corrupto: lista vacía y el aviso de lectura", () => {
    const file = join(home, "projects.json");
    writeFileSync(file, "no es json");
    expect(defaultProjects()).toEqual([]);
    expect(defaultProjects.warning?.()).toContain(file);
  });
});

describe("createProjectList", () => {
  test("agrega la raíz del repo, también si se da una subcarpeta o se escribe entre comillas", () => {
    if (!hasGit) return;
    for (const input of [multi, join(multi, "docs", "agents", "ana"), `"${multi}"`]) {
      const projects = createProjectList(() => []);
      expect(projects.add(input)).toEqual({ ok: true, path: multi, added: true });
      expect(projects.list()).toEqual([multi]);
    }
  });

  test("una ruta que ya figura (del proveedor o agregada antes) no se duplica", () => {
    if (!hasGit) return;
    const projects = createProjectList(() => [multi]);
    expect(projects.add(multi)).toEqual({ ok: true, path: multi, added: false });
    expect(projects.list()).toEqual([multi]);
    expect(createProjectList(() => []).add(multi)).toMatchObject({ added: true });
  });

  test("el repo agregado se suma al final de los del proveedor", () => {
    const projects = createProjectList(() => [flat]);
    expect(projects.add(flat)).toMatchObject({ ok: true, added: false });
    if (hasGit) {
      projects.add(multi);
      expect(projects.list()).toEqual([flat, multi]);
    }
  });

  test("con `save`: se llama al agregar una ruta nueva, con la raíz del repo, y no hay aviso si guarda bien", () => {
    if (!hasGit) return;
    const saved: string[] = [];
    const projects = createProjectList(() => [], { save: (path) => (saved.push(path), null) });
    expect(projects.add(join(multi, "docs", "agents", "ana"))).toEqual({ ok: true, path: multi, added: true });
    expect(saved).toEqual([multi]);
    // Una ruta que ya figuraba no se vuelve a guardar.
    expect(projects.add(multi)).toEqual({ ok: true, path: multi, added: false });
    expect(createProjectList(() => [flat], { save: (path) => (saved.push(path), null) }).add(flat)).toMatchObject({ added: false });
    expect(saved).toEqual([multi]);
  });

  test("con `save` que falla: el repo queda en la lista de la sesión y el resultado lleva el aviso con el nombre, la causa y el archivo al final", () => {
    if (!hasGit) return;
    const projects = createProjectList(() => [], { save: () => ({ cause: "disco lleno", file: configFile }) });
    expect(projects.add(multi)).toEqual({ ok: true, path: multi, added: true, warning: `No se pudo guardar «multi-app»: disco lleno. Archivo: ${configFile}` });
    expect(projects.list()).toEqual([multi]);
  });

  test("con `save`, una ruta inválida no se guarda", () => {
    const saved: string[] = [];
    const projects = createProjectList(() => [], { save: (path) => (saved.push(path), null) });
    expect(projects.add(noDocs)).toMatchObject({ ok: false });
    expect(saved).toEqual([]);
  });

  test("quitar una ruta del proveedor: sale de la lista aunque el proveedor la siga dando, y las demás conservan el orden", () => {
    const projects = createProjectList(() => [flat, multi, noDocs]);
    expect(projects.remove(multi)).toBeNull();
    expect(projects.list()).toEqual([flat, noDocs]);
  });

  test("quitar una ruta agregada en esta sesión", () => {
    if (!hasGit) return;
    const projects = createProjectList(() => [flat]);
    projects.add(multi);
    expect(projects.remove(multi)).toBeNull();
    expect(projects.list()).toEqual([flat]);
  });

  test("con `remove`: se llama con la ruta; si va bien, la lista cambia", () => {
    const removed: string[] = [];
    const projects = createProjectList(() => [flat, multi], { remove: (path) => (removed.push(path), null) });
    expect(projects.remove(flat)).toBeNull();
    expect(removed).toEqual([flat]);
    expect(projects.list()).toEqual([multi]);
  });

  test("con `remove` que falla: devuelve el aviso con el nombre, la causa y el archivo al final, y la lista queda como estaba", () => {
    const projects = createProjectList(() => [flat, multi], { remove: () => ({ cause: "disco lleno", file: configFile }) });
    expect(projects.remove(flat)).toBe(`No se pudo quitar «flat-app»: disco lleno. Archivo: ${configFile}`);
    expect(projects.list()).toEqual([flat, multi]);
  });

  test("rutas equivalentes (otras barras, barra final): se quita la misma", () => {
    const projects = createProjectList(() => [flat, multi]);
    expect(projects.remove(`${flat.split("\\").join("/")}/`)).toBeNull();
    expect(projects.list()).toEqual([multi]);
  });

  test("`add` de una ruta quitada la vuelve a admitir, y se vuelve a guardar", () => {
    if (!hasGit) return;
    const saved: string[] = [];
    const projects = createProjectList(() => [multi], { save: (path) => (saved.push(path), null), remove: () => null });
    expect(projects.remove(multi)).toBeNull();
    expect(projects.list()).toEqual([]);
    expect(projects.add(multi)).toEqual({ ok: true, path: multi, added: true });
    expect(saved).toEqual([multi]);
    expect(projects.list()).toEqual([multi]);
  });

  test("con el guardado real: quitar y volver a leer el archivo no la devuelve", () => {
    const saved = mkdtempSync(join(root, "home-"));
    const previous = process.env.ACSUITE_HOME;
    process.env.ACSUITE_HOME = saved;
    try {
      writeFileSync(join(saved, "projects.json"), JSON.stringify({ version: 1, projects: [flat, multi] }));
      const projects = createProjectList(defaultProjects, { remove: removeProject });
      expect(projects.remove(flat)).toBeNull();
      expect(projects.list()).toEqual([multi]);
      expect(defaultProjects()).toEqual([multi]);
    } finally {
      if (previous === undefined) delete process.env.ACSUITE_HOME;
      else process.env.ACSUITE_HOME = previous;
    }
  });

  test("errores: vacía, inexistente y sin documentación de la skill; la lista no cambia", () => {
    const projects = createProjectList(() => []);
    expect(projects.add("   ")).toEqual({ ok: false, error: "Escribe la ruta de la carpeta del repo." });
    const missing = projects.add(join(root, "no-existe"));
    expect(missing).toMatchObject({ ok: false });
    expect(missing.ok ? "" : missing.error).toContain("No existe la carpeta");
    expect(projects.add(noDocs)).toMatchObject({ ok: false });
    expect(projects.list()).toEqual([]);
  });

  test("un ~ inicial (con / o con barra invertida) se expande al home antes de resolver", () => {
    const back = String.fromCharCode(92);
    const name = "acsuite-test-no-existe";
    const target = join(homedir(), name);
    for (const input of [`~/${name}`, `~${back}${name}`]) {
      expect(createProjectList(() => []).add(input)).toEqual({ ok: false, error: `No existe la carpeta: ${target}` });
    }
    // La prueba no crea nada en el home: la carpeta tiene que seguir sin existir.
    expect(existsSync(target)).toBe(false);
  });

  test("una ruta que es un archivo: «es un archivo, no una carpeta» y no se guarda", () => {
    const file = join(root, "un-archivo.txt");
    writeFileSync(file, "hola");
    const saved: string[] = [];
    const projects = createProjectList(() => [], { save: (path) => (saved.push(path), null) });
    expect(projects.add(file)).toEqual({ ok: false, error: `${file} es un archivo, no una carpeta.` });
    expect(projects.add(`"${file}"`)).toEqual({ ok: false, error: `${file} es un archivo, no una carpeta.` });
    expect(saved).toEqual([]);
    expect(projects.list()).toEqual([]);
  });

  test("sin la nota de dueño ajeno cuando git falla por otra causa, no es un repo o la carpeta no existe", () => {
    if (!hasGit) return;
    const note = "es de otro usuario";
    // Un `.git` que no es un repo válido: git responde «invalid gitfile format», no «dubious ownership».
    const broken = join(root, "git-roto");
    mkdirSync(broken, { recursive: true });
    writeFileSync(join(broken, ".git"), "esto no es un gitfile");
    const projects = createProjectList(() => []);
    const failed = projects.add(broken);
    expect(failed.ok).toBe(false);
    expect(failed.ok ? "" : failed.error).toContain("No se encontró handoff.md en ninguna de estas carpetas");
    expect(failed.ok ? "" : failed.error).not.toContain(note);
    const plain = projects.add(noDocs);
    expect(plain.ok ? "" : plain.error).not.toContain(note);
    const missing = projects.add(join(root, "no-existe"));
    expect(missing.ok ? "" : missing.error).not.toContain(note);
  });
});

describe("isDubiousOwnership", () => {
  test("reconoce el rechazo de git por el dueño de la carpeta, sin importar mayúsculas ni espacios", () => {
    const real = "fatal: detected dubious ownership in repository at 'X'";
    expect(isDubiousOwnership(real)).toBe(true);
    expect(isDubiousOwnership(real.toUpperCase())).toBe(true);
    expect(isDubiousOwnership("fatal: Dubious   Ownership in repository")).toBe(true);
    expect(isDubiousOwnership(`${real}${String.fromCharCode(10)}To add an exception for this directory, call:`)).toBe(true);
  });

  test("cualquier otro fallo de git no cuenta", () => {
    for (const text of ["", "fatal: not a git repository (or any of the parent directories): .git", "fatal: invalid gitfile format: .git", "fatal: unsafe repository"]) {
      expect(isDubiousOwnership(text)).toBe(false);
    }
  });
});
