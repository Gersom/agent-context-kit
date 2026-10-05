// Vigilancia de la carpeta de agentes: avisa cuando cambian handoff.md o backlog.md.

import { watch } from "node:fs";
import { basename } from "node:path";
import { WATCHED_FILES } from "./files.js";

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
