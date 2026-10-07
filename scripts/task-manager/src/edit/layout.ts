// Dónde y cómo poner o sacar un bloque (una tarea) en una sección, sin alterar nada más: funciones
// puras sobre el texto LF de un archivo (`Doc.text`) y los rangos del parser, que devuelven la
// edición (`Edit`) a aplicar. Conservan el espaciado del archivo (una línea en blanco entre bloques,
// o las que ya use) y el texto de sección vacía («Ninguna.») se reemplaza al agregar y se restaura
// al quedar sin tareas.

import { commentSpans } from "../../../_shared/parse/markdown.ts";
import type { Range } from "../../../_shared/types.ts";
import { trimRange } from "../query/lines.ts";
import { deleteRange, type Edit, insertAt, replaceRange } from "./edits.ts";

/** Desde el primer hasta el último carácter que no es un espacio de `range`; `null` si todo es blanco. */
export function contentBounds(text: string, range: Pick<Range, "start" | "end">): { start: number; end: number } | null {
  const slice = text.slice(range.start, range.end);
  if (!slice.trim()) return null;
  return { start: range.start + (slice.length - slice.trimStart().length), end: range.start + slice.trimEnd().length };
}

/**
 * Lo que separa los bloques de una sección: lo que ya hay entre los dos últimos (una o más líneas
 * en blanco, tal cual), o una línea en blanco si no hay dos o no los separa solo eso.
 * @param ranges rangos de los bloques de la sección, en cualquier orden
 */
export function blockSeparator(text: string, ranges: Range[]): string {
  const sorted = ranges.map((range) => trimRange(text, range)).sort((a, b) => a.start - b.start);
  if (sorted.length < 2) return "\n\n";
  const gap = text.slice(sorted[sorted.length - 2].end, sorted[sorted.length - 1].start);
  return /^\n{2,}$/.test(gap) ? gap : "\n\n";
}

export interface InsertBlockOptions {
  /** La sección ya tiene bloques: el nuevo va al final. Si no, reemplaza su texto de vacío o placeholder. */
  hasBlocks: boolean;
  /** Lo que va entre el último bloque y el nuevo (por defecto, una línea en blanco; ver `blockSeparator`). */
  separator?: string;
}

/**
 * Edición que pone `block` (sin salto de línea final) en el cuerpo de una sección.
 * - Con bloques: lo agrega justo después del último contenido de la sección, antes de las líneas en
 *   blanco que la separan de la siguiente.
 * - Sin bloques: reemplaza el texto que haya («Ninguna.», un placeholder, la tarea anterior...) y
 *   deja en su lugar los comentarios HTML del principio y las líneas en blanco de alrededor. Si el
 *   cuerpo es solo espacio, lo reemplaza dejando una línea en blanco a cada lado.
 * @param body `bodyRange` de la sección (desde la línea siguiente a su header hasta antes del ancla siguiente)
 */
export function insertBlock(text: string, body: Pick<Range, "start" | "end">, block: string, options: InsertBlockOptions): Edit {
  const bounds = contentBounds(text, body);
  if (bounds && options.hasBlocks) return insertAt(bounds.end, (options.separator ?? "\n\n") + block);

  if (!bounds) {
    const lead = body.start === 0 || text[body.start - 1] === "\n" ? "" : "\n";
    const tail = body.end < text.length ? "\n" : "";
    return replaceRange(body, `${lead}\n${block}\n${tail}`);
  }

  // Lo reemplazable es lo que sigue al último comentario HTML del cuerpo.
  const spans = commentSpans(text.slice(bounds.start, bounds.end));
  let from = bounds.start + (spans.length ? spans[spans.length - 1][1] : 0);
  while (from < bounds.end && /\s/.test(text[from])) from++;
  if (from >= bounds.end) return insertAt(bounds.end, `\n\n${block}`); // solo comentarios
  return replaceRange({ start: from, end: bounds.end }, block);
}

/**
 * Edición que cambia el texto de una subsección `###` (lo que sigue a su header) y deja intactos su
 * header, los comentarios HTML con los que empieza el cuerpo y las líneas en blanco de alrededor.
 * @param sub rango de la subsección completa (header incluido; `Subsection.range`)
 * @param body texto nuevo, sin salto de línea final
 */
export function replaceSubsectionBody(text: string, sub: Pick<Range, "start" | "end">, body: string): Edit {
  const headerEnd = text.indexOf("\n", sub.start);
  const range = { start: headerEnd === -1 || headerEnd >= sub.end ? sub.end : headerEnd + 1, end: sub.end };
  const bounds = contentBounds(text, range);
  if (!bounds) return insertBlock(text, range, body, { hasBlocks: false });

  // Los comentarios del principio del cuerpo (los de la plantilla) se conservan; lo demás se reemplaza.
  let from = bounds.start;
  for (const [start, end] of commentSpans(text.slice(bounds.start, bounds.end))) {
    if (text.slice(from, bounds.start + start).trim()) break;
    from = bounds.start + end;
  }
  while (from < bounds.end && /\s/.test(text[from])) from++;
  if (from >= bounds.end) return insertAt(bounds.end, `\n\n${body}`);
  return replaceRange({ start: from, end: bounds.end }, body);
}

/**
 * Edición que saca un bloque de su sección sin dejar huecos ni líneas en blanco dobles.
 * @param block rango del bloque sin las líneas en blanco de los extremos (`trimRange`)
 * @param emptyText texto con el que queda la sección si era su único bloque («Ninguna.»)
 * @param othersExist la sección tiene más bloques además de este
 */
export function removeBlock(text: string, block: Range, emptyText: string, othersExist: boolean): Edit {
  if (!othersExist) return replaceRange(block, emptyText);

  let after = block.end;
  while (after < text.length && /\s/.test(text[after])) after++;
  if (after < text.length) {
    // Hasta el inicio de la línea del contenido que sigue: el espaciado anterior se conserva.
    return deleteRange({ start: block.start, end: Math.max(block.end, text.lastIndexOf("\n", after - 1) + 1) });
  }

  // Era lo último del archivo: se quita también lo que lo separaba del contenido anterior.
  let before = block.start;
  while (before > 0 && /\s/.test(text[before - 1])) before--;
  return replaceRange({ start: before, end: text.length }, text.endsWith("\n") ? "\n" : "");
}
