// Bloques de tareas y grupos dentro de una sección, con sus campos `- **Etiqueta:** valor`.
// Los textos de headers y etiquetas se conservan tal cual, sin interpretarlos (están traducidos).

import type { Field, Group, ParsedBlocks, Task } from "../types.ts";
import { isPlaceholder } from "./markdown.ts";

// `### Tarea 4 — título` / `#### Task 12 - title` (acepta —, – o -).
const TASK_HEADING_RE = /^(#{3,4})\s+(\S+)\s+(\d+)\s*[—–-]\s*(.+?)\s*$/;
// `### Grupo — título (Tareas 10, 11)`: referencia a un grupo dentro de "Tareas libres".
const GROUP_REF_RE = /^###\s+(\S+)\s*[—–-]\s*(.+?)\s*\(([^)]*\d[^)]*)\)\s*$/;
// `### Grupo — título`: contenedor de un grupo dentro de "Tareas agrupadas".
const GROUP_RE = /^###\s+(\S+)\s*[—–-]\s*(.+?)\s*$/;
const FIELD_RE = /^[-*]\s+\*\*(.+?)(?::\*\*|\*\*:)\s*(.*)$/;

/**
 * Campos `- **Etiqueta:** valor` de un bloque de tarea. Las líneas indentadas que siguen
 * (sublistas) se suman al valor del campo anterior. Las etiquetas se guardan tal cual,
 * porque se redactan en el idioma de cada proyecto.
 */
export function parseFields(lines: string[]): Field[] {
  const fields: { label: string; value: string }[] = [];
  for (const line of lines) {
    const match = line.match(FIELD_RE);
    if (match) {
      fields.push({ label: match[1].trim(), value: match[2].trim() });
    } else if (fields.length && /^\s+\S/.test(line)) {
      const last = fields[fields.length - 1];
      last.value = last.value ? `${last.value}\n${line.trim()}` : line.trim();
    }
  }
  return fields.map((f) => ({ ...f, isPlaceholder: isPlaceholder(f.value) }));
}

type OpenBlock = { kind: "task"; item: Task; lines: string[] } | { kind: "group"; item: Group; lines: string[] };

/**
 * Tareas y grupos de una sección (ya sin comentarios HTML).
 * - `### Tarea N — título` / `#### Tarea N — título` → tarea.
 * - `### Grupo — título (Tareas N, M)` → referencia a un grupo (en "Tareas libres").
 * - Otro `### ...` → contenedor de grupo; las `#### Tarea` siguientes son sus tareas.
 */
export function parseBlocks(body: string): ParsedBlocks {
  const tasks: Task[] = [];
  const groups: Group[] = [];
  let current: OpenBlock | null = null;
  let currentGroup: Group | null = null;

  const flush = () => {
    if (!current) return;
    const text = current.lines.join("\n").trim();
    if (current.kind === "task") {
      current.item.fields = parseFields(current.lines);
      current.item.body = text;
    } else {
      current.item.body = text;
    }
    current = null;
  };

  for (const line of body.split("\n")) {
    const task = line.match(TASK_HEADING_RE);
    if (task) {
      flush();
      const item: Task = {
        number: Number(task[3]),
        label: task[2],
        title: task[4],
        level: task[1].length,
        fields: [],
        body: "",
        isPlaceholder: isPlaceholder(task[4]),
      };
      if (item.level === 4 && currentGroup) currentGroup.tasks.push(item);
      else {
        tasks.push(item);
        currentGroup = null;
      }
      current = { kind: "task", item, lines: [] };
      continue;
    }
    if (/^###(?!#)\s+/.test(line)) {
      flush();
      const ref = line.match(GROUP_REF_RE);
      const plain = ref ? null : line.match(GROUP_RE);
      const item: Group = ref
        ? { label: ref[1], title: ref[2], taskNumbers: numbersIn(ref[3]), tasks: [], body: "" }
        : plain
          ? { label: plain[1], title: plain[2], taskNumbers: [], tasks: [], body: "" }
          : { label: "", title: line.replace(/^###\s+/, "").trim(), taskNumbers: [], tasks: [], body: "" };
      groups.push(item);
      currentGroup = item;
      current = { kind: "group", item, lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  flush();

  for (const group of groups) {
    if (!group.taskNumbers.length) group.taskNumbers = group.tasks.map((t) => t.number);
  }
  return { tasks, groups };
}

function numbersIn(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
}
