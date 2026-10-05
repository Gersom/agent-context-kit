// Procesamiento: arma el modelo que se pinta en pantalla a partir de lo que interpretó el
// parseo (progreso del plan, motivos de bloqueo, grupos, conteos y avisos).

import { parseBacklog } from "../parse/backlog.ts";
import { parseHandoff } from "../parse/handoff.ts";
import type {
  BlockedTask,
  CurrentTask,
  CurrentTaskLine,
  FreeGroup,
  Group,
  InProgress,
  Model,
  ParsedBacklog,
  ParsedFile,
  ParsedHandoff,
  Task,
} from "../shared/types.ts";
import { blockInfo } from "./block-info.ts";

/**
 * Modelo completo para la pantalla.
 * `backlogText: null` es válido (el set mínimo del skill no genera backlog.md).
 */
export function buildModel({
  handoffText,
  backlogText,
  readErrors = [],
}: {
  handoffText: string | null;
  backlogText: string | null;
  readErrors?: string[];
}): Model {
  const warnings = [...readErrors];
  const notes: string[] = [];

  let handoff: ParsedHandoff | null = null;
  if (handoffText == null) warnings.push("handoff.md no existe (¿se está reescribiendo?).");
  else if (!handoffText.trim()) warnings.push("handoff.md está vacío (¿se está reescribiendo?).");
  else handoff = parseHandoff(handoffText);

  let backlog: ParsedBacklog | null = null;
  if (backlogText == null) notes.push("Sin backlog.md (set mínimo del skill): solo se muestran la tarea en progreso y las pausadas.");
  else if (!backlogText.trim()) warnings.push("backlog.md está vacío (¿se está reescribiendo?).");
  else backlog = parseBacklog(backlogText);

  const parsedFiles: [string, ParsedFile | null][] = [["handoff.md", handoff], ["backlog.md", backlog]];
  for (const [name, parsed] of parsedFiles) {
    if (!parsed) continue;
    if (parsed.usedFallback) warnings.push(`${name} no tiene anclas de sección: se ubicaron las secciones por orden (plan B).`);
    if (parsed.missing.length) warnings.push(`${name}: no se encontró la sección ${parsed.missing.map((id) => `"${id}"`).join(", ")}.`);
    if (parsed.placeholders) warnings.push(`${name} tiene placeholders sin completar.`);
  }

  const inProgress = handoff?.inProgress;
  const current = inProgress?.task ? buildCurrent(inProgress.task, inProgress) : null;

  const grouped = backlog?.grouped ?? [];
  const freeGroups: FreeGroup[] = (backlog?.free.groups ?? []).map((ref) => ({
    ...ref,
    // El detalle de cada tarea vive en "Tareas agrupadas"; se enlaza por número.
    tasks: ref.taskNumbers.map((n) => findGroupedTask(grouped, n) ?? { number: n, label: null, title: null }),
  }));
  const freeTasks = backlog?.free.tasks ?? [];
  const blocked: BlockedTask[] = (backlog?.blocked ?? []).map((task) => ({ ...task, block: blockInfo(task) }));
  for (const task of blocked) {
    if (!task.block.tag) {
      warnings.push(`${task.label} ${task.number} está en "bloqueadas" sin bloqueo vigente: ¿moverla a libres? (Regla 7)`);
    }
  }
  const paused = handoff?.paused ?? [];

  return {
    hasBacklog: backlog != null,
    current,
    paused,
    free: { tasks: freeTasks, groups: freeGroups },
    blocked,
    grouped,
    counts: {
      paused: paused.length,
      free: freeTasks.length + freeGroups.reduce((sum, g) => sum + g.taskNumbers.length, 0),
      blocked: blocked.length,
    },
    warnings,
    notes,
  };
}

/** Tarea en progreso con el avance de su plan y el próximo paso. */
function buildCurrent(task: CurrentTaskLine, { steps, subsections }: InProgress): CurrentTask {
  const done = steps.filter((s) => s.done).length;
  const currentStep = steps.find((s) => !s.done) ?? null;
  // Por posición: en la plantilla la última subsección es "Próximo paso concreto".
  const last = subsections[subsections.length - 1];
  return {
    ...task,
    plan: { steps, done, total: steps.length, currentStep },
    nextStep: last?.body ? last.body : null,
    subsections,
  };
}

function findGroupedTask(grouped: Group[], number: number): Task | null {
  for (const group of grouped) {
    const task = group.tasks.find((t) => t.number === number);
    if (task) return task;
  }
  return null;
}
