// Ediciones quirúrgicas sobre el texto ORIGINAL de un archivo: reemplazar un rango, insertar en un
// offset o borrar un rango, sin reformatear nada de lo que no se toca (principio 5 de
// docs/philosophy.md). Los rangos y offsets son los del texto normalizado a LF que devuelven los
// parsers de `scripts/_shared/parse/`; acá se traducen al crudo con `EolInfo` y lo insertado se
// convierte al final de línea del archivo, así un archivo CRLF sigue siendo CRLF y uno LF, LF.

import type { EolInfo } from "../../../_shared/parse/positions.ts";
import { toEol } from "../../../_shared/parse/positions.ts";
import type { Range } from "../../../_shared/types.ts";
import { CliError } from "../cli/errors.ts";

/** Una edición, en offsets del texto LF (`[start, end)`, igual que `Range`). Insertar es `start === end`. */
export interface Edit {
  start: number;
  end: number;
  /** Texto nuevo, con LF o el final de línea que sea: se convierte al del archivo. Vacío = borrar. */
  text: string;
}

/** Reemplaza el rango `range` por `text`. */
export function replaceRange(range: Pick<Range, "start" | "end">, text: string): Edit {
  return { start: range.start, end: range.end, text };
}

/** Inserta `text` en el offset `offset` (antes del carácter que está ahí). */
export function insertAt(offset: number, text: string): Edit {
  return { start: offset, end: offset, text };
}

/** Borra el rango `range`. */
export function deleteRange(range: Pick<Range, "start" | "end">): Edit {
  return { start: range.start, end: range.end, text: "" };
}

/**
 * Aplica las ediciones al texto crudo y devuelve el texto nuevo. No escribe nada.
 *
 * Las ediciones se validan antes de aplicar: dentro de `[0, text.length]`, con `start <= end` y
 * sin solaparse (dos ediciones que se tocan en un borde, ej. una inserción justo al final de un
 * reemplazo, no se solapan). Varias inserciones en el mismo offset quedan en el orden en que se
 * pasaron. Se aplican en orden de posición sobre el original, así los offsets de unas no se
 * corren por las otras.
 * @param raw texto crudo del archivo (con sus finales de línea)
 * @param eol resultado de `normalizeEol(raw)`: traduce los offsets LF al crudo y da el final de línea de lo insertado
 * @param edits ediciones en offsets del texto normalizado, en cualquier orden
 * @throws CliError rango fuera del texto o ediciones solapadas
 */
export function applyEdits(raw: string, eol: EolInfo, edits: Edit[]): string {
  const total = eol.text.length;
  const sorted = edits
    .map((edit, order) => ({ edit, order }))
    .sort((a, b) => a.edit.start - b.edit.start || a.edit.end - b.edit.end || a.order - b.order)
    .map(({ edit }) => edit);

  for (const { start, end } of sorted) {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > total) {
      throw new CliError(`Edición inválida: el rango [${start}, ${end}) no cabe en el texto (longitud ${total}).`);
    }
  }
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const next = sorted[i];
    if (next.start < prev.end) {
      throw new CliError(`Ediciones solapadas: [${prev.start}, ${prev.end}) y [${next.start}, ${next.end}).`);
    }
  }

  let out = "";
  let cursor = 0; // offset del crudo hasta donde ya se copió
  for (const { start, end, text } of sorted) {
    const from = eol.toRaw(start);
    out += raw.slice(cursor, from) + toEol(text, eol.eol);
    cursor = eol.toRaw(end);
  }
  return out + raw.slice(cursor);
}
