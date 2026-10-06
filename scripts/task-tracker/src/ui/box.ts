// Recuadros de la pantalla: un borde de esquinas redondeadas por tipo de tarea, con el título del
// tipo cortando el borde superior a la izquierda y el archivo del que sale a la derecha:
//
//   ╭─ ▶ EN PROGRESO ─────────────── handoff.md ─╮
//   │ contenido                                   │
//   ╰─────────────────────────────────────────────╯
//
// Todas las medidas son en columnas visibles (sin códigos ANSI), así el borde derecho queda
// alineado aunque el contenido tenga colores.

import { truncate, visibleLength } from "./format.ts";

export type Paint = (s: string) => string;

/** Tramo de una línea de contenido con su estilo. */
export interface Segment {
  text: string;
  paint?: Paint;
}

const identity: Paint = (s) => s;

/** Columnas que el borde y los márgenes le quitan al contenido (`│ ` + ` │`). */
export const BOX_PADDING = 4;

/** Borde superior: `╭─ <título> ─…─ <archivo> ─╮`. Si no entra, se recorta el título. */
export function boxTop(
  title: string,
  file: string,
  width: number,
  { border = identity, title: titlePaint = identity, file: filePaint = identity }: { border?: Paint; title?: Paint; file?: Paint } = {},
): string {
  // `╭─ ` + título + ` ` + relleno (≥ 1) + ` ` + archivo + ` ─╮`
  const fixed = 3 + 1 + 1 + visibleLength(file) + 3;
  const shownTitle = truncate(title, Math.max(1, width - fixed - 1));
  const fill = Math.max(1, width - fixed - visibleLength(shownTitle));
  return border("╭─ ") + titlePaint(shownTitle) + border(` ${"─".repeat(fill)} `) + filePaint(file) + border(" ─╮");
}

/**
 * Línea de contenido: `│ <tramos> │`, con el contenido recortado al ancho interior (el último
 * tramo que no entra se corta con "…") y relleno con espacios hasta el borde derecho.
 */
export function boxRow(segments: Segment[], width: number, border: Paint = identity): string {
  const inner = Math.max(1, width - BOX_PADDING);
  let used = 0;
  let content = "";
  for (const segment of segments) {
    if (used >= inner) break;
    const paint = segment.paint ?? identity;
    // Un salto de línea rompería el borde: el contenido de una fila va siempre en una línea.
    const text = segment.text.replace(/\s*\n\s*/g, " ");
    const room = inner - used;
    const shown = visibleLength(text) <= room ? text : truncate(text, room);
    content += paint(shown);
    used += visibleLength(shown);
  }
  return border("│ ") + content + " ".repeat(Math.max(0, inner - used)) + border(" │");
}

/** Borde inferior: `╰─…─╯`. */
export function boxBottom(width: number, border: Paint = identity): string {
  return border(`╰${"─".repeat(Math.max(0, width - 2))}╯`);
}
