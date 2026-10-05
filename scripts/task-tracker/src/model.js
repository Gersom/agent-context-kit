// Procesamiento: arma el modelo que se pinta en pantalla a partir de lo que interpretó el
// parser (progreso del plan, motivos de bloqueo, grupos, conteos y avisos).

import { parseBacklog, parseHandoff } from "./parser.js";

// Tag `[...]` de un valor de campo: con backticks (`[dependencia]`) o sin ellos, sin
// confundirlo con un link markdown `[texto](url)`.
const TAG_RE = /(`?)\[([^\]\n]+)\]\1(?!\()/g;
const RESOLVED_TAG_RE = /^(resuelto|resolved)\b/i;
const PLACEHOLDER_TAG_RE = /^placeholder/i;

/**
 * Tag de bloqueo vigente de una tarea (ej. `dependencia`, `postergada`) y su motivo. Se busca
 * en cualquier campo porque las etiquetas están traducidas, mirando solo el **primer** tag de
 * cada campo:
 * - Si es `[Resuelto…]`, el campo entero es historial (Regla 7) y se salta.
 * - Si no, es el bloqueo vigente. Por convención, cuando una tarea se vuelve a bloquear, el
 *   bloqueo vigente va primero y el historial resuelto después (ver "Anclas de sección" en
 *   src/docs/template-architecture.md), así que el motivo se corta donde empieza ese historial.
 * Los placeholders de la plantilla no cuentan como tag.
 * @param {{ fields: { label: string, value: string }[] }} task
 * @returns {{ tag: string | null, reason: string | null }}
 */
export function blockInfo(task) {
  for (const field of task.fields) {
    const tags = [...field.value.matchAll(TAG_RE)];
    const first = tags[0];
    if (!first) continue;
    const tag = first[2].trim();
    if (RESOLVED_TAG_RE.test(tag) || PLACEHOLDER_TAG_RE.test(tag)) continue;

    const history = tags.slice(1).find((m) => RESOLVED_TAG_RE.test(m[2].trim()));
    const reason = field.value
      .slice(first.index + first[0].length, history ? history.index : undefined)
      .replace(/^[\s—–-]+/, "")
      // Si el historial viene precedido por una etiqueta tipo "Antes:", se descarta.
      .replace(/\s*[^\s.]+:\s*$/, "")
      .trim();
    return { tag, reason: reason || null };
  }
  return { tag: null, reason: null };
}

/**
 * Modelo completo para la pantalla.
 * @param {{ handoffText: string | null, backlogText: string | null, readErrors?: string[] }} input
 *   `backlogText: null` es válido (el set mínimo del skill no genera backlog.md).
 */
export function buildModel({ handoffText, backlogText, readErrors = [] }) {
  const warnings = [...readErrors];
  const notes = [];

  let handoff = null;
  if (handoffText == null) warnings.push("handoff.md no existe (¿se está reescribiendo?).");
  else if (!handoffText.trim()) warnings.push("handoff.md está vacío (¿se está reescribiendo?).");
  else handoff = parseHandoff(handoffText);

  let backlog = null;
  if (backlogText == null) notes.push("Sin backlog.md (set mínimo del skill): solo se muestran la tarea en progreso y las pausadas.");
  else if (!backlogText.trim()) warnings.push("backlog.md está vacío (¿se está reescribiendo?).");
  else backlog = parseBacklog(backlogText);

  for (const [name, parsed] of [["handoff.md", handoff], ["backlog.md", backlog]]) {
    if (!parsed) continue;
    if (parsed.usedFallback) warnings.push(`${name} no tiene anclas de sección: se ubicaron las secciones por orden (plan B).`);
    if (parsed.missing.length) warnings.push(`${name}: no se encontró la sección ${parsed.missing.map((id) => `"${id}"`).join(", ")}.`);
    if (parsed.placeholders) warnings.push(`${name} tiene placeholders sin completar.`);
  }

  const current = handoff?.inProgress.task ? buildCurrent(handoff.inProgress) : null;

  const grouped = backlog?.grouped ?? [];
  const freeGroups = (backlog?.free.groups ?? []).map((ref) => ({
    ...ref,
    // El detalle de cada tarea vive en "Tareas agrupadas"; se enlaza por número.
    tasks: ref.taskNumbers.map((n) => findGroupedTask(grouped, n) ?? { number: n, label: null, title: null }),
  }));
  const freeTasks = backlog?.free.tasks ?? [];
  const blocked = (backlog?.blocked ?? []).map((task) => ({ ...task, block: blockInfo(task) }));
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

function buildCurrent({ task, steps, subsections }) {
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

function findGroupedTask(grouped, number) {
  for (const group of grouped) {
    const task = group.tasks.find((t) => t.number === number);
    if (task) return task;
  }
  return null;
}
