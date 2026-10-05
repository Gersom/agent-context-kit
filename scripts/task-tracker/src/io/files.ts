// Lectura de los archivos de docs/agents/ del proyecto vigilado, sin cortar el programa.

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { ReadResult } from "../shared/types.ts";

/** Archivos que se vigilan dentro de la carpeta de agentes. */
export const WATCHED_FILES: string[] = ["handoff.md", "backlog.md", "history.md"];

/**
 * Lee un archivo de texto sin cortar el programa. CRLF se normaliza a LF.
 * Devuelve `text: null` si no existe; `code` es el código del error de lectura (ej. `EBUSY`),
 * si lo hubo.
 */
export function readFileSafe(path: string): ReadResult {
  try {
    return { text: readFileSync(path, "utf8").replace(/\r\n?/g, "\n"), error: null, code: null };
  } catch (caught) {
    // Lo que se lance puede no ser un Error de Node; se lee de forma defensiva, como antes.
    const err = caught as { code?: string; message?: string } | null | undefined;
    if (err?.code === "ENOENT") return { text: null, error: null, code: null };
    return { text: null, error: `No se pudo leer ${basename(path)}: ${err?.message ?? err}`, code: err?.code ?? null };
  }
}
