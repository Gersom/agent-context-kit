// Lectura de los archivos de docs/agents/ del proyecto vigilado, sin cortar el programa.

import { readFileSync } from "node:fs";
import { basename } from "node:path";

/** Archivos que se vigilan dentro de la carpeta de agentes. */
export const WATCHED_FILES = ["handoff.md", "backlog.md"];

/**
 * Lee un archivo de texto sin cortar el programa. CRLF se normaliza a LF.
 * @param {string} path
 * @returns {{ text: string | null, error: string | null, code: string | null }} `text: null` si
 *   no existe; `code` es el código del error de lectura (ej. `EBUSY`), si lo hubo
 */
export function readFileSafe(path) {
  try {
    return { text: readFileSync(path, "utf8").replace(/\r\n?/g, "\n"), error: null, code: null };
  } catch (err) {
    if (err?.code === "ENOENT") return { text: null, error: null, code: null };
    return { text: null, error: `No se pudo leer ${basename(path)}: ${err?.message ?? err}`, code: err?.code ?? null };
  }
}
