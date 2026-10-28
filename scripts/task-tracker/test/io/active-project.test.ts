import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ACTIVE_PROJECT_FILE, activeProjectPath, clearActiveProject, parseActiveProject, readActiveProject } from "../../src/io/active-project.ts";

const AT = "2026-10-27T10:00:00.000Z";
const AT_MS = Date.parse(AT);

const root = mkdtempSync(join(tmpdir(), "task-tracker-active-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const savedHome = process.env.ACSUITE_HOME;
let home: string;
let file: string;

beforeEach(() => {
  // Cada test con su propia carpeta de config: nunca la real.
  home = mkdtempSync(join(root, "home-"));
  file = join(home, ACTIVE_PROJECT_FILE);
  process.env.ACSUITE_HOME = home;
});

afterEach(() => {
  if (savedHome === undefined) delete process.env.ACSUITE_HOME;
  else process.env.ACSUITE_HOME = savedHome;
});

describe("parseActiveProject", () => {
  test("archivo válido: la ruta y la fecha en ms", () => {
    expect(parseActiveProject(JSON.stringify({ path: "D:\\repo", at: AT }))).toEqual({ path: "D:\\repo", at: AT_MS });
  });

  test("con BOM al inicio", () => {
    expect(parseActiveProject(`\uFEFF${JSON.stringify({ path: "/repo", at: AT })}`)).toEqual({ path: "/repo", at: AT_MS });
  });

  test("campos de más se ignoran", () => {
    expect(parseActiveProject(JSON.stringify({ path: "/repo", at: AT, extra: 1 }))).toEqual({ path: "/repo", at: AT_MS });
  });

  test("texto vacío o JSON cortado: null", () => {
    expect(parseActiveProject("")).toBeNull();
    expect(parseActiveProject("   ")).toBeNull();
    expect(parseActiveProject(`{ "path": "/repo", "at": "${AT}`)).toBeNull();
  });

  test("path ausente, vacío, en blanco o que no es texto: null", () => {
    expect(parseActiveProject(JSON.stringify({ at: AT }))).toBeNull();
    expect(parseActiveProject(JSON.stringify({ path: "", at: AT }))).toBeNull();
    expect(parseActiveProject(JSON.stringify({ path: "   ", at: AT }))).toBeNull();
    expect(parseActiveProject(JSON.stringify({ path: 5, at: AT }))).toBeNull();
  });

  test("at ausente, inválido o que no es texto: null", () => {
    expect(parseActiveProject(JSON.stringify({ path: "/repo" }))).toBeNull();
    expect(parseActiveProject(JSON.stringify({ path: "/repo", at: "ayer" }))).toBeNull();
    expect(parseActiveProject(JSON.stringify({ path: "/repo", at: "" }))).toBeNull();
    expect(parseActiveProject(JSON.stringify({ path: "/repo", at: AT_MS }))).toBeNull();
  });

  test("lo que no es un objeto: null", () => {
    expect(parseActiveProject("[]")).toBeNull();
    expect(parseActiveProject(JSON.stringify([{ path: "/repo", at: AT }]))).toBeNull();
    expect(parseActiveProject("null")).toBeNull();
    expect(parseActiveProject("42")).toBeNull();
    expect(parseActiveProject('"/repo"')).toBeNull();
  });
});

describe("activeProjectPath", () => {
  test("active-project.json dentro de la carpeta de config", () => {
    expect(activeProjectPath()).toBe(file);
  });
});

describe("readActiveProject", () => {
  test("sin archivo: null", () => {
    expect(readActiveProject()).toBeNull();
  });

  test("archivo válido: lo que escribió el mod", () => {
    writeFileSync(file, JSON.stringify({ path: "/repo", at: AT }));
    expect(readActiveProject()).toEqual({ path: "/repo", at: AT_MS });
  });

  test("archivo a medias: null", () => {
    writeFileSync(file, '{ "path": "/repo"');
    expect(readActiveProject()).toBeNull();
  });
});

describe("clearActiveProject", () => {
  test("borra el archivo", () => {
    writeFileSync(file, JSON.stringify({ path: "/repo", at: AT }));
    clearActiveProject();
    expect(existsSync(file)).toBe(false);
    expect(readActiveProject()).toBeNull();
  });

  test("borrar algo inexistente no falla", () => {
    expect(() => clearActiveProject()).not.toThrow();
    expect(existsSync(file)).toBe(false);
  });
});
