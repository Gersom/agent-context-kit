// Idioma de lo que el script escribe. La documentación de cada proyecto está en su idioma (regla 3
// de rules.md) y los parsers no dependen de él, pero al AGREGAR una tarea o reescribir el handoff
// hay que elegir las etiquetas. Se copian de lo que el archivo ya usa (`Tarea`/`Task`, las
// etiquetas de los campos de una tarea existente) y solo si no hay de dónde copiar se usa una tabla
// mínima en español o inglés. No se inventan traducciones a otros idiomas: ante lo desconocido se
// usa español y se avisa.

import type { Field } from "../../../_shared/types.ts";

export type Lang = "es" | "en";

/** Campos de una tarea de backlog que el script reconoce en cualquier idioma conocido. */
export type FieldKind = "description" | "decisions" | "blockers" | "trigger" | "details" | "added";

const FIELD_PATTERNS: Record<FieldKind, RegExp> = {
  description: /^(descripci[oó]n|description)$/i,
  decisions: /^(decisiones|decisions)$/i,
  blockers: /^(bloqueos?|blockers?)$/i,
  trigger: /^(disparador|trigger)$/i,
  details: /^(detalles?|details?)$/i,
  added: /^(agregada|added)$/i,
};

/** Primera palabra de una etiqueta (`Decisiones/temas a definir antes de empezar` → `Decisiones`). */
function firstWord(label: string): string {
  return label.trim().split(/[\s/:]+/)[0] ?? "";
}

/** ¿La etiqueta es la del campo `kind`, en español o inglés? */
export function isFieldKind(label: string, kind: FieldKind): boolean {
  return FIELD_PATTERNS[kind].test(firstWord(label));
}

/** El campo de la lista que es de ese tipo, si hay. */
export function findFieldOfKind(fields: Field[], kind: FieldKind): Field | undefined {
  return fields.find((field) => isFieldKind(field.label, kind));
}

/** Texto que significa «nada» en una tarea (`Ninguno.`, `None`...): no se copia al handoff. */
export const NONE_RE = /^(ninguno|ninguna|none|n\/a)\.?$/i;

/** Textos que el script escribe cuando no puede copiarlos de un archivo. */
export interface Strings {
  task: string;
  none: string;
  emptySection: string;
  defaultTrigger: string;
  fields: Record<FieldKind, string>;
  origin: string;
  /** «por» en `Agregada: <fecha> por <operador>`. */
  by: string;
  // Subsecciones del handoff, en el orden de la plantilla.
  plan: string;
  missing: string;
  decisions: string;
  next: string;
  mode: string;
  closeStep: string;
  missingWithPlan: string;
  missingNoPlan: string;
  nextNoPlan: string;
  noDecisions: string;
  // Lo que escriben `pause`, `resume` y `step`.
  /** Texto de «Tarea en progreso» sin tarea. */
  noTask: string;
  /** Campos de una tarea pausada que no son subsecciones del handoff. */
  why: string;
  waits: string;
  /** Encabezado de la lista de pasos pendientes que `step` escribe en «Qué falta». */
  pendingSteps: string;
  /** «Qué falta» cuando ya no queda ningún paso pendiente. */
  allDone: string;
  /** «Próximo paso concreto» cuando ya no queda ningún paso pendiente. */
  planDone: string;
  // Lo que escribe `unblock`: `[Resuelto el <fecha>] — era <bloqueo original>`.
  resolved: string;
  was: string;
}

export const STRINGS: Record<Lang, Strings> = {
  es: {
    task: "Tarea",
    none: "Ninguno.",
    emptySection: "Ninguna.",
    defaultTrigger: "cuando el operador pregunte por tareas pendientes.",
    fields: {
      description: "Descripción",
      decisions: "Decisiones/temas a definir antes de empezar",
      blockers: "Bloqueos",
      trigger: "Disparador",
      details: "Detalles",
      added: "Agregada",
    },
    origin: "Origen",
    by: "por",
    plan: "Plan",
    missing: "Qué falta",
    decisions: "Decisiones a medio camino",
    next: "Próximo paso concreto",
    mode: "Modo de ejecución acordado",
    closeStep: "Documentar cierre de tarea",
    missingWithPlan: "Todos los pasos del plan.",
    missingNoPlan: "Toda la tarea.",
    nextNoPlan: "Empezar la tarea.",
    noDecisions: "Ninguna.",
    noTask: "Sin tarea en curso",
    why: "Por qué se pausó",
    waits: "Qué espera para retomarse",
    pendingSteps: "Pasos pendientes:",
    allDone: "Todos los pasos del plan están hechos; falta cerrar la tarea.",
    planDone: "Plan completo: falta cerrar la tarea.",
    resolved: "Resuelto el",
    was: "era",
  },
  en: {
    task: "Task",
    none: "None.",
    emptySection: "None.",
    defaultTrigger: "when the operator asks about pending tasks.",
    fields: {
      description: "Description",
      decisions: "Decisions/topics to settle before starting",
      blockers: "Blockers",
      trigger: "Trigger",
      details: "Details",
      added: "Added",
    },
    origin: "Origen",
    by: "by",
    plan: "Plan",
    missing: "What's left",
    decisions: "Decisions along the way",
    next: "Next concrete step",
    mode: "Agreed execution mode",
    closeStep: "Document task closure",
    missingWithPlan: "All the plan steps.",
    missingNoPlan: "The whole task.",
    nextNoPlan: "Start the task.",
    noDecisions: "None.",
    noTask: "No task in progress",
    why: "Why it was paused",
    waits: "What it is waiting for",
    pendingSteps: "Pending steps:",
    allDone: "All the plan steps are done; the task is left to close.",
    planDone: "Plan complete: the task is left to close.",
    resolved: "Resolved on",
    was: "was",
  },
};

const ES_WORDS = /^(tarea|descripci[oó]n|bloqueos?|decisiones|disparador|agregada|detalles?)$/i;
const EN_WORDS = /^(task|description|blockers?|decisions|trigger|added|details?)$/i;

export interface DetectedLanguage {
  lang: Lang;
  /** Qué avisar al operador si no se pudo determinar (se usó español); `null` si se reconoció. */
  notice: string | null;
}

/**
 * Idioma según las palabras que ya usa el archivo: la de los headers de tarea (`Tarea`/`Task`) o las
 * etiquetas de sus campos, la primera que se reconozca. Sin ninguna, o con una desconocida, es
 * español con un aviso.
 */
export function detectLanguage(labels: string[]): DetectedLanguage {
  for (const label of labels) {
    const word = firstWord(label);
    if (ES_WORDS.test(word)) return { lang: "es", notice: null };
    if (EN_WORDS.test(word)) return { lang: "en", notice: null };
  }
  return {
    lang: "es",
    notice: labels.length
      ? `No reconozco el idioma de «${labels[0]}» (solo español e inglés): usé español para las etiquetas.`
      : "No pude determinar el idioma de los archivos (no hay tareas que lo indiquen): usé español para las etiquetas.",
  };
}
