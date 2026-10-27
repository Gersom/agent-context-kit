import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { configDir, loadSavedProjects, samePath, saveProject } from "../../src/io/user-config.ts";

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

  test("forma inválida (sin lista, versión desconocida o entradas que no son texto): lista vacía y aviso", () => {
    for (const data of [[], null, { version: 1 }, { version: 2, projects: [] }, { version: 1, projects: ["/a", 3] }, { projects: ["/a"] }]) {
      writeFileSync(file, JSON.stringify(data));
      const { paths, warning } = loadSavedProjects();
      expect(paths).toEqual([]);
      expect(warning).toContain(file);
      expect(warning).toContain("Se ignora");
    }
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

  test("archivo corrupto: lo copia a projects.json.bak antes de escribir uno nuevo", () => {
    writeFileSync(file, "{ esto no es json");
    expect(saveProject(A)).toBeNull();
    expect(readFileSync(`${file}.bak`, "utf8")).toBe("{ esto no es json");
    expect(loadSavedProjects()).toEqual({ paths: [A], warning: null });
  });

  test("archivo bueno: no se crea .bak", () => {
    saveProject(A);
    saveProject(B);
    expect(existsSync(`${file}.bak`)).toBe(false);
  });

  test("error de escritura (ACSUITE_HOME es un archivo): devuelve el mensaje y no lanza", () => {
    const blocker = join(root, "es-un-archivo");
    writeFileSync(blocker, "");
    process.env.ACSUITE_HOME = blocker;
    const error = saveProject(A);
    expect(typeof error).toBe("string");
    expect(error).toContain("projects.json");
  });

  test("el archivo es una carpeta (no se puede leer): devuelve el mensaje, sin pisarlo", () => {
    mkdirSync(file);
    const error = saveProject(A);
    expect(error).toContain(file);
    expect(readdirSync(home)).toEqual(["projects.json"]);
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
