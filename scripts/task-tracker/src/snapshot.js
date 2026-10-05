// Lectura con memoria de handoff.md y backlog.md: recuerda la última versión buena de cada
// archivo para no mostrar datos rotos mientras un agente lo está reescribiendo (el archivo puede
// no existir, estar vacío o estar trabado —EBUSY/EPERM en Windows— durante unos milisegundos).

import { join } from "node:path";
import { readFileSafe, WATCHED_FILES } from "./reader.js";

/** Espera sugerida antes de reintentar una lectura fallida. */
export const RETRY_MS = 300;

/**
 * Lector con memoria para una carpeta de agentes. Por cada archivo, ambos por igual:
 * - Lectura buena (texto no vacío) → se guarda como última versión buena.
 * - Falla un archivo que ya se leyó bien en la sesión → si se permite reintentar, `needsRetry`
 *   (quien llama vuelve a leer en `RETRY_MS`); si no, se usa la última versión buena con aviso.
 * - Falla un archivo que nunca se leyó bien → se devuelve tal cual (`null` o vacío) y el modelo
 *   decide (ej. sin `backlog.md` es el set mínimo, no un error).
 * @param {string} agentsDir
 * @param {{ readFile?: typeof readFileSafe, now?: () => Date, formatTime?: (date: Date) => string }} [options]
 */
export function createSnapshotReader(agentsDir, options = {}) {
  const { readFile = readFileSafe, now = () => new Date(), formatTime = defaultFormatTime } = options;
  /** @type {Record<string, { text: string, at: Date } | null>} */
  const lastGood = Object.fromEntries(WATCHED_FILES.map((name) => [name, null]));

  /**
   * @param {{ allowRetry?: boolean }} [readOptions]
   * @returns {{ handoffText: string | null, backlogText: string | null, warnings: string[], needsRetry: boolean }}
   */
  function read({ allowRetry = true } = {}) {
    const texts = {};
    const warnings = [];
    let needsRetry = false;

    for (const name of WATCHED_FILES) {
      const { text, error, code } = readFile(join(agentsDir, name));
      if (text != null && text.trim() !== "") {
        lastGood[name] = { text, at: now() };
        texts[name] = text;
        continue;
      }

      const previous = lastGood[name];
      if (!previous) {
        texts[name] = text;
        if (error) warnings.push(error);
        continue;
      }

      if (allowRetry) needsRetry = true;
      texts[name] = previous.text;
      const why = error ? `error ${code ?? "de lectura"}` : text == null ? "no existe" : "está vacío";
      warnings.push(`${name} no se pudo leer (${why}): mostrando la versión de las ${formatTime(previous.at)}.`);
    }

    return { handoffText: texts["handoff.md"], backlogText: texts["backlog.md"], warnings, needsRetry };
  }

  return { read };
}

function defaultFormatTime(date) {
  return date.toLocaleTimeString("es", { hour12: false });
}
