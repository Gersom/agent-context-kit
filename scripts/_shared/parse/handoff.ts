// Interpretación de handoff.md: tarea en progreso (con su plan y subsecciones) y tareas pausadas.

import type { CurrentTaskLine, InProgress, ParsedHandoff, ParsedPausedTask, PlanStep, Task } from "../types.ts";
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

  const steps = parseSteps(body);

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

/** Checkboxes `- [ ] …` / `- [x] …` de un texto, indentados o no, como pasos de plan. */
export function parseSteps(text: string): PlanStep[] {
  const steps: PlanStep[] = [];
  for (const line of text.split("\n")) {
    const match = line.match(CHECKBOX_RE);
    if (match) steps.push({ text: match[2], done: match[1] !== " " });
  }
  return steps;
}

/**
 * Tarea pausada: los pasos del plan que traía al pausarse (los checkboxes de su bloque) y sus
 * campos, sin el que solo contiene esos checkboxes (el campo `Plan` de la plantilla; su etiqueta
 * está traducida, así que se reconoce por su contenido), para no repetirlo como texto.
 */
export function parsePausedTask(task: Task): ParsedPausedTask {
  const isPlanField = (value: string) => {
    const lines = value.split("\n").map((l) => l.trim()).filter(Boolean);
    return lines.length > 0 && lines.every((l) => CHECKBOX_RE.test(l));
  };
  return { ...task, steps: parseSteps(task.body), fields: task.fields.filter((f) => !isPlanField(f.value)) };
}

/** handoff.md completo. */
export function parseHandoff(text: string): ParsedHandoff {
  const { sections, usedFallback, missing } = findSections(text, HANDOFF_SECTIONS);
  const inProgressBody = stripComments(sections["in-progress"]?.body ?? "");
  const pausedBody = stripComments(sections.paused?.body ?? "");
  return {
    inProgress: parseInProgress(inProgressBody),
    paused: parseBlocks(pausedBody).tasks.map(parsePausedTask),
    usedFallback,
    missing,
    placeholders: [inProgressBody, pausedBody].some(isPlaceholder),
  };
}
