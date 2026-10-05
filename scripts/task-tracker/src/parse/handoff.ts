// Interpretación de handoff.md: tarea en progreso (con su plan y subsecciones) y tareas pausadas.

import type { CurrentTaskLine, InProgress, ParsedHandoff, PlanStep } from "../shared/types.ts";
import { parseBlocks } from "./blocks.ts";
import { isPlaceholder, stripComments } from "./markdown.ts";
import { findSections, HANDOFF_SECTIONS } from "./sections.ts";

const CHECKBOX_RE = /^\s*[-*]\s+\[( |x|X)\]\s+(.+?)\s*$/;
// Línea con la tarea en progreso, con o sin etiqueta en negrita (`**Tarea:** Tarea 9 — título`).
const CURRENT_TASK_RE = /^(?:\*\*[^*]+:\*\*\s*)?(\S+)\s+(\d+)\s*[—–-]\s*(.+)$/;
const LIST_ITEM_RE = /^\s*(?:[-*+]|\d+\.)\s/;

/**
 * Sección "Tarea en progreso": la tarea (primera línea `Tarea N — título` antes de la primera
 * subsección, sin contar ítems de lista como los pasos del plan), los checkboxes del plan y las
 * subsecciones `### ` (genéricas, sus títulos están traducidos).
 * @param body sección ya sin comentarios HTML
 */
export function parseInProgress(body: string): InProgress {
  const lines = body.split("\n");
  let task: CurrentTaskLine | null = null;
  for (const line of lines) {
    if (/^#{3,}\s/.test(line)) break;
    const trimmed = line.trim();
    if (!trimmed || LIST_ITEM_RE.test(line)) continue;
    const match = trimmed.match(CURRENT_TASK_RE);
    if (match) {
      task = { label: match[1].replace(/\*/g, ""), number: Number(match[2]), title: match[3].replace(/\*\*/g, "").trim() };
      break;
    }
  }

  const steps: PlanStep[] = [];
  for (const line of lines) {
    const match = line.match(CHECKBOX_RE);
    if (match) steps.push({ text: match[2], done: match[1] !== " " });
  }

  const subsections: { title: string; lines: string[] }[] = [];
  let sub: { title: string; lines: string[] } | null = null;
  for (const line of lines) {
    const heading = line.match(/^###(?!#)\s+(.+?)\s*$/);
    if (heading) {
      sub = { title: heading[1], lines: [] };
      subsections.push(sub);
    } else if (sub) {
      sub.lines.push(line);
    }
  }

  return {
    task,
    steps,
    subsections: subsections.map((s) => ({ title: s.title, body: s.lines.join("\n").trim() })),
  };
}

/** handoff.md completo. */
export function parseHandoff(text: string): ParsedHandoff {
  const { sections, usedFallback, missing } = findSections(text, HANDOFF_SECTIONS);
  const inProgressBody = stripComments(sections["in-progress"]?.body ?? "");
  const pausedBody = stripComments(sections.paused?.body ?? "");
  return {
    inProgress: parseInProgress(inProgressBody),
    paused: parseBlocks(pausedBody).tasks,
    usedFallback,
    missing,
    placeholders: [inProgressBody, pausedBody].some(isPlaceholder),
  };
}
