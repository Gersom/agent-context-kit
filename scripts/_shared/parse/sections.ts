// Secciones `## ` de handoff.md y backlog.md, ubicadas por las anclas
// `<!-- agent-context-kit:section=<id> -->` (ver src/docs/template-architecture.md, sección
// "Anclas de sección"), con plan B por orden de aparición. No depende del idioma.

import type { Range, Section, SectionsResult } from "../types.ts";
import { commentStateAfter } from "./markdown.ts";
import { BodyPos, LineIndex } from "./positions.ts";

/** Ids de sección por archivo, en el orden en que aparecen en la plantilla (plan B posicional). */
export const HANDOFF_SECTIONS: string[] = ["in-progress", "paused"];
export const BACKLOG_SECTIONS: string[] = ["free", "blocked", "grouped"];

export const ANCHOR_RE =/^\s*<!--\s*agent-context-kit:section=([a-z-]+)\s*-->\s*$/;
const H2_RE = /^##(?!#)\s+(.+?)\s*$/;
const FENCE_RE = /^\s*(```|~~~)/;

/**
 * Divide el documento en secciones `## `. Cada una se identifica por el ancla de la línea no
 * vacía anterior a su header. Si el documento no tiene ninguna ancla, se asignan los ids por
 * orden de aparición (plan B, para docs generados antes de existir las anclas).
 * Los headers dentro de comentarios HTML o bloques de código no cuentan.
 * Cada sección trae sus posiciones en el texto original (`headerRange`, `bodyRange`, `anchorRange`;
 * ver `Range`). El plan B no pierde posiciones: solo `anchorRange` queda en `null`.
 * @param text documento con saltos de línea LF
 * @param expectedIds ids esperados, en el orden de la plantilla
 * @param index índice de líneas de `text`, si el llamador ya lo tiene
 */
export function findSections(text: string, expectedIds: string[], index: LineIndex = new LineIndex(text)): SectionsResult {
  const lines = text.split("\n");
  const headers: { index: number; header: string; anchor: string | null; anchorLine: number | null }[] = [];
  let inComment = false;
  let inFence = false;
  let pendingAnchor: { id: string; line: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const startsInComment = inComment;
    inComment = commentStateAfter(line, inComment);
    if (startsInComment) continue;

    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      pendingAnchor = null;
      continue;
    }
    if (inFence) continue;

    const anchor = line.match(ANCHOR_RE);
    if (anchor) {
      pendingAnchor = { id: anchor[1], line: i };
      continue;
    }
    const h2 = line.match(H2_RE);
    if (h2) {
      headers.push({ index: i, header: h2[1], anchor: pendingAnchor?.id ?? null, anchorLine: pendingAnchor?.line ?? null });
      pendingAnchor = null;
      continue;
    }
    if (line.trim() !== "") pendingAnchor = null;
  }

  const anchored = headers.some((h) => h.anchor);
  const sections: Record<string, Section> = {};
  headers.forEach((h, n) => {
    const id = anchored ? h.anchor : expectedIds[n];
    if (!id || !expectedIds.includes(id) || sections[id]) return;
    const end = n + 1 < headers.length ? headers[n + 1].index : lines.length;
    // El cuerpo llega hasta antes del ancla (o del header, si no tiene) de la sección siguiente.
    const next = headers[n + 1];
    const bodyEndLine = next ? (next.anchorLine ?? next.index) : lines.length;
    const bodyStart = index.lineStart(h.index + 2);
    const headerStart = index.lineStart(h.index + 1);
    sections[id] = {
      header: h.header,
      body: lines.slice(h.index + 1, end).join("\n"),
      headerRange: index.range(headerStart, headerStart + lines[h.index].length),
      bodyRange: index.range(bodyStart, Math.max(bodyStart, next ? index.lineStart(bodyEndLine + 1) : text.length)),
      anchorRange: h.anchorLine === null ? null : lineRange(index, lines, h.anchorLine),
    };
  });

  return {
    sections,
    usedFallback: !anchored && headers.length > 0,
    missing: expectedIds.filter((id) => !sections[id]),
  };
}

/** Línea `i` (0-based) de `lines`, sin su salto de línea. */
function lineRange(index: LineIndex, lines: string[], i: number): Range {
  const start = index.lineStart(i + 1);
  return index.range(start, start + lines[i].length);
}

/**
 * El cuerpo de una sección sin comentarios HTML y con la forma de ubicarlo en el original, o
 * `undefined` si la sección no se encontró. `pos.text` es `stripComments(section.body)`.
 */
export function sectionPos(section: Section | undefined, index: LineIndex): BodyPos | undefined {
  return section && new BodyPos(section.body, section.bodyRange.start, index, section.bodyRange.end);
}
