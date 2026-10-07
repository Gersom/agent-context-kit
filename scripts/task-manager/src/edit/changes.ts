// Cambios de uno o más archivos en dos tiempos: `planChanges` calcula el texto resultante de cada
// archivo (y verifica que siga legible) sin tocar el disco; `commitChanges` lo escribe, o con
// `--dry-run` solo muestra el diff. Así, si cualquier edición es inválida, no se escribe NINGÚN
// archivo, y un comando que toca varios (ej. sacar de backlog.md y poner en handoff.md) o queda
// completo o no queda a medias por culpa de un cálculo fallido.

import pc from "picocolors";
import { CliError } from "../cli/errors.ts";
import type { Io } from "../cli/types.ts";
import { type Doc, readRaw } from "../workspace/docs.ts";
import { unifiedDiff } from "./diff.ts";
import { applyEdits, type Edit } from "./edits.ts";
import { readabilityProblems } from "./verify.ts";
import { writeFileAtomic } from "./write.ts";

/** Las ediciones de un archivo, en offsets del texto LF que parseó `doc`. */
export interface FileChange {
  doc: Doc<unknown>;
  edits: Edit[];
}

/** El resultado calculado para un archivo. */
export interface PlannedFile {
  path: string;
  fileName: string;
  /** Texto crudo antes de editar (`""` si el archivo no existía). */
  before: string;
  /** Texto crudo resultante. */
  after: string;
  existed: boolean;
  /** `false` si las ediciones no cambian nada: no se escribe. */
  changed: boolean;
}

export interface PlanOptions {
  /** Volver a parsear el resultado y exigir que no se rompan anclas ni secciones (por defecto `true`). */
  verify?: boolean;
}

export interface ChangeResult {
  dryRun: boolean;
  files: Array<{ path: string; fileName: string; changed: boolean; written: boolean }>;
}

/**
 * Calcula el texto resultante de cada archivo. No escribe nada.
 * @throws CliError edición inválida o solapada, mismo archivo repetido, o resultado que ya no es legible
 */
export function planChanges(changes: FileChange[], options: PlanOptions = {}): PlannedFile[] {
  const seen = new Set<string>();
  return changes.map(({ doc, edits }) => {
    if (seen.has(doc.path)) throw new CliError(`${doc.fileName} aparece dos veces entre los cambios: agrupa sus ediciones en una sola.`);
    seen.add(doc.path);

    const after = applyEdits(doc.raw, doc.eol, edits);
    const changed = after !== doc.raw;
    if (changed && options.verify !== false) {
      const problems = readabilityProblems(doc.kind, doc.raw, after);
      if (problems.length) {
        throw new CliError(
          `La edición dejaría ${doc.fileName} ilegible para el parseo (${problems.join("; ")}). No se escribió ningún archivo.`,
        );
      }
    }
    return { path: doc.path, fileName: doc.fileName, before: doc.raw, after, existed: doc.exists, changed };
  });
}

/** Pinta una línea de diff: `+` verde, `-` rojo, `@@` cian (picocolors respeta NO_COLOR y las salidas sin terminal). */
function paint(line: string): string {
  if (line.startsWith("@@")) return pc.cyan(line);
  if (line.startsWith("+")) return pc.green(line);
  if (line.startsWith("-")) return pc.red(line);
  return line;
}

/**
 * Escribe los cambios calculados, cada archivo de forma atómica y solo si cambió; o, con `dryRun`,
 * muestra el diff de cada uno sin escribir. Antes de escribir se comprueba que ningún archivo haya
 * cambiado en disco desde que se leyó (ej. un agente o el operador lo estaban editando): si cambió
 * alguno, no se escribe ninguno.
 * @throws CliError archivo modificado por otro lado, o fallo de escritura
 */
export function commitChanges(planned: PlannedFile[], options: { dryRun: boolean; io: Io }): ChangeResult {
  const { dryRun, io } = options;
  const files = planned.map((file) => ({ path: file.path, fileName: file.fileName, changed: file.changed, written: false }));

  if (dryRun) {
    for (const file of planned) {
      if (!file.changed) {
        io.out(`${file.fileName}: sin cambios`);
        continue;
      }
      io.out(pc.bold(`--- ${file.path}${file.existed ? "" : " (archivo nuevo)"}`));
      for (const line of unifiedDiff(file.before, file.after)) io.out(paint(line));
    }
    io.out(pc.dim("--dry-run: no se escribió nada."));
    return { dryRun, files };
  }

  for (const file of planned) {
    if (!file.changed) continue;
    const now = readRaw(file.path);
    if ((now ?? "") !== file.before || (now !== null) !== file.existed) {
      throw new CliError(`${file.fileName} cambió en disco mientras se preparaba la edición. No se escribió ningún archivo: vuelve a intentarlo.`);
    }
  }
  planned.forEach((file, index) => {
    if (!file.changed) return;
    writeFileAtomic(file.path, file.after);
    files[index].written = true;
  });
  return { dryRun, files };
}
