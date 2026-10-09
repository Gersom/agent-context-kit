// Bloques de tareas y grupos dentro de una sección, con sus campos `- **Etiqueta:** valor`.
// Los textos de headers y etiquetas se conservan tal cual, sin interpretarlos (están traducidos).

import type { Field, Group, ParsedBlocks, Task } from "../types.ts";
import { isPlaceholder } from "./markdown.ts";
import type { BodyPos } from "./positions.ts";

// `### Tarea 4 — título` / `#### Task 12 - title` (acepta —, – o -).
export const TASK_HEADING_RE =/^(#{3,4})\s+(\S+)\s+(\d+)\s*[—–-]\s*(.+?)\s*$/;
// `### Grupo — título (Tareas 10, 11)`: referencia a un grupo dentro de "Tareas libres".
const GROUP_REF_RE = /^###\s+(\S+)\s*[—–-]\s*(.+?)\s*\(([^)]*\d[^)]*)\)\s*$/;
// `### Grupo — título`: contenedor de un grupo dentro de "Tareas agrupadas".
const GROUP_RE = /^###\s+(\S+)\s*[—–-]\s*(.+?)\s*$/;
const FIELD_RE = /^[-*]\s+\*\*(.+?)(?::\*\*|\*\*:)\s*(.*)$/;

/** Dónde ubicar las líneas que se parsean: el cuerpo y el índice (0-based) de la primera línea. */
export interface LinesAt {
  pos: BodyPos;
  firstLine: number;
}

/**
 * Campos `- **Etiqueta:** valor` de un bloque de tarea. Las líneas indentadas que siguen
 * (sublistas) se suman al valor del campo anterior. Las etiquetas se guardan tal cual,
 * porque se redactan en el idioma de cada proyecto.
 * Con `at`, cada campo trae su `range`: su línea más las de continuación (ver `Field.range`).
 */
export function parseFields(lines: string[], at?: LinesAt): Field[] {
  const fields: { label: string; value: string; first: number; last: number }[] = [];
  lines.forEach((line, i) => {
    const match = line.match(FIELD_RE);
    if (match) {
      fields.push({ label: match[1].trim(), value: match[2].trim(), first: i, last: i });
    } else if (fields.length && /^\s+\S/.test(line)) {
      const last = fields[fields.length - 1];
      last.value = last.value ? `${last.value}\n${line.trim()}` : line.trim();
      last.last = i;
    }
  });
  return fields.map(({ first, last, ...f }) => {
    const field: Field = { ...f, isPlaceholder: isPlaceholder(f.value) };
    if (at) field.range = at.pos.contentLines(at.firstLine + first, at.firstLine + last + 1);
    return field;
  });
}

type OpenBlock =
  | { kind: "task"; item: Task; lines: string[]; startLine: number }
  | { kind: "group"; item: Group; lines: string[]; startLine: number };

/**
 * Tareas y grupos de una sección (ya sin comentarios HTML).
 * - `### Tarea N — título` / `#### Tarea N — título` → tarea.
 * - `### Grupo — título (Tareas N, M)` → referencia a un grupo (en "Tareas libres").
 * - Otro `### ...` → contenedor de grupo; las `#### Tarea` siguientes son sus tareas.
 * Con `pos` (el cuerpo con su ubicación en el original), tareas y grupos traen su `range` y cada
 * campo el suyo. Igual que el parseo, no distingue bloques de código dentro del cuerpo.
 * @param body cuerpo sin comentarios; con `pos`, es `pos.text`
 */
export function parseBlocks(body: string, pos?: BodyPos): ParsedBlocks {
  const tasks: Task[] = [];
  const groups: Group[] = [];
  let current: OpenBlock | null = null;
  let currentGroup: { item: Group; startLine: number } | null = null;

  const closeGroup = (endLine: number) => {
    if (currentGroup && pos) currentGroup.item.range = pos.blockLines(currentGroup.startLine, endLine);
    currentGroup = null;
  };

  // `endLine` es la línea (0-based) donde empieza el siguiente bloque, o el total de líneas.
  const flush = (endLine: number) => {
    if (!current) return;
    const text = current.lines.join("\n").trim();
    if (current.kind === "task") {
      const at = pos && { pos, firstLine: current.startLine + 1 };
      current.item.fields = parseFields(current.lines, at);
      current.item.body = text;
      if (pos) current.item.range = pos.blockLines(current.startLine, endLine);
    } else {
      current.item.body = text;
    }
    current = null;
  };

  const lines = body.split("\n");
  lines.forEach((line, i) => {
    const task = line.match(TASK_HEADING_RE);
    if (task) {
      flush(i);
      const item: Task = {
        number: Number(task[3]),
        label: task[2],
        title: task[4],
        level: task[1].length,
        fields: [],
        body: "",
        isPlaceholder: isPlaceholder(task[4]),
      };
      if (item.level === 4 && currentGroup) currentGroup.item.tasks.push(item);
      else {
        tasks.push(item);
        closeGroup(i);
      }
      current = { kind: "task", item, lines: [], startLine: i };
      return;
    }
    if (/^###(?!#)\s+/.test(line)) {
      flush(i);
      closeGroup(i);
      const ref = line.match(GROUP_REF_RE);
      const plain = ref ? null : line.match(GROUP_RE);
      const item: Group = ref
        ? { label: ref[1], title: ref[2], taskNumbers: numbersIn(ref[3]), tasks: [], body: "" }
        : plain
          ? { label: plain[1], title: plain[2], taskNumbers: [], tasks: [], body: "" }
          : { label: "", title: line.replace(/^###\s+/, "").trim(), taskNumbers: [], tasks: [], body: "" };
      groups.push(item);
      currentGroup = { item, startLine: i };
      current = { kind: "group", item, lines: [], startLine: i };
      return;
    }
    if (current) current.lines.push(line);
  });
  flush(lines.length);
  closeGroup(lines.length);

  for (const group of groups) {
    if (!group.taskNumbers.length) group.taskNumbers = group.tasks.map((t) => t.number);
  }
  return { tasks, groups };
}

function numbersIn(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
}
