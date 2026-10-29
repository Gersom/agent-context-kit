// Ajustes del board guardados en disco, en `settings.json` dentro de la carpeta de config
// (`ACSUITE_HOME`, o `~/.acsuite`). Formato:
// `{ "version": 1, "board": { "compact": boolean, "arrows": boolean, "follow": boolean } }`.
// El archivo lo comparten varios scripts: el board lee y escribe solo su clave `board` y conserva
// cualquier otra clave o propiedad. Solo es corrupto si no es JSON o su raíz no es un objeto. Una
// `version` ausente se acepta (al guardar se escribe 1) y una distinta de 1 se deja tal cual; un
// `board` ausente es "sin ajustes" y uno que no es objeto se ignora con aviso (al guardar se
// reemplaza por un objeto, respaldando antes el archivo). Nada de acá lanza: los errores de disco
// vuelven como aviso o como `ConfigError`.

import { copyFileSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { backupPath, type ConfigError, configDir, errorMessage } from "./user-config.ts";

const SETTINGS_FILE = "settings.json";
const FORMAT_VERSION = 1;
/** Se agrega al aviso de un archivo corrupto: qué pasa con él al guardar una opción (ver `saveBoardSettings`). */
const BACKUP_NOTE = "; al cambiar una opción del board se respaldará en settings.json.<AAAAMMDD-HHMMSS>.bak";

/** Las opciones del board que se recuerdan entre ejecuciones. */
export interface BoardSettings {
  /** Recuadros compactos (una sola tarea por recuadro). */
  compact: boolean;
  /** Flechas del flujo entre recuadros. */
  arrows: boolean;
  /** Modo observador. */
  follow: boolean;
}

const BOARD_KEYS: (keyof BoardSettings)[] = ["compact", "arrows", "follow"];

type Json = Record<string, unknown>;

/**
 * Lo leído de `settings.json`: ausente, bueno, con `board` que no es un objeto, corrupto, o que no se
 * pudo leer. `raw` es el objeto entero del archivo (vacío si no hay uno bueno), para conservar lo ajeno.
 */
type Saved =
  | { state: "missing"; raw: Json; warning: null }
  | { state: "ok"; raw: Json; warning: null }
  | { state: "badBoard" | "corrupt" | "unreadable"; raw: Json; warning: string };

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSaved(file: string): Saved {
  let text: string;
  try {
    // Editores y PowerShell en Windows pueden guardar el JSON con BOM.
    text = readFileSync(file, "utf8").replace(/^﻿/, "");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { state: "missing", raw: {}, warning: null };
    return { state: "unreadable", raw: {}, warning: `No se pudo leer ${file}: ${errorMessage(error)}. Se ignora.` };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { state: "corrupt", raw: {}, warning: `${file} no es un JSON válido. Se ignora${BACKUP_NOTE}.` };
  }
  // Solo esto invalida el archivo entero; `version` y `board` se miran aparte, solo para lo del board.
  if (!isRecord(data)) {
    return { state: "corrupt", raw: {}, warning: `${file} no tiene la forma esperada (la raíz debe ser un objeto JSON). Se ignora${BACKUP_NOTE}.` };
  }
  // `board` que no es un objeto no sirve, pero el resto del archivo sí: se conserva (ver `saveBoardSettings`).
  if (data.board !== undefined && !isRecord(data.board)) {
    return { state: "badBoard", raw: data, warning: `La clave "board" de ${file} no es un objeto. Se ignora${BACKUP_NOTE}.` };
  }
  return { state: "ok", raw: data, warning: null };
}

/** Las propiedades de `board` que están y son booleanas; las ausentes o de otro tipo se ignoran. */
function boardSettings(raw: Json): Partial<BoardSettings> {
  const board = isRecord(raw.board) ? raw.board : {};
  const settings: Partial<BoardSettings> = {};
  for (const key of BOARD_KEYS) {
    const value = board[key];
    if (typeof value === "boolean") settings[key] = value;
  }
  return settings;
}

/**
 * Los ajustes guardados del board. Sin archivo, vacíos y sin aviso; con el archivo corrupto (JSON
 * ilegible o raíz que no es un objeto), con `board` que no es un objeto, o ilegible, vacíos y un aviso
 * que dice cuál archivo se ignora. La `version` no se mira. Una propiedad ausente o de otro tipo no viene en el resultado (se usa el defecto).
 */
export function loadBoardSettings(): { settings: Partial<BoardSettings>; warning: string | null } {
  try {
    const { raw, warning } = readSaved(join(configDir(), SETTINGS_FILE));
    return { settings: boardSettings(raw), warning };
  } catch (error) {
    return { settings: {}, warning: `No se pudo ubicar la carpeta de config: ${errorMessage(error)}. Se ignoran los ajustes guardados.` };
  }
}

/**
 * Guarda las opciones de `patch` en `board`, fusionadas con las que ya había (las demás propiedades
 * de `board` y las demás claves del archivo se conservan tal cual). Si no cambia nada, no toca el
 * archivo. Crea la carpeta de config si falta y escribe de forma atómica (archivo temporal +
 * renombrar). Escribe `version: 1` solo si el archivo no traía `version`; una distinta se conserva.
 * Si el archivo existente estaba corrupto o su `board` no era un objeto, antes lo copia a
 * `settings.json.<AAAAMMDD-HHMMSS>.bak`; uno ilegible por un error de disco no se pisa. Devuelve el
 * error (causa y archivo; ver `failureMessage`), o `null` si quedó guardado.
 */
export function saveBoardSettings(patch: Partial<BoardSettings>): ConfigError | null {
  let dir: string;
  try {
    dir = configDir();
  } catch (error) {
    return { cause: `No se pudo ubicar la carpeta de config: ${errorMessage(error)}`, file: SETTINGS_FILE };
  }
  const file = join(dir, SETTINGS_FILE);
  const temp = `${file}.${process.pid}.tmp`;
  try {
    const saved = readSaved(file);
    // Ilegible por un error de disco (permisos, es una carpeta...): no se pisa lo que no se pudo leer.
    if (saved.state === "unreadable") return { cause: "no se pudo leer, así que no se sobrescribe", file };

    const board = isRecord(saved.raw.board) ? saved.raw.board : {};
    if (saved.state === "ok" && BOARD_KEYS.every((key) => patch[key] === undefined || board[key] === patch[key])) return null;

    mkdirSync(dir, { recursive: true });
    if (saved.state === "corrupt" || saved.state === "badBoard") copyFileSync(file, backupPath(file));
    const next = { ...saved.raw, version: saved.raw.version ?? FORMAT_VERSION, board: { ...board, ...patch } };
    writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`);
    renameSync(temp, file);
    return null;
  } catch (error) {
    try {
      rmSync(temp, { force: true });
    } catch {
      // Sin más que hacer: el mensaje del error original es el que importa.
    }
    return { cause: errorMessage(error), file };
  }
}
