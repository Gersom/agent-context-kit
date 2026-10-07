// Interpretación de handoff.md: tarea en progreso (con su plan y subsecciones) y tareas pausadas.

import type { CurrentTaskLine, InProgress, ParsedHandoff, ParsedPausedTask, PlanStep, Task } from "../types.ts";
import { parseBlocks } from "./blocks.ts";
import { isPlaceholder } from "./markdown.ts";
import { BodyPos, LineIndex } from "./positions.ts";
import { findSections, HANDOFF_SECTIONS, sectionPos } from "./sections.ts";

const CHECKBOX_RE = /^\s*[-*]\s+\[( |x|X)\]\s+(.+?)\s*$/;
// Hasta el carácter de marca del checkbox (` `, `x` o `X`), para ubicarlo dentro de la línea.
const CHECKBOX_MARK_RE = /^\s*[-*]\s+\[/;
// Línea con la tarea en progreso, con o sin etiqueta en negrita (`**Tarea:** Tarea 9 — título`).
const CURRENT_TASK_RE = /^(?:\*\*[^*]+:\*\*\s*)?(\S+)\s+(\d+)\s*[—–-]\s*(.+)$/;
const LIST_ITEM_RE = /^\s*(?:[-*+]|\d+\.)\s/;

/**
 * Sección "Tarea en progreso": la tarea (primera línea `Tarea N — título` antes de la primera
 * subsección, sin contar ítems de lista como los pasos del plan), los checkboxes del plan y las
 * subsecciones `### ` (genéricas, sus títulos están traducidos).
 * Con `pos` (el cuerpo con su ubicación en el original), la tarea, los pasos y las subsecciones
 * traen su `range`.
 * @param body sección ya sin comentarios HTML; con `pos`, es `pos.text`
 */
export function parseInProgress(body: string, pos?: BodyPos): InProgress {
  const lines = body.split("\n");
  let task: CurrentTaskLine | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{3,}\s/.test(line)) break;
    const trimmed = line.trim();
    if (!trimmed || LIST_ITEM_RE.test(line)) continue;
    const match = trimmed.match(CURRENT_TASK_RE);
    if (match) {
      task = { label: match[1].replace(/\*/g, ""), number: Number(match[2]), title: match[3].replace(/\*\*/g, "").trim() };
      if (pos) task.range = pos.lineRange(i);
      break;
    }
  }

  const steps = parseSteps(body, pos);

  const subsections: { title: string; lines: string[]; startLine: number }[] = [];
  let sub: { title: string; lines: string[]; startLine: number } | null = null;
  lines.forEach((line, i) => {
    const heading = line.match(/^###(?!#)\s+(.+?)\s*$/);
    if (heading) {
      sub = { title: heading[1], lines: [], startLine: i };
      subsections.push(sub);
    } else if (sub) {
      sub.lines.push(line);
    }
  });

  return {
    task,
    steps,
    subsections: subsections.map((s, n) => {
      const subsection = { title: s.title, body: s.lines.join("\n").trim() };
      if (!pos) return subsection;
      return { ...subsection, range: pos.blockLines(s.startLine, n + 1 < subsections.length ? subsections[n + 1].startLine : lines.length) };
    }),
  };
}

/**
 * Checkboxes `- [ ] …` / `- [x] …` de un texto, indentados o no, como pasos de plan.
 * Con `pos` (el texto con su ubicación en el original; es `pos.text`), cada paso trae `range`
 * (su línea) y `markRange` (el carácter entre los corchetes).
 */
export function parseSteps(text: string, pos?: BodyPos): PlanStep[] {
  const steps: PlanStep[] = [];
  text.split("\n").forEach((line, i) => {
    const match = line.match(CHECKBOX_RE);
    if (!match) return;
    const step: PlanStep = { text: match[2], done: match[1] !== " " };
    if (pos) {
      step.range = pos.lineRange(i);
      step.markRange = pos.charRange(pos.lineOffset(i) + (line.match(CHECKBOX_MARK_RE)?.[0].length ?? 0));
    }
    steps.push(step);
  });
  return steps;
}

/**
 * Tarea pausada: los pasos del plan que traía al pausarse (los checkboxes de su bloque) y sus
 * campos, sin el que solo contiene esos checkboxes (el campo `Plan` de la plantilla; su etiqueta
 * está traducida, así que se reconoce por su contenido), para no repetirlo como texto.
 * Con `index` (el del texto original completo) y la tarea con `range`, los pasos traen sus posiciones.
 */
export function parsePausedTask(task: Task, index?: LineIndex): ParsedPausedTask {
  const isPlanField = (value: string) => {
    const lines = value.split("\n").map((l) => l.trim()).filter(Boolean);
    return lines.length > 0 && lines.every((l) => CHECKBOX_RE.test(l));
  };
  // El bloque se vuelve a leer del original (los comentarios quedan siempre dentro de un bloque).
  const pos = index && task.range && new BodyPos(index.text.slice(task.range.start, task.range.end), task.range.start, index);
  const steps = pos ? parseSteps(pos.text, pos) : parseSteps(task.body);
  return { ...task, steps, fields: task.fields.filter((f) => !isPlanField(f.value)) };
}

/** handoff.md completo. */
export function parseHandoff(text: string): ParsedHandoff {
  const index = new LineIndex(text);
  const { sections, usedFallback, missing } = findSections(text, HANDOFF_SECTIONS, index);
  const inProgressPos = sectionPos(sections["in-progress"], index);
  const pausedPos = sectionPos(sections.paused, index);
  const inProgressBody = inProgressPos?.text ?? "";
  const pausedBody = pausedPos?.text ?? "";
  return {
    inProgress: parseInProgress(inProgressBody, inProgressPos),
    paused: parseBlocks(pausedBody, pausedPos).tasks.map((t) => parsePausedTask(t, index)),
    sections,
    usedFallback,
    missing,
    placeholders: [inProgressBody, pausedBody].some(isPlaceholder),
  };
}
