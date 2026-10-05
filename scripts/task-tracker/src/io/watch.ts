// Vigilancia de la carpeta de agentes: avisa cuando cambian handoff.md, backlog.md o history.md.

import { type FSWatcher, watch } from "node:fs";
import { basename } from "node:path";
import { WATCHED_FILES } from "./files.ts";

/** Mensaje de un error que puede no ser un `Error` (se lee de forma defensiva). */
function messageOf(caught: unknown): unknown {
  const err = caught as { message?: string } | null | undefined;
  return err?.message ?? err;
}

/**
 * Vigila la carpeta (no cada archivo: los agentes suelen reescribir el archivo entero y el
 * watcher de un archivo puede perderse en ese reemplazo). Agrupa ráfagas de eventos con un
 * debounce, porque un solo guardado dispara varios.
 * @param onChange recibe el archivo que cambió (null si el SO no lo informa)
 * @returns función para dejar de vigilar
 */
export function watchDir(
  dir: string,
  onChange: (changedFile: string | null) => void,
  onError: (message: string) => void,
  debounceMs = 150,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastFile: string | null = null;
  let watcher: FSWatcher;
  try {
    watcher = watch(dir, (_event, filename) => {
      const name = filename ? basename(filename.toString()) : null;
      if (name && !WATCHED_FILES.includes(name)) return;
      lastFile = name;
      clearTimeout(timer);
      timer = setTimeout(() => onChange(lastFile), debounceMs);
    });
    watcher.on("error", (err) => onError(`Error del watcher: ${messageOf(err)}`));
  } catch (err) {
    onError(`No se pudo vigilar ${dir}: ${messageOf(err)}`);
    return () => {};
  }
  return () => {
    clearTimeout(timer);
    watcher.close();
  };
}
