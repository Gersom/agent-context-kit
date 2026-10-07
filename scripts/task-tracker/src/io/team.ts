// Lectura de la vista de equipo (modo multi-operador): `operators.md`, la carpeta de cada
// operador (con el mismo lector con memoria que la vista de un operador) y `team-backlog.md`.
// Las carpetas se leen cada vez desde `operators.md`, así que un operador nuevo aparece solo.

import { join } from "node:path";
import { parseOperators } from "../../../_shared/parse/operators.ts";
import { formatTime as defaultFormatTime } from "../shared/time.ts";
import type { TeamOperatorRead, TeamRead } from "../shared/types.ts";
import { readFileSafe } from "./files.ts";
import { OPERATORS_FILE } from "./operator.ts";
import { createSnapshotReader, type SnapshotOptions } from "./snapshot.ts";

export const TEAM_BACKLOG_FILE = "team-backlog.md";
/** Archivos de la raíz de agentes que se vigilan en modo multi-operador. */
export const ROOT_WATCHED_FILES: string[] = [OPERATORS_FILE, TEAM_BACKLOG_FILE];

/**
 * Lector del equipo para una carpeta de agentes en modo multi-operador. Los archivos de la raíz
 * (`operators.md`, `team-backlog.md`) siguen la misma regla que los de un operador: si uno que se
 * venía leyendo bien falla, se muestra su última versión buena con un aviso.
 */
export function createTeamReader(agentsRoot: string, options: SnapshotOptions = {}) {
  const { readFile = readFileSafe, now = () => new Date(), formatTime = defaultFormatTime } = options;
  const readers = new Map<string, ReturnType<typeof createSnapshotReader>>();
  const lastGood = new Map<string, { text: string; at: Date }>();

  function readRoot(name: string, warnings: string[]): string | null {
    const { text, error } = readFile(join(agentsRoot, name));
    if (text != null && text.trim() !== "") {
      lastGood.set(name, { text, at: now() });
      return text;
    }
    const previous = lastGood.get(name);
    if (previous) {
      const why = error ? "error de lectura" : text == null ? "no existe" : "está vacío";
      warnings.push(`${name} no se pudo leer (${why}): mostrando la versión de las ${formatTime(previous.at)}.`);
      return previous.text;
    }
    if (error) warnings.push(error);
    return text;
  }

  function read({ allowRetry = true }: { allowRetry?: boolean } = {}): TeamRead {
    const warnings: string[] = [];
    const parsed = parseOperators(readRoot(OPERATORS_FILE, warnings) ?? "");
    for (const line of parsed.unreadable) warnings.push(`${OPERATORS_FILE}: línea sin leer: ${line}`);

    let needsRetry = false;
    const operators: TeamOperatorRead[] = parsed.operators.map((entry) => {
      if (entry.folderless) return { entry, snapshot: null };
      let reader = readers.get(entry.folder);
      if (!reader) {
        reader = createSnapshotReader(join(agentsRoot, entry.folder), options);
        readers.set(entry.folder, reader);
      }
      const snapshot = reader.read({ allowRetry });
      if (snapshot.needsRetry) needsRetry = true;
      return { entry, snapshot };
    });

    return { operators, teamBacklogText: readRoot(TEAM_BACKLOG_FILE, warnings), warnings, needsRetry };
  }

  return { read };
}
