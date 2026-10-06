// Referencias a otras tareas dentro de un texto (ej. el motivo de un bloqueo: "depende de la
// Tarea 3"), independiente del idioma: se usan las etiquetas que el propio documento usa en
// sus headers de tarea ("Tarea", "Task"…), además de la forma corta `T-N`.

import type { TaskRef } from "../types.ts";

export interface TaskIndex {
  /** Número → título de cada tarea conocida (backlog, handoff o history). */
  titles: Map<number, string>;
  /** Números de las tareas que ya figuran cerradas en history.md. */
  closed: Set<number>;
  /** Etiquetas usadas en los headers de tarea del proyecto (ej. "Tarea"). */
  labels: Set<string>;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Tareas mencionadas en `text` como `<Etiqueta> N` o `T-N`, sin duplicados, en orden de
 * aparición y sin contar la propia tarea (`selfNumber`).
 */
export function findTaskRefs(text: string | null, selfNumber: number, index: TaskIndex): TaskRef[] {
  if (!text) return [];
  const labels = [...index.labels].filter(Boolean).map(escapeRegExp);
  const byLabel = labels.length ? `(?:${labels.join("|")})\\s+(\\d+)|` : "";
  // Límites de palabra con letras Unicode (\b no reconoce letras acentuadas).
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${byLabel}T-(\\d+))(?![\\p{N}])`, "gu");

  const refs: TaskRef[] = [];
  const seen = new Set<number>([selfNumber]);
  for (const match of text.matchAll(re)) {
    const raw = labels.length ? (match[1] ?? match[2]) : match[1];
    if (raw === undefined) continue;
    const number = Number(raw);
    if (seen.has(number)) continue;
    seen.add(number);
    refs.push({ number, title: index.titles.get(number) ?? null, closed: index.closed.has(number) });
  }
  return refs;
}
