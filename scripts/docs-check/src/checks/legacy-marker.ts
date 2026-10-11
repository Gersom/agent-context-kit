// Prefijos anteriores a la skill 2.0.0 (`agent-context-kit:` en anclas, versión y firma;
// `agent-docs-skill:` en los bloques de AGENTS.md y CLAUDE.md): se siguen leyendo, pero la skill
// escribe `agent-context-skill:`. Es solo un aviso, para que el proyecto se actualice.

import { legacyMarkerLines, MARKER_PREFIX } from "../../../_shared/markers.ts";
import type { Check, Finding } from "../types.ts";

/** Avisa, una vez por archivo, de los marcadores con un prefijo anterior (apunta a la primera línea). */
export const checkLegacyMarkers: Check = ({ docs, rules, rootFiles }) => {
  const files = [
    ...[docs.handoff, docs.backlog, ...(docs.teamBacklog ? [docs.teamBacklog] : [])]
      .filter((doc) => doc.exists)
      .map((doc) => ({ file: doc.file, text: doc.text })),
    ...(rules.exists ? [{ file: rules.file, text: rules.head }] : []),
    ...rootFiles.filter((root) => root.exists).map((root) => ({ file: root.file, text: root.text })),
  ];
  const findings: Finding[] = [];
  for (const { file, text } of files) {
    const lines = legacyMarkerLines(text);
    if (lines.length === 0) continue;
    findings.push({
      severity: "warning",
      code: "legacy-marker",
      file,
      line: lines[0],
      message: `${lines.length === 1 ? "Un marcador usa" : `${lines.length} marcadores usan`} un prefijo anterior a la skill 2.0.0: se sigue leyendo, pero actualízalo a \`${MARKER_PREFIX}:\` (ver docs/changelog/2.0.md de la skill).`,
    });
  }
  return findings;
};
