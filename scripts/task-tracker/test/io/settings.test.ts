import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadBoardSettings, saveBoardSettings } from "../../src/io/settings.ts";

const root = mkdtempSync(join(tmpdir(), "task-tracker-settings-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const savedHome = process.env.ACSUITE_HOME;
let home: string;
let file: string;

beforeEach(() => {
  // Cada test con su propia carpeta de config: nunca la real.
  home = mkdtempSync(join(root, "home-"));
  file = join(home, "settings.json");
  process.env.ACSUITE_HOME = home;
});

afterEach(() => {
  if (savedHome === undefined) delete process.env.ACSUITE_HOME;
  else process.env.ACSUITE_HOME = savedHome;
});

/** Los respaldos de `settings.json` que hay en la carpeta de config del test. */
const backups = () => readdirSync(home).filter((name) => name.endsWith(".bak"));
const written = () => JSON.parse(readFileSync(file, "utf8"));

describe("loadBoardSettings", () => {
  test("sin archivo: vacío y sin aviso", () => {
    expect(loadBoardSettings()).toEqual({ settings: {}, warning: null });
  });

  test("archivo bueno: los tres valores", () => {
    writeFileSync(file, JSON.stringify({ version: 1, board: { compact: true, arrows: false, follow: true } }));
    expect(loadBoardSettings()).toEqual({ settings: { compact: true, arrows: false, follow: true }, warning: null });
  });

  test("con BOM (editores de Windows): se lee igual", () => {
    writeFileSync(file, `﻿${JSON.stringify({ version: 1, board: { compact: true } })}`);
    expect(loadBoardSettings()).toEqual({ settings: { compact: true }, warning: null });
  });

  test("sin la clave board: vacío y sin aviso", () => {
    writeFileSync(file, JSON.stringify({ version: 1, otro: { x: 1 } }));
    expect(loadBoardSettings()).toEqual({ settings: {}, warning: null });
  });

  test("propiedades ausentes: solo vienen las que están", () => {
    writeFileSync(file, JSON.stringify({ version: 1, board: { arrows: false } }));
    expect(loadBoardSettings().settings).toEqual({ arrows: false });
  });

  test("propiedad de tipo inválido: se ignora, las demás valen, sin aviso", () => {
    writeFileSync(file, JSON.stringify({ version: 1, board: { compact: "sí", arrows: 0, follow: true, extra: 1 } }));
    expect(loadBoardSettings()).toEqual({ settings: { follow: true }, warning: null });
  });

  test("JSON corrupto: vacío y un aviso que dice el archivo y que se ignora", () => {
    writeFileSync(file, "{ esto no es json");
    const { settings, warning } = loadBoardSettings();
    expect(settings).toEqual({});
    expect(warning).toContain(file);
    expect(warning).toContain("no es un JSON válido");
    expect(warning).toContain("settings.json.<AAAAMMDD-HHMMSS>.bak");
  });

  test("raíz que no es un objeto: se ignora con aviso", () => {
    for (const content of [[1], null, "x", 3]) {
      writeFileSync(file, JSON.stringify(content));
      const { settings, warning } = loadBoardSettings();
      expect(settings).toEqual({});
      expect(warning).toContain("no tiene la forma esperada");
    }
  });

  test("sin version o con otra version: no es corrupto, se lee board", () => {
    for (const content of [{ board: { compact: true } }, { version: 2, board: { compact: true } }, { otroScript: 1, board: { compact: true } }]) {
      writeFileSync(file, JSON.stringify(content));
      expect(loadBoardSettings()).toEqual({ settings: { compact: true }, warning: null });
    }
  });

  test("board que no es un objeto (null, texto, lista): se ignora con aviso", () => {
    for (const board of [null, "x", [true]]) {
      writeFileSync(file, JSON.stringify({ version: 1, board }));
      const { settings, warning } = loadBoardSettings();
      expect(settings).toEqual({});
      expect(warning).toContain('"board"');
      expect(warning).toContain("no es un objeto");
    }
  });

  test("archivo ilegible (es una carpeta): vacío y un aviso", () => {
    mkdirSync(file);
    const { settings, warning } = loadBoardSettings();
    expect(settings).toEqual({});
    expect(warning).toContain("No se pudo leer");
    expect(warning).toContain(file);
  });
});

describe("saveBoardSettings", () => {
  test("sin archivo: crea la carpeta y el archivo con version y board", () => {
    const nested = join(home, "nueva", "carpeta");
    process.env.ACSUITE_HOME = nested;
    expect(saveBoardSettings({ compact: true })).toBeNull();
    expect(JSON.parse(readFileSync(join(nested, "settings.json"), "utf8"))).toEqual({ version: 1, board: { compact: true } });
    expect(loadBoardSettings().settings).toEqual({ compact: true });
  });

  test("guardado parcial: se fusiona con lo que ya había en board", () => {
    writeFileSync(file, JSON.stringify({ version: 1, board: { compact: true, arrows: false } }));
    expect(saveBoardSettings({ follow: true })).toBeNull();
    expect(written()).toEqual({ version: 1, board: { compact: true, arrows: false, follow: true } });
    expect(saveBoardSettings({ compact: false })).toBeNull();
    expect(written()).toEqual({ version: 1, board: { compact: false, arrows: false, follow: true } });
  });

  test("conserva las claves ajenas del archivo y las propiedades ajenas de board", () => {
    const original = { version: 1, otroScript: { a: [1, 2] }, board: { compact: true, futura: "x", arrows: "mal" } };
    writeFileSync(file, JSON.stringify(original));
    expect(saveBoardSettings({ follow: true })).toBeNull();
    expect(written()).toEqual({ version: 1, otroScript: { a: [1, 2] }, board: { compact: true, futura: "x", arrows: "mal", follow: true } });
    expect(backups()).toEqual([]);
  });

  test("una propiedad inválida se pisa solo si el guardado la trae", () => {
    writeFileSync(file, JSON.stringify({ version: 1, board: { arrows: "mal" } }));
    expect(saveBoardSettings({ arrows: false })).toBeNull();
    expect(written().board).toEqual({ arrows: false });
  });

  test("si no cambia nada, no reescribe", () => {
    const text = JSON.stringify({ version: 1, board: { compact: true, arrows: false } });
    writeFileSync(file, text);
    const old = new Date(2020, 0, 1);
    utimesSync(file, old, old);
    expect(saveBoardSettings({ compact: true })).toBeNull();
    expect(saveBoardSettings({ compact: true, arrows: false })).toBeNull();
    expect(saveBoardSettings({})).toBeNull();
    expect(readFileSync(file, "utf8")).toBe(text);
    expect(statSync(file).mtimeMs).toBe(old.getTime());
    expect(readdirSync(home)).toEqual(["settings.json"]);
  });

  test("no deja archivos temporales", () => {
    expect(saveBoardSettings({ arrows: false })).toBeNull();
    expect(readdirSync(home)).toEqual(["settings.json"]);
  });

  test("archivo corrupto: se respalda a settings.json.<sello>.bak y se reescribe", () => {
    writeFileSync(file, "{ roto");
    expect(saveBoardSettings({ compact: true })).toBeNull();
    expect(written()).toEqual({ version: 1, board: { compact: true } });
    expect(backups()).toHaveLength(1);
    const [backup] = backups();
    expect(backup).toMatch(/^settings\.json\.\d{8}-\d{6}\.bak$/);
    expect(readFileSync(join(home, backup), "utf8")).toBe("{ roto");
  });

  test("claves de otro script sin version: se conservan y se agrega version 1, sin respaldo", () => {
    writeFileSync(file, JSON.stringify({ otroScript: { a: 1 } }));
    expect(saveBoardSettings({ compact: true })).toBeNull();
    expect(written()).toEqual({ otroScript: { a: 1 }, version: 1, board: { compact: true } });
    expect(backups()).toEqual([]);
  });

  test("otra version: se conserva tal cual, sin respaldo", () => {
    writeFileSync(file, JSON.stringify({ version: 2, otroScript: true, board: { compact: false } }));
    expect(saveBoardSettings({ compact: true })).toBeNull();
    expect(written()).toEqual({ version: 2, otroScript: true, board: { compact: true } });
    expect(backups()).toEqual([]);
  });

  test("board null: se respalda el archivo y board pasa a ser un objeto, conservando lo ajeno", () => {
    const text = JSON.stringify({ version: 1, otroScript: 7, board: null });
    writeFileSync(file, text);
    expect(saveBoardSettings({ compact: true })).toBeNull();
    expect(written()).toEqual({ version: 1, otroScript: 7, board: { compact: true } });
    expect(backups()).toHaveLength(1);
    expect(readFileSync(join(home, backups()[0]), "utf8")).toBe(text);
  });

  test("raíz que no es un objeto: se respalda y se reescribe", () => {
    writeFileSync(file, "[1]");
    expect(saveBoardSettings({ compact: true })).toBeNull();
    expect(written()).toEqual({ version: 1, board: { compact: true } });
    expect(backups()).toHaveLength(1);
  });

  test("dos respaldos seguidos no se pisan", () => {
    for (let i = 0; i < 2; i++) {
      writeFileSync(file, `{ roto ${i}`);
      expect(saveBoardSettings({ compact: true })).toBeNull();
    }
    expect(backups()).toHaveLength(2);
  });

  test("archivo ilegible por un error de disco (es una carpeta): no se pisa y devuelve el error", () => {
    mkdirSync(file);
    const error = saveBoardSettings({ compact: true });
    expect(error).toEqual({ cause: "no se pudo leer, así que no se sobrescribe", file });
    expect(statSync(file).isDirectory()).toBe(true);
    expect(backups()).toEqual([]);
  });

  test("error al escribir (la carpeta de config es un archivo): devuelve el error, no lanza", () => {
    const blocker = join(root, "es-un-archivo");
    writeFileSync(blocker, "x");
    process.env.ACSUITE_HOME = join(blocker, "sub");
    const error = saveBoardSettings({ compact: true });
    expect(error).not.toBeNull();
    expect(error?.file).toBe(join(blocker, "sub", "settings.json"));
    expect(error?.cause).toBeTruthy();
  });
});
