// Tag de bloqueo vigente de una tarea bloqueada y su motivo, independiente del idioma.

import type { BlockInfo, Field } from "../shared/types.ts";

// Tag `[...]` con backticks (`[dependencia]`) o sin ellos, sin confundirlo con un link markdown
// `[texto](url)`. LEADING_TAG_RE solo acepta el tag con el que empieza el valor del campo.
const LEADING_TAG_RE = /^\s*(`?)\[([^\]\n]+)\]\1(?!\()/;
const TAG_RE = /(`?)\[([^\]\n]+)\]\1(?!\()/g;
const RESOLVED_TAG_RE = /^(resuelto|resolved)\b/i;
const PLACEHOLDER_TAG_RE = /^placeholder/i;

/**
 * Tag de bloqueo vigente de una tarea (ej. `dependencia`, `postergada`) y su motivo. Se busca
 * en cualquier campo porque las etiquetas están traducidas, pero un tag solo cuenta si es el
 * **inicio** del valor del campo (así un `[algo]` en medio de una descripción no se toma como
 * bloqueo):
 * - Si el tag inicial es `[Resuelto…]`, el campo entero es historial (Regla 7) y se salta.
 * - Si no, es el bloqueo vigente. Por convención, cuando una tarea se vuelve a bloquear, el
 *   bloqueo vigente va primero y el historial resuelto después (ver "Anclas de sección" en
 *   src/docs/template-architecture.md), así que el motivo se corta donde empieza ese historial.
 * Los placeholders de la plantilla no cuentan como tag.
 */
export function blockInfo(task: { fields: Pick<Field, "label" | "value">[] }): BlockInfo {
  for (const field of task.fields) {
    const lead = field.value.match(LEADING_TAG_RE);
    if (!lead) continue;
    const tag = lead[2].trim();
    if (RESOLVED_TAG_RE.test(tag) || PLACEHOLDER_TAG_RE.test(tag)) continue;

    const rest = field.value.slice(lead[0].length);
    const history = [...rest.matchAll(TAG_RE)].find((m) => RESOLVED_TAG_RE.test(m[2].trim()));
    let reason = (history ? rest.slice(0, history.index) : rest).replace(/^[\s—–-]+/, "");
    // Si el historial viene precedido por una etiqueta tipo "Antes:", se descarta (solo en ese
    // caso: sin historial, un motivo que termina en "ver:" queda intacto).
    if (history) reason = reason.replace(/\s*[^\s.]+:\s*$/, "");
    reason = reason.trim();
    return { tag, reason: reason || null };
  }
  return { tag: null, reason: null };
}
