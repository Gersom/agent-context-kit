// Lectura y vigilancia de los archivos de docs/agents/ del proyecto vigilado.
// Todo lo que toca el sistema de archivos vive acá; el resto del script trabaja sobre strings.

import { existsSync, readFileSync, statSync, watch } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

/** Archivos que se vigilan dentro de la carpeta de agentes. */
export const WATCHED_FILES = ["handoff.md", "backlog.md"];

/** Subcarpetas donde el skill genera la documentación, relativas a la raíz del proyecto. */
const AGENTS_SUBDIRS = [join("docs", "agents"), join("agent-context", "agents")];

/**
 * Carpeta desde la que el operador lanzó el comando, para resolver rutas relativas.
 *
 * `bun run tasks` (Bun 1.4.2) cambia el cwd a la raíz del package y NO define `INIT_CWD`
 * (a diferencia de npm); sí deja la carpeta de invocación en `npm_config_local_prefix`.
 * Se prueban en ese orden y, si ninguna existe (ej. `bun scripts/task-tracker/index.js`
 * directo), el cwd real ya es la carpeta de invocación.
 * @returns {string}
 */
export function invocationDir() {
  return process.env.INIT_CWD ?? process.env.npm_config_local_prefix ?? process.cwd();
}

/**
 * Limpia la ruta tal como la escribió o pegó el operador: espacios y comillas envolventes
 * (Windows las agrega al arrastrar una carpeta a la terminal).
 * @param {string} raw
 * @returns {string}
 */
export function cleanPathInput(raw) {
  let value = raw.trim();
  while (value.length >= 2 && /^(["']).*\1$/.test(value)) value = value.slice(1, -1).trim();
  return value;
}

function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Ubica la carpeta de agentes a partir de lo que pasó el operador: la carpeta misma si ya
 * contiene `handoff.md`, o `docs/agents/` / `agent-context/agents/` dentro de ella.
 * @param {string} input ruta cruda (argumento o respuesta a la pregunta)
 * @param {string} [baseDir] contra qué se resuelven las rutas relativas
 * @returns {{ ok: true, agentsDir: string, projectName: string } | { ok: false, error: string, tried: string[] }}
 */
export function resolveAgentsDir(input, baseDir = invocationDir()) {
  const cleaned = cleanPathInput(input);
  if (!cleaned) return { ok: false, error: "La ruta está vacía.", tried: [] };

  const target = isAbsolute(cleaned) ? resolve(cleaned) : resolve(baseDir, cleaned);
  if (!isDir(target)) {
    return { ok: false, error: `No existe la carpeta: ${target}`, tried: [target] };
  }

  const candidates = [target, ...AGENTS_SUBDIRS.map((sub) => join(target, sub))];
  for (const dir of candidates) {
    if (existsSync(join(dir, "handoff.md"))) {
      return { ok: true, agentsDir: dir, projectName: projectNameFor(dir) };
    }
  }
  return { ok: false, error: "No se encontró handoff.md en ninguna de estas carpetas:", tried: candidates };
}

/**
 * Nombre del proyecto para el encabezado y el título de la terminal: la carpeta que contiene
 * `docs/agents` (o `agent-context/agents`); si la carpeta vigilada no sigue esa estructura,
 * su propio nombre.
 * @param {string} agentsDir
 * @returns {string}
 */
export function projectNameFor(agentsDir) {
  const parent = dirname(agentsDir);
  if (basename(agentsDir) === "agents" && ["docs", "agent-context"].includes(basename(parent))) {
    return basename(dirname(parent));
  }
  return basename(agentsDir);
}

/**
 * Lee un archivo de texto sin cortar el programa. CRLF se normaliza a LF.
 * @param {string} path
 * @returns {{ text: string | null, error: string | null }} `text: null` si no existe
 */
export function readFileSafe(path) {
  try {
    return { text: readFileSync(path, "utf8").replace(/\r\n?/g, "\n"), error: null };
  } catch (err) {
    if (err?.code === "ENOENT") return { text: null, error: null };
    return { text: null, error: `No se pudo leer ${basename(path)}: ${err?.message ?? err}` };
  }
}

/**
 * Vigila la carpeta (no cada archivo: los agentes suelen reescribir el archivo entero y el
 * watcher de un archivo puede perderse en ese reemplazo). Agrupa ráfagas de eventos con un
 * debounce, porque un solo guardado dispara varios.
 * @param {string} dir
 * @param {(changedFile: string | null) => void} onChange recibe el archivo que cambió (null si el SO no lo informa)
 * @param {(message: string) => void} onError
 * @param {number} [debounceMs]
 * @returns {() => void} función para dejar de vigilar
 */
export function watchDir(dir, onChange, onError, debounceMs = 150) {
  let timer = null;
  let lastFile = null;
  let watcher;
  try {
    watcher = watch(dir, (_event, filename) => {
      const name = filename ? basename(filename.toString()) : null;
      if (name && !WATCHED_FILES.includes(name)) return;
      lastFile = name;
      clearTimeout(timer);
      timer = setTimeout(() => onChange(lastFile), debounceMs);
    });
    watcher.on("error", (err) => onError(`Error del watcher: ${err?.message ?? err}`));
  } catch (err) {
    onError(`No se pudo vigilar ${dir}: ${err?.message ?? err}`);
    return () => {};
  }
  return () => {
    clearTimeout(timer);
    watcher.close();
  };
}
