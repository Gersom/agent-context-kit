// Placeholders de la plantilla (`[Placeholder ...]`) que quedaron sin completar. Los que están
// dentro de comentarios HTML o de bloques de código son instrucciones o ejemplos y no cuentan.

import { isPlaceholder } from "../../../_shared/parse/markdown.ts";
import { proseLines } from "../lines.ts";
import type { Check, Finding } from "../types.ts";

export const checkPlaceholders: Check = ({ docs }) => {
  const findings: Finding[] = [];
  for (const doc of [docs.handoff, docs.backlog, docs.history, ...(docs.teamBacklog ? [docs.teamBacklog] : [])]) {
    if (!doc.exists) continue;
    for (const line of proseLines(doc.text)) {
      if (!isPlaceholder(line.visible)) continue;
      findings.push({
        severity: "warning",
        code: "placeholder",
        file: doc.file,
        line: line.n,
        message: "Quedó un `[Placeholder ...]` de la plantilla: reemplázalo por el contenido real (o bórralo si no aplica).",
      });
    }
  }
  return findings;
};
