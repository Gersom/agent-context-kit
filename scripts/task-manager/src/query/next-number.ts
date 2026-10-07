// «Próximo número de tarea» de backlog.md: una línea `**Etiqueta:** N` en la introducción del
// archivo (antes de la primera sección). La etiqueta está traducida, así que no se busca por su
// texto sino por su forma: un campo en negrita cuyo valor es solo un número.

import { commentStateAfter } from "../../../_shared/parse/markdown.ts";

export interface NextTaskNumber {
  value: number;
  /** Línea (1-based) donde está. */
  line: number;
  /** Dónde están los dígitos del número en `text` (`[start, end)`), para reemplazarlos sin tocar el resto de la línea. */
  start: number;
  end: number;
}

const ANCHOR_RE = /^\s*<!--\s*agent-context-kit:section=[a-z-]+\s*-->\s*$/;
const H2_RE = /^##(?!#)\s/;
const FENCE_RE = /^\s*(```|~~~)/;
// `**Próximo número de tarea:** 32` (acepta también `**Etiqueta**: 32`).
const NEXT_NUMBER_RE = /^\s*\*\*[^*\n]+?(?::\*\*|\*\*:)\s*(\d+)\s*$/;

/**
 * Valor y línea de «Próximo número de tarea», o `null` si el archivo no lo tiene (ej. backlog
 * ausente). Solo mira la introducción: se detiene en la primera ancla o `## ` y se salta
 * comentarios HTML y bloques de código, como el parser.
 * @param text documento con saltos de línea LF
 */
export function findNextTaskNumber(text: string): NextTaskNumber | null {
  const lines = text.split("\n");
  let inComment = false;
  let inFence = false;
  let offset = 0; // offset de `text` en que empieza la línea `i`
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = offset;
    offset += line.length + 1;
    const startsInComment = inComment;
    inComment = commentStateAfter(line, inComment);
    if (startsInComment) continue;
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (ANCHOR_RE.test(line) || H2_RE.test(line)) return null;
    const match = line.match(NEXT_NUMBER_RE);
    if (match) {
      const start = lineStart + line.lastIndexOf(match[1]);
      return { value: Number(match[1]), line: i + 1, start, end: start + match[1].length };
    }
  }
  return null;
}
