// Recorrido línea a línea de un documento con la misma visión que el parseo: las líneas que
// empiezan dentro de un comentario HTML no existen, y los bloques de código se marcan para
// poder saltarlos. Los números de línea siempre son los del texto original.

import { commentSpans, commentStateAfter } from "../../_shared/parse/markdown.ts";

export interface ScanLine {
  /** Número de línea (1-based) en el texto original. */
  n: number;
  raw: string;
  /** La línea sin sus comentarios HTML (los que empiezan o terminan en ella). */
  visible: string;
  /** `true` en las líneas de un bloque de código, marcadores ``` o ~~~ incluidos. */
  inFence: boolean;
}

const FENCE_RE = /^\s*(```|~~~)/;

/** El texto sin el contenido de sus comentarios HTML pero con todos sus saltos de línea: las líneas siguen alineadas. */
function maskComments(text: string): string {
  let out = "";
  let at = 0;
  for (const [from, to] of commentSpans(text)) {
    out += text.slice(at, from) + text.slice(from, to).replace(/[^\n]/g, "");
    at = to;
  }
  return out + text.slice(at);
}

/**
 * Líneas de `text` (con saltos de línea LF) sin las que empiezan dentro de un comentario HTML,
 * igual que `findSections` y `parseHistory`. Las líneas de bloques de código vienen marcadas.
 */
export function scanLines(text: string): ScanLine[] {
  const lines = text.split("\n");
  const masked = maskComments(text).split("\n");
  const out: ScanLine[] = [];
  let inComment = false;
  let inFence = false;
  lines.forEach((raw, i) => {
    const startsInComment = inComment;
    inComment = commentStateAfter(raw, inComment);
    if (startsInComment) return;
    if (FENCE_RE.test(raw)) {
      inFence = !inFence;
      out.push({ n: i + 1, raw, visible: masked[i], inFence: true });
      return;
    }
    out.push({ n: i + 1, raw, visible: masked[i], inFence });
  });
  return out;
}

/** Las líneas de `scanLines` que no son de un bloque de código. */
export function proseLines(text: string): ScanLine[] {
  return scanLines(text).filter((line) => !line.inFence);
}
