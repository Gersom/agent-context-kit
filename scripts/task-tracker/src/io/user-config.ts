// Configuración del usuario: la lista de proyectos de `acsuite board` guardada en disco, en
// `projects.json` dentro de la carpeta de config (`ACSUITE_HOME`, o `~/.acsuite`). Formato:
// `{ "version": 1, "projects": ["<ruta absoluta de la raíz del repo>", ...] }`, en orden de alta y
// sin duplicados. Nada de acá lanza: los errores de disco vuelven como mensaje o como aviso.

import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { invocationDir } from "./paths.ts";

const PROJECTS_FILE = "projects.json";
const FORMAT_VERSION = 1;
/** Se agrega al aviso de un archivo corrupto: qué pasa con él al guardar un repo (ver `saveProject`). */
const BACKUP_NOTE = "; al guardar un repo se respaldará en projects.json.<AAAAMMDD-HHMMSS>.bak";

/** Carpeta de config del usuario: `ACSUITE_HOME` si está definida, si no `~/.acsuite`. */
export function configDir(): string {
  // Un `ACSUITE_HOME` relativo se toma desde donde se lanzó el comando, no desde el cwd del proceso.
  const custom = process.env.ACSUITE_HOME;
  return custom ? resolve(invocationDir(), custom) : join(homedir(), ".acsuite");
}

/** Dos rutas son la misma: se unifican las barras (`/` o `\`) y la barra final, y en Windows no se distinguen mayúsculas. */
export function samePath(a: string, b: string): boolean {
  const [x, y] = [resolve(a), resolve(b)];
  return process.platform === "win32" ? x.toLowerCase() === y.toLowerCase() : x === y;
}

/**
 * Lo leído de `projects.json`: ausente, bueno, con contenido que no sirve, o que no se pudo leer.
 * Un archivo bueno puede traer un aviso: las entradas que no eran una ruta se ignoraron.
 */
type Saved =
  | { state: "missing"; paths: []; warning: null }
  | { state: "ok"; paths: string[]; warning: string | null }
  | { state: "corrupt" | "unreadable"; paths: []; warning: string };

function readSaved(file: string): Saved {
  let text: string;
  try {
    // Editores y PowerShell en Windows pueden guardar el JSON con BOM.
    text = readFileSync(file, "utf8").replace(/^﻿/, "");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { state: "missing", paths: [], warning: null };
    return { state: "unreadable", paths: [], warning: `No se pudo leer ${file}: ${errorMessage(error)}. Se ignora.` };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { state: "corrupt", paths: [], warning: `${file} no es un JSON válido. Se ignora${BACKUP_NOTE}.` };
  }
  const projects = (data as { version?: unknown; projects?: unknown } | null)?.projects;
  // Solo esto invalida el archivo entero; una entrada mala se filtra (ver abajo).
  if ((data as { version?: unknown } | null)?.version !== FORMAT_VERSION || !Array.isArray(projects)) {
    return {
      state: "corrupt",
      paths: [],
      warning: `${file} no tiene la forma esperada ({ "version": ${FORMAT_VERSION}, "projects": [rutas] }). Se ignora${BACKUP_NOTE}.`,
    };
  }

  const paths: string[] = [];
  let ignored = 0;
  for (const entry of projects) {
    if (typeof entry !== "string" || entry === "") {
      ignored++;
      continue;
    }
    // Una ruta escrita a mano (`D:/a/b/`) se lee en su forma normal.
    const normal = resolve(entry);
    if (!paths.some((p) => samePath(p, normal))) paths.push(normal);
  }
  const warning = ignored
    ? `${file}: ${ignored === 1 ? "se ignoró 1 entrada que no es" : `se ignoraron ${ignored} entradas que no son`} una ruta.`
    : null;
  return { state: "ok", paths, warning };
}

