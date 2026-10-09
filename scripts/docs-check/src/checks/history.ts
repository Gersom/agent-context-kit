// history.md: cada header `## ` del registro (después del primer `---`) tiene que ser una entrada
// que el parseo reconozca, es decir, llevar ✅ (hecha) o ❌ (descartada).

import { isPlaceholder } from "../../../_shared/parse/markdown.ts";
import { proseLines } from "../lines.ts";
import type { Check, Finding } from "../types.ts";

const H2_RE = /^##(?!#)\s+(.+?)\s*$/;
const RULE_RE = /^---+\s*$/;

export const checkHistoryEntries: Check = ({ docs }) => {
  const { history } = docs;
  if (!history.exists) return [];
  const recognized = new Set(history.parsed.entries.map((entry) => entry.range?.startLine));
  const findings: Finding[] = [];
  let afterRule = false;
  for (const line of proseLines(history.text)) {
    if (RULE_RE.test(line.visible.trim())) {
      afterRule = true;
      continue;
    }
    const header = afterRule ? line.visible.match(H2_RE) : null;
    // Un placeholder lo avisa el check de placeholders.
    if (!header || recognized.has(line.n) || isPlaceholder(header[1])) continue;
    findings.push({
      severity: "warning",
      code: "history-entry",
      file: history.file,
      line: line.n,
      message: "Este header `## ` no se reconoce como entrada de history.md: falta ✅ (hecha) o ❌ (descartada). Usa `## <fecha> — ✅ Tarea N — título`.",
    });
  }
  return findings;
};
