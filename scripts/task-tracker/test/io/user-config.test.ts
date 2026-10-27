import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { configDir, failureMessage, loadSavedProjects, removeProject, samePath, saveProject } from "../../src/io/user-config.ts";

// Rutas de prueba en su forma normal (en Windows llevan unidad y `\`).
const A = resolve("/a/repo");
const B = resolve("/b/repo");
const C = resolve("/c/repo");
const AU = resolve("/A/Repo");

const root = mkdtempSync(join(tmpdir(), "task-tracker-config-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const savedHome = process.env.ACSUITE_HOME;
let home: string;
let file: string;

beforeEach(() => {
  // Cada test con su propia carpeta de config: nunca la real.
  home = mkdtempSync(join(root, "home-"));
  file = join(home, "projects.json");
  process.env.ACSUITE_HOME = home;
});

/** Los respaldos de `projects.json` que hay en la carpeta de config del test. */
const backups = () => readdirSync(home).filter((name) => name.endsWith(".bak"));

afterEach(() => {
  if (savedHome === undefined) delete process.env.ACSUITE_HOME;
  else process.env.ACSUITE_HOME = savedHome;
});

describe("configDir", () => {
  test("ACSUITE_HOME si está definida; si no, .acsuite en el home del usuario", () => {
    expect(configDir()).toBe(home);
    delete process.env.ACSUITE_HOME;
    expect(configDir()).toBe(join(homedir(), ".acsuite"));
  });
});

describe("loadSavedProjects", () => {
  test("sin archivo: lista vacía y sin aviso", () => {
    expect(loadSavedProjects()).toEqual({ paths: [], warning: null });
  });

  test("archivo válido: las rutas en el orden guardado", () => {
    writeFileSync(file, JSON.stringify({ version: 1, projects: [B, A] }));
    expect(loadSavedProjects()).toEqual({ paths: [B, A], warning: null });
  });

  test("duplicados escritos a mano: se quedan una vez", () => {
    writeFileSync(file, JSON.stringify({ version: 1, projects: [A, B, A] }));
    expect(loadSavedProjects().paths).toEqual([A, B]);
  });

  test("JSON corrupto: lista vacía y un aviso que dice el archivo y que se ignora", () => {
    writeFileSync(file, "{ esto no es json");
    const { paths, warning } = loadSavedProjects();
    expect(paths).toEqual([]);
    expect(warning).toContain(file);
    expect(warning).toContain("Se ignora");
  });

  test("forma inválida (sin lista, projects que no es lista o versión desconocida): lista vacía y aviso", () => {
    for (const data of [[], null, { version: 1 }, { version: 1, projects: "/a" }, { version: 2, projects: [] }, { version: 2, projects: [A] }, { projects: [A] }]) {
      writeFileSync(file, JSON.stringify(data));
      const { paths, warning } = loadSavedProjects();
      expect(paths).toEqual([]);
      expect(warning).toContain(file);
      expect(warning).toContain("Se ignora");
    }
  });

  test("el aviso de un archivo corrupto anuncia el respaldo con sello al guardar", () => {
    writeFileSync(file, "{ esto no es json");
    expect(loadSavedProjects().warning).toContain("projects.json.<AAAAMMDD-HHMMSS>.bak");
    writeFileSync(file, JSON.stringify({ version: 2, projects: [] }));
    expect(loadSavedProjects().warning).toContain("projects.json.<AAAAMMDD-HHMMSS>.bak");
  });

  test("entradas que no son una ruta (no texto o vacías): se filtran, se conservan las buenas y el aviso dice cuántas", () => {
    writeFileSync(file, JSON.stringify({ version: 1, projects: [B, 3, "", A, null, { path: C }] }));
    const { paths, warning } = loadSavedProjects();
    expect(paths).toEqual([B, A]);
    expect(warning).toContain(file);
    expect(warning).toContain("se ignoraron 4 entradas");
    expect(warning).not.toContain("Se ignora.");
  });

  test("una sola entrada inválida: el aviso va en singular", () => {
    writeFileSync(file, JSON.stringify({ version: 1, projects: [A, 3] }));
    const { paths, warning } = loadSavedProjects();
    expect(paths).toEqual([A]);
    expect(warning).toContain("se ignoró 1 entrada que no es una ruta");
  });

  test("solo entradas inválidas: lista vacía, aviso de las ignoradas y sin tratar el archivo como corrupto", () => {
    writeFileSync(file, JSON.stringify({ version: 1, projects: [3, ""] }));
    const { paths, warning } = loadSavedProjects();
    expect(paths).toEqual([]);
    expect(warning).toContain("se ignoraron 2 entradas");
    expect(warning).not.toContain(".bak");
  });

  test("duplicados no cuentan como ignorados", () => {
    writeFileSync(file, JSON.stringify({ version: 1, projects: [A, A] }));
    expect(loadSavedProjects()).toEqual({ paths: [A], warning: null });
  });

  test("el archivo es una carpeta (no se puede leer): lista vacía y aviso, sin lanzar", () => {
    mkdirSync(file);
    const { paths, warning } = loadSavedProjects();
    expect(paths).toEqual([]);
    expect(warning).toContain(file);
  });
});

describe("saveProject", () => {
  test("crea la carpeta de config y el archivo con la forma esperada", () => {
    const nested = join(home, "nueva", "carpeta");
    process.env.ACSUITE_HOME = nested;
    expect(saveProject(A)).toBeNull();
    expect(JSON.parse(readFileSync(join(nested, "projects.json"), "utf8"))).toEqual({ version: 1, projects: [A] });
  });

  test("agrega al final, en orden de alta, y lo leído vuelve igual", () => {
    for (const path of [B, A, C]) expect(saveProject(path)).toBeNull();
    expect(loadSavedProjects()).toEqual({ paths: [B, A, C], warning: null });
  });

  test("no duplica una ruta que ya figura (sin distinguir mayúsculas solo en win32)", () => {
    expect(saveProject(A)).toBeNull();
    expect(saveProject(A)).toBeNull();
    expect(saveProject(AU)).toBeNull();
    const expected = process.platform === "win32" ? [A] : [A, AU];
    expect(loadSavedProjects().paths).toEqual(expected);
  });

  test("no deja archivos temporales", () => {
    saveProject(A);
    expect(readdirSync(home)).toEqual(["projects.json"]);
  });

  test("archivo corrupto: lo copia a projects.json.<AAAAMMDD-HHMMSS>.bak antes de escribir uno nuevo", () => {
    writeFileSync(file, "{ esto no es json");
    expect(saveProject(A)).toBeNull();
    expect(backups()).toHaveLength(1);
    expect(backups()[0]).toMatch(/^projects\.json\.\d{8}-\d{6}\.bak$/);
    expect(readFileSync(join(home, backups()[0]), "utf8")).toBe("{ esto no es json");
    expect(existsSync(`${file}.bak`)).toBe(false);
    expect(loadSavedProjects()).toEqual({ paths: [A], warning: null });
  });

  test("un segundo archivo corrupto no pisa el respaldo anterior", () => {
    writeFileSync(file, "primero");
    expect(saveProject(A)).toBeNull();
    writeFileSync(file, "segundo");
    expect(saveProject(B)).toBeNull();
    const found = backups();
    expect(found).toHaveLength(2);
    expect(found.map((name) => readFileSync(join(home, name), "utf8")).sort()).toEqual(["primero", "segundo"]);
    expect(loadSavedProjects().paths).toEqual([B]);
  });

  test("también respalda un archivo con otra versión o sin lista de proyectos", () => {
    writeFileSync(file, JSON.stringify({ version: 2, projects: [B] }));
    expect(saveProject(A)).toBeNull();
    expect(backups()).toHaveLength(1);
    expect(JSON.parse(readFileSync(join(home, backups()[0]), "utf8"))).toEqual({ version: 2, projects: [B] });
  });

  test("archivo bueno: no se crea respaldo", () => {
    saveProject(A);
    saveProject(B);
    expect(backups()).toEqual([]);
  });

  test("archivo con entradas inválidas: se respalda tal cual con sello y se reescribe con las buenas", () => {
    const text = JSON.stringify({ version: 1, projects: [B, 3] });
    writeFileSync(file, text);
    expect(saveProject(A)).toBeNull();
    expect(backups()).toHaveLength(1);
    expect(backups()[0]).toMatch(/^projects\.json\.\d{8}-\d{6}\.bak$/);
    expect(readFileSync(join(home, backups()[0]), "utf8")).toBe(text);
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({ version: 1, projects: [B, A] });
  });

  test("entradas inválidas y la ruta ya figura: no se escribe, así que no hay respaldo", () => {
    const text = JSON.stringify({ version: 1, projects: [A, 3] });
    writeFileSync(file, text);
    expect(saveProject(A)).toBeNull();
    expect(backups()).toEqual([]);
    expect(readFileSync(file, "utf8")).toBe(text);
  });

  test("dos reescrituras de archivos con entradas inválidas no pisan el respaldo anterior", () => {
    writeFileSync(file, JSON.stringify({ version: 1, projects: [3] }));
    expect(saveProject(A)).toBeNull();
    writeFileSync(file, JSON.stringify({ version: 1, projects: [A, ""] }));
    expect(saveProject(B)).toBeNull();
    expect(backups()).toHaveLength(2);
  });

  test("error de escritura (ACSUITE_HOME es un archivo): devuelve causa y archivo, y no lanza", () => {
    const blocker = join(root, "es-un-archivo");
    writeFileSync(blocker, "");
    process.env.ACSUITE_HOME = blocker;
    const error = saveProject(A);
    expect(typeof error?.cause).toBe("string");
    expect(error?.cause).not.toBe("");
    expect(error?.file).toBe(join(blocker, "projects.json"));
  });

  test("el archivo es una carpeta (no se puede leer): devuelve causa y archivo, sin pisarlo", () => {
    mkdirSync(file);
    const error = saveProject(A);
    expect(error).toEqual({ cause: "no se pudo leer, así que no se sobrescribe", file });
    expect(readdirSync(home)).toEqual(["projects.json"]);
  });
});

describe("failureMessage", () => {
  test("«No se pudo <acción> «<nombre>»: <causa>. Archivo: <ruta>», con la ruta al final", () => {
    expect(failureMessage("guardar", "mi-app", { cause: "disco lleno", file })).toBe(`No se pudo guardar «mi-app»: disco lleno. Archivo: ${file}`);
    expect(failureMessage("quitar", "mi-app", { cause: "disco lleno", file })).toBe(`No se pudo quitar «mi-app»: disco lleno. Archivo: ${file}`);
  });
});

describe("removeProject", () => {
  test("quita la ruta y las demás conservan su orden", () => {
    writeFileSync(file, JSON.stringify({ version: 1, projects: [B, A, C] }));
    expect(removeProject(A)).toBeNull();
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({ version: 1, projects: [B, C] });
    expect(loadSavedProjects()).toEqual({ paths: [B, C], warning: null });
  });

  test("quitar la última deja una lista válida y vacía", () => {
    expect(saveProject(A)).toBeNull();
    expect(removeProject(A)).toBeNull();
    expect(loadSavedProjects()).toEqual({ paths: [], warning: null });
  });

  test("una ruta que no figura: no toca el archivo", () => {
    const text = JSON.stringify({ version: 1, projects: [A, B] });
    writeFileSync(file, text);
    expect(removeProject(C)).toBeNull();
    expect(readFileSync(file, "utf8")).toBe(text);
  });

  test("sin archivo: no lo crea ni crea la carpeta de config", () => {
    const nested = join(home, "nueva");
    process.env.ACSUITE_HOME = nested;
    expect(removeProject(A)).toBeNull();
    expect(existsSync(nested)).toBe(false);
  });

  test("no deja archivos temporales", () => {
    saveProject(A);
    saveProject(B);
    removeProject(A);
    expect(readdirSync(home)).toEqual(["projects.json"]);
  });

  test("archivo corrupto: no figura nada que quitar, así que no se toca ni se crea respaldo", () => {
    writeFileSync(file, "{ esto no es json");
    expect(removeProject(A)).toBeNull();
    expect(readFileSync(file, "utf8")).toBe("{ esto no es json");
    expect(backups()).toEqual([]);
  });

  test("archivo con entradas inválidas: se respalda tal cual, quita la ruta y las buenas conservan su orden", () => {
    const text = JSON.stringify({ version: 1, projects: [B, 3, A, C] });
    writeFileSync(file, text);
    expect(removeProject(A)).toBeNull();
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({ version: 1, projects: [B, C] });
    expect(backups()).toHaveLength(1);
    expect(backups()[0]).toMatch(/^projects\.json\.\d{8}-\d{6}\.bak$/);
    expect(readFileSync(join(home, backups()[0]), "utf8")).toBe(text);
  });

  test("entradas inválidas y la ruta no figura: no se escribe, así que no hay respaldo", () => {
    const text = JSON.stringify({ version: 1, projects: [B, 3] });
    writeFileSync(file, text);
    expect(removeProject(C)).toBeNull();
    expect(backups()).toEqual([]);
    expect(readFileSync(file, "utf8")).toBe(text);
  });

  test("archivo bueno: quitar no crea respaldo", () => {
    writeFileSync(file, JSON.stringify({ version: 1, projects: [A, B] }));
    expect(removeProject(A)).toBeNull();
    expect(backups()).toEqual([]);
  });

  test("el archivo es una carpeta (no se puede leer): devuelve causa y archivo, sin pisarlo", () => {
    mkdirSync(file);
    const error = removeProject(A);
    expect(error).toEqual({ cause: "no se pudo leer, así que no se sobrescribe", file });
    expect(readdirSync(home)).toEqual(["projects.json"]);
  });

  test("ACSUITE_HOME es un archivo: no lanza ni lo pisa (según el sistema, no hay lista o no se puede leer)", () => {
    const blocker = join(root, "es-un-archivo-2");
    writeFileSync(blocker, "");
    process.env.ACSUITE_HOME = blocker;
    const error = removeProject(A);
    if (error !== null) expect(error.file).toBe(join(blocker, "projects.json"));
    expect(readFileSync(blocker, "utf8")).toBe("");
  });

  test("rutas equivalentes (barras distintas, barra final): quita la misma ruta", () => {
    const a = join(root, "repo-d");
    writeFileSync(file, JSON.stringify({ version: 1, projects: [a, B] }));
    expect(removeProject(`${a.split("\\").join("/")}/`)).toBeNull();
    expect(loadSavedProjects().paths).toEqual([B]);
  });

  test("sin distinguir mayúsculas solo en win32", () => {
    writeFileSync(file, JSON.stringify({ version: 1, projects: [A, B] }));
    expect(removeProject(AU)).toBeNull();
    expect(loadSavedProjects().paths).toEqual(process.platform === "win32" ? [B] : [A, B]);
  });
});

describe("lectura con BOM y ACSUITE_HOME relativa", () => {
  test("un projects.json con BOM UTF-8 se lee igual", () => {
    writeFileSync(file, `﻿${JSON.stringify({ version: 1, projects: [A] })}`);
    expect(loadSavedProjects()).toEqual({ paths: [A], warning: null });
  });

  test("ACSUITE_HOME relativa se vuelve absoluta", () => {
    process.env.ACSUITE_HOME = "config-relativa";
    expect(isAbsolute(configDir())).toBe(true);
  });
});

describe("rutas equivalentes", () => {
  test("barras distintas y barra final son la misma ruta: no se duplica y se lee normalizada", () => {
    const a = join(root, "repo-a");
    writeFileSync(file, JSON.stringify({ version: 1, projects: [`${a.split("\\").join("/")}/`, a] }));
    expect(loadSavedProjects().paths).toEqual([a]);
    expect(saveProject(`${a}/`)).toBeNull();
    expect(saveProject(a.split("\\").join("/"))).toBeNull();
    expect(loadSavedProjects().paths).toEqual([a]);
  });

  test("samePath compara con las barras unificadas", () => {
    const a = join(root, "repo-b");
    expect(samePath(a, `${a.split("\\").join("/")}/`)).toBe(true);
    expect(samePath(a, join(root, "repo-c"))).toBe(false);
  });
});
