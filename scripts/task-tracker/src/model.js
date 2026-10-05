// Procesamiento: arma el modelo que se pinta en pantalla a partir de lo que interpretó el
// parser (progreso del plan, motivos de bloqueo, grupos, conteos y avisos).

import { parseBacklog, parseHandoff } from "./parser.js";

// Primer tag `[...]` de un valor de campo: con backticks (`[dependencia]`) o sin ellos, sin
// confundirlo con un link markdown `[texto](url)`.
const TAG_RES = [/`\[([^\]\n]+)\]`/g, /\[([^\]\n]+)\](?!\()/g];
const RESOLVED_TAG_RE = /^(resuelto|resolved)\b/i;

/**
 * Tag de bloqueo de una tarea (ej. `dependencia`, `postergada`) y el valor del campo donde
 * aparece. Se busca en cualquier campo porque las etiquetas están traducidas; se ignoran los
 * tags de bloqueos ya resueltos (`[Resuelto el <fecha>]`) y los placeholders.
 * @param {{ fields: { label: string, value: string }[] }} task
 * @returns {{ tag: string | null, reason: string | null }}
 */
export function blockInfo(task) {
  for (const re of TAG_RES) {
    for (const field of task.fields) {
      for (const match of field.value.matchAll(re)) {
        const tag = match[1].trim();
        if (RESOLVED_TAG_RE.test(tag) || /^placeholder/i.test(tag)) continue;
        const reason = field.value.replace(match[0], "").replace(/^[\s—–-]+/, "").trim();
        return { tag, reason: reason || null };
      }
    }
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
