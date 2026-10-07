// Utilidades de posición para mostrar fragmentos de un archivo: recortar las líneas en blanco que
// los rangos del parser arrastran (un bloque llega hasta antes del ancla siguiente) y recalcular
// sus líneas. Todo sobre el texto con saltos de línea LF (`Doc.text`), el que usan los `Range`.

import type { Range } from "../../../_shared/types.ts";

/** Número de línea (1-based) en la que cae un offset. */
export function lineAt(text: string, offset: number): number {
  let line = 1;
  for (let i = text.indexOf("\n"); i !== -1 && i < offset; i = text.indexOf("\n", i + 1)) line++;
  return line;
}

/**
 * El mismo rango sin las líneas en blanco del principio ni los espacios finales (incluido el
 * salto de línea final: `end` queda justo tras el último carácter visible). Las líneas se
 * recalculan; un rango vacío queda vacío.
 */
export function trimRange(text: string, range: Range): Range {
  const slice = text.slice(range.start, range.end);
  const leading = slice.match(/^(?:[ \t]*\n)*/)?.[0].length ?? 0;
  const trailing = slice.match(/\s*$/)?.[0].length ?? 0;
  const start = range.start + leading;
  const end = Math.max(start, range.end - trailing);
  if (end === start) return { startLine: lineAt(text, start), endLine: lineAt(text, start) - 1, start, end };
  return { startLine: lineAt(text, start), endLine: lineAt(text, end - 1), start, end };
}
