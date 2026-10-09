// Anclas de sección `<!-- agent-context-kit:section=<id> -->`: que estén todas, que no se haya
// caído al plan B por orden, que no se repitan (el parseo descarta la segunda en silencio) y que
// vayan justo antes del header `## ` de su sección.

import { ANCHOR_RE } from "../../../_shared/parse/sections.ts";
import type { Section } from "../../../_shared/types.ts";
import { DOC_SECTIONS } from "../../../task-manager/src/workspace/docs.ts";
import { scanLines } from "../lines.ts";
import type { Check, DocInfo, DocSet, Finding } from "../types.ts";

const H2_RE = /^##(?!#)\s+(.+?)\s*$/;

/** Lo que tienen en común los archivos con anclas. */
interface Sectioned {
  sections: Record<string, Section>;
  missing: string[];
}

/** Los archivos con anclas que existen (history.md no usa). */
function anchored(docs: DocSet): DocInfo<Sectioned>[] {
  return [docs.handoff, docs.backlog, ...(docs.teamBacklog ? [docs.teamBacklog] : [])].filter((doc) => doc.exists);
}

export const checkAnchors: Check = ({ docs }) => {
  const findings: Finding[] = [];
  for (const doc of anchored(docs)) {
    const { sections, missing } = doc.parsed;
    for (const id of DOC_SECTIONS[doc.kind]) {
      const anchor = `<!-- agent-context-kit:section=${id} -->`;
      if (missing.includes(id)) {
        findings.push({
          severity: "error",
          code: "anchor-missing",
          file: doc.file,
          line: null,
          message: `No se encontró la sección «${id}»: agrega su header \`## \` precedido por la línea \`${anchor}\`.`,
        });
        continue;
      }
      const section = sections[id];
      if (section && section.anchorRange === null) {
        findings.push({
          severity: "warning",
          code: "anchor-fallback",
          file: doc.file,
          line: section.headerRange.startLine,
          message: `La sección «${id}» («${section.header}») se ubicó por orden, sin ancla (plan B): agrega \`${anchor}\` en la línea anterior a su header.`,
        });
      }
    }
    findings.push(...anchorLineFindings(doc));
  }
  return findings;
};

/** Anclas repetidas y anclas que no van justo antes de un `## `, leyendo las líneas del archivo. */
function anchorLineFindings(doc: DocInfo<unknown>): Finding[] {
  const findings: Finding[] = [];
  const lines = scanLines(doc.text);
  const firstLine = new Map<string, number>();
  lines.forEach((line, i) => {
    const match = line.inFence ? null : line.raw.match(ANCHOR_RE);
    if (!match) return;
    const id = match[1];

    const first = firstLine.get(id);
    if (first === undefined) firstLine.set(id, line.n);
    else {
      findings.push({
        severity: "warning",
        code: "anchor-duplicate",
        file: doc.file,
        line: line.n,
        message: `El ancla «${id}» ya está en la línea ${first}: el parseo ignora esta. Borra la repetida (un ancla por sección).`,
      });
    }

    // La siguiente línea no vacía tiene que ser el header `## ` de la sección.
    const next = lines.slice(i + 1).find((candidate) => candidate.raw.trim() !== "");
    if (!next || next.inFence || !H2_RE.test(next.raw)) {
      findings.push({
        severity: "warning",
        code: "anchor-position",
        file: doc.file,
        line: line.n,
        message: `El ancla «${id}» no está justo antes de un header \`## \`${next ? ` (después viene la línea ${next.n})` : ""}: muévela a la línea anterior al header de su sección (se permiten líneas en blanco entre ambos).`,
      });
    }
  });
  return findings;
}
