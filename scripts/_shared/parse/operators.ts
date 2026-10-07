// Interpretación de operators.md (modo multi-operador, ver skill/docs/multi-operator.md): una
// línea por operador, `- <carpeta>[ (solo team-backlog)]: <correo>, <correo>`, dentro de la
// sección con el ancla `<!-- agent-context-kit:section=operators -->` (plan B: la primera `## `).

import type { OperatorEntry, ParsedOperators } from "../types.ts";
import { isPlaceholder, stripComments } from "./markdown.ts";
import { findSections } from "./sections.ts";

export const OPERATORS_SECTIONS: string[] = ["operators"];

const ITEM_RE = /^\s*[-*]\s+(.+?)\s*$/;
// `<carpeta>`, marca opcional entre paréntesis y `:` con los correos.
const ENTRY_RE = /^([^\s:()]+)\s*(?:\(([^)]*)\))?\s*:\s*(.*)$/;
const FOLDERLESS_RE = /solo\s+team-backlog/i;

/**
 * Operadores de operators.md. Los placeholders de la plantilla se ignoran; una línea de la
 * lista que no encaja con el formato queda en `unreadable`.
 * @param text documento con saltos de línea LF
 */
export function parseOperators(text: string): ParsedOperators {
  const { sections } = findSections(text, OPERATORS_SECTIONS);
  const body = stripComments(sections.operators?.body ?? "");
  const operators: OperatorEntry[] = [];
  const unreadable: string[] = [];

  for (const line of body.split("\n")) {
    const item = line.match(ITEM_RE);
    if (!item || isPlaceholder(item[1])) continue;
    const entry = item[1].match(ENTRY_RE);
    const emails = entry ? splitEmails(entry[3]) : [];
    if (!entry || !emails.length) {
      unreadable.push(item[1]);
      continue;
    }
    operators.push({ folder: entry[1], emails, folderless: FOLDERLESS_RE.test(entry[2] ?? "") });
  }
  return { operators, unreadable };
}

function splitEmails(raw: string): string[] {
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