/** Marca de tiempo local para el nombre del respaldo: `AAAAMMDD-HHMMSS`. */
function stamp(date: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${two(date.getMonth() + 1)}${two(date.getDate())}-${two(date.getHours())}${two(date.getMinutes())}${two(date.getSeconds())}`;
}

/** Nombre libre para el respaldo de `file`: con sello de tiempo y, si ya existe, un número, para no pisar uno anterior. */
function backupPath(file: string): string {
  const base = `${file}.${stamp(new Date())}`;
  let candidate = `${base}.bak`;
  for (let n = 2; existsSync(candidate); n++) candidate = `${base}-${n}.bak`;
  return candidate;
}

/**
 * Los repos guardados, en orden de alta. Sin archivo, lista vacía y sin aviso; con el archivo
 * corrupto (JSON ilegible, otra `version` o `projects` que no es una lista) o ilegible, lista vacía
 * y un aviso que dice cuál archivo se ignora. Las entradas de `projects` que no son una ruta se
 * filtran y el aviso dice cuántas fueron; las buenas se conservan.
 */
export function loadSavedProjects(): { paths: string[]; warning: string | null } {
  try {
    const { paths, warning } = readSaved(join(configDir(), PROJECTS_FILE));
    return { paths, warning };
  } catch (error) {
    return { paths: [], warning: `No se pudo ubicar la carpeta de config: ${errorMessage(error)}. Se ignora la lista guardada.` };
  }
}

/**
 * Agrega la raíz de un repo a la lista guardada (al final; si ya figura, no toca el archivo).
 * Crea la carpeta de config si falta y escribe de forma atómica (archivo temporal + renombrar).
 * Si el archivo existente estaba corrupto, antes lo copia a `projects.json.<AAAAMMDD-HHMMSS>.bak`
 * (el aviso de `loadSavedProjects` ya lo anuncia). Las entradas inválidas de un archivo bueno no
 * se conservan al reescribirlo. Devuelve el mensaje del error, o `null` si quedó guardado.
 */
export function saveProject(path: string): string | null {
  let dir: string;
  try {
    dir = configDir();
  } catch (error) {
    return `No se pudo ubicar la carpeta de config: ${errorMessage(error)}`;
  }
  const file = join(dir, PROJECTS_FILE);
  const temp = `${file}.${process.pid}.tmp`;
  try {
    const saved = readSaved(file);
    // Ilegible por un error de disco (permisos, es una carpeta...): no se pisa lo que no se pudo leer.
    if (saved.state === "unreadable") return `${file} no se pudo leer, así que no se sobrescribe.`;
    if (saved.paths.some((p) => samePath(p, path))) return null;

    mkdirSync(dir, { recursive: true });
    if (saved.state === "corrupt") copyFileSync(file, backupPath(file));
    writeFileSync(temp, `${JSON.stringify({ version: FORMAT_VERSION, projects: [...saved.paths, resolve(path)] }, null, 2)}\n`);
    renameSync(temp, file);
    return null;
  } catch (error) {
    try {
      rmSync(temp, { force: true });
    } catch {
      // Sin más que hacer: el mensaje del error original es el que importa.
    }
    return `${file}: ${errorMessage(error)}`;
  }
}

/**
 * Quita la raíz de un repo de la lista guardada (las demás conservan su orden). No borra nada del
 * disco más que esa entrada. Si la ruta no figura, no toca el archivo; eso incluye uno corrupto,
 * que se lee como lista vacía y no se reescribe (no hay nada que quitar, y reescribirlo perdería
 * lo que contiene). Escribe de forma atómica (archivo temporal + renombrar) y no pisa un archivo
 * que no se pudo leer. Devuelve el mensaje del error, o `null` si quedó quitada (o no figuraba).
 */
export function removeProject(path: string): string | null {
  let dir: string;
  try {
    dir = configDir();
  } catch (error) {
    return `No se pudo ubicar la carpeta de config: ${errorMessage(error)}`;
  }
  const file = join(dir, PROJECTS_FILE);
  const temp = `${file}.${process.pid}.tmp`;
  try {
    const saved = readSaved(file);
    // Ilegible por un error de disco (permisos, es una carpeta...): no se pisa lo que no se pudo leer.
    if (saved.state === "unreadable") return `${file} no se pudo leer, así que no se sobrescribe.`;
    if (!saved.paths.some((p) => samePath(p, path))) return null;

    writeFileSync(temp, `${JSON.stringify({ version: FORMAT_VERSION, projects: saved.paths.filter((p) => !samePath(p, path)) }, null, 2)}\n`);
    renameSync(temp, file);
    return null;
  } catch (error) {
    try {
      rmSync(temp, { force: true });
    } catch {
      // Sin más que hacer: el mensaje del error original es el que importa.
    }
    return `${file}: ${errorMessage(error)}`;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
