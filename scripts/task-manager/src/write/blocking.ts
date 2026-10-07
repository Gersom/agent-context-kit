// Lo que comparten `block` y `unblock`: reescribir el campo `Bloqueos` de una tarea del backlog y
// mover su bloque entre «Tareas libres» y «Tareas bloqueadas / pospuestas». Sin formato nuevo: el
// campo sigue las convenciones de backlog.md y de la Regla 7 de rules.md (`` `[dependencia]` motivo ``
// al bloquear; `` `[Resuelto el <fecha>]` — era `[tag]` motivo `` al desbloquear, sin borrar el motivo).

import { LEADING_TAG_RE } from "../../../_shared/tasks/block-info.ts";
import type { Field, Range } from "../../../_shared/types.ts";
import { CliError } from "../cli/errors.ts";
import { removeBlock } from "../edit/layout.ts";
import type { Edit } from "../edit/edits.ts";
import { trimRange } from "../query/lines.ts";
import { findFieldOfKind, type Strings } from "./language.ts";
import { fieldBody, renderField } from "./render.ts";

/** Tags de bloqueo que mandan la tarea a «bloqueadas / pospuestas» (español e inglés). */
export const BLOCKING_TAGS = /^(dependencia|postergada|dependency|postponed)$/i;

/** El tag escrito por el usuario (`dependencia`, `[dependencia]`, `` `[Dependencia]` ``) en su forma mínima, o `null` si no es uno de los dos. */
export function parseTagFlag(value: string): string | null {
  const tag = value.trim().replace(/^`?\[?|\]?`?$/g, "").toLowerCase();
  return BLOCKING_TAGS.test(tag) ? tag : null;
}

/** El valor de `Bloqueos` de la tarea desbloqueada: `` `[Resuelto el <fecha>]` — era `[tag]` motivo `` (lo que seguía al tag se conserva, historial incluido). */
export function resolvedValue(value: string, date: string, S: Pick<Strings, "resolved" | "was">): string {
  const lead = value.match(LEADING_TAG_RE);
  if (!lead) throw new CliError("El campo de bloqueos no empieza con un tag `[...]`: no sé qué marcar como resuelto.");
  return `\`[${S.resolved} ${date}]\` — ${S.was} \`[${lead[2].trim()}]\`${value.slice(lead[0].length)}`;
}

/** El valor de `Bloqueos` de la tarea que se bloquea: el bloqueo vigente primero y, después, lo que ya hubiera (historial resuelto). */
export function blockedValue(tag: string, reason: string, existing: string | null): string {
  const head = `\`[${tag}]\` ${reason}`;
  if (!existing) return head;
  return `${head}${existing.includes("\n") || reason.includes("\n") ? "\n" : " "}${existing}`;
}

/**
 * El texto de un bloque de tarea con su campo `Bloqueos` cambiado. Si la tarea no tiene el campo,
 * lo agrega tras `Decisiones` (o `Descripción`, o el último campo) con la etiqueta `label`.
 * @param text texto LF del archivo
 * @param block rango del bloque sin líneas en blanco de los extremos (`trimRange`)
 */
export function withBlockers(text: string, block: Range, fields: Field[], label: string, value: string): string {
  const field = findFieldOfKind(fields, "blockers");
  const rendered = renderField(field?.label ?? label, value);
  if (field?.range) {
    const range = trimRange(text, field.range);
    return text.slice(block.start, range.start) + rendered + text.slice(range.end, block.end);
  }
  const after = findFieldOfKind(fields, "decisions") ?? findFieldOfKind(fields, "description") ?? fields[fields.length - 1];
  if (after?.range) {
    const end = trimRange(text, after.range).end;
    return `${text.slice(block.start, end)}\n${rendered}${text.slice(end, block.end)}`;
  }
  return `${text.slice(block.start, block.end)}\n\n${rendered}`;
}

/** El valor actual del campo `Bloqueos` (sin etiqueta), o `null` si falta, es un placeholder o está vacío. */
export function currentBlockers(text: string, fields: Field[]): string | null {
  const field = findFieldOfKind(fields, "blockers");
  if (!field || field.isPlaceholder) return null;
  return fieldBody(text, field) || null;
}

/** Un bloque de una sección de backlog.md (tarea o grupo): lo único que se necesita es su rango. */
export interface Block {
  range?: Range;
}

/**
 * Ediciones que sacan de una sección varios de sus bloques sin dejar huecos: los consecutivos se
 * sacan juntos como uno solo. La sección se cuenta entera (con grupos): si no queda ninguno, vuelve
 * a su texto de vacío.
 * @param blocks todos los bloques de la sección, en cualquier orden
 * @param picked los que se sacan (los mismos objetos de `blocks`)
 */
export function removeBlocks(text: string, blocks: Block[], picked: Block[], emptyText: string): Edit[] {
  const ordered = [...blocks].sort((a, b) => a.range!.start - b.range!.start);
  const runs: Block[][] = [];
  for (const [i, candidate] of ordered.entries()) {
    if (!picked.includes(candidate)) continue;
    const last = runs[runs.length - 1];
    if (last && ordered[i - 1] === last[last.length - 1]) last.push(candidate);
    else runs.push([candidate]);
  }
  return runs.map((run) => {
    const first = trimRange(text, run[0].range!);
    const last = trimRange(text, run[run.length - 1].range!);
    return removeBlock(text, { ...first, end: last.end, endLine: last.endLine }, emptyText, ordered.length > run.length);
  });
}
