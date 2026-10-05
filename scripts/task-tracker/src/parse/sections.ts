// Secciones `## ` de handoff.md y backlog.md, ubicadas por las anclas
// `<!-- agent-context-kit:section=<id> -->` (ver src/docs/template-architecture.md, sección
// "Anclas de sección"), con plan B por orden de aparición. No depende del idioma.

import type { Section, SectionsResult } from "../shared/types.ts";
import { commentStateAfter } from "./markdown.ts";

/** Ids de sección por archivo, en el orden en que aparecen en la plantilla (plan B posicional). */
export const HANDOFF_SECTIONS: string[] = ["in-progress", "paused"];
export const BACKLOG_SECTIONS: string[] = ["free", "blocked", "grouped"];

const ANCHOR_RE = /^\s*<!--\s*agent-context-kit:section=([a-z-]+)\s*-->\s*$/;
const H2_RE = /^##(?!#)\s+(.+?)\s*$/;
const FENCE_RE = /^\s*(```|~~~)/;

/**
 * Divide el documento en secciones `## `. Cada una se identifica por el ancla de la línea no
 * vacía anterior a su header. Si el documento no tiene ninguna ancla, se asignan los ids por
 * orden de aparición (plan B, para docs generados antes de existir las anclas).
 * Los headers dentro de comentarios HTML o bloques de código no cuentan.
 * @param text documento con saltos de línea LF
 * @param expectedIds ids esperados, en el orden de la plantilla
 */
export function findSections(text: string, expectedIds: string[]): SectionsResult {
  const lines = text.split("\n");
  const headers: { index: number; header: string; anchor: string | null }[] = [];
  let inComment = false;
  let inFence = false;
  let pendingAnchor: string | null = null;

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
      pendingAnchor = anchor[1];
      continue;
    }
    const h2 = line.match(H2_RE);
    if (h2) {
      headers.push({ index: i, header: h2[1], anchor: pendingAnchor });
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
    sections[id] = { header: h.header, body: lines.slice(h.index + 1, end).join("\n") };
  });

  return {
    sections,
    usedFallback: !anchored && headers.length > 0,
    missing: expectedIds.filter((id) => !sections[id]),
  };
}
