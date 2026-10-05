// Interpretación del markdown de handoff.md y backlog.md.
// Funciones puras sobre strings: no leen archivos ni dependen del idioma de la documentación.
// Las secciones se ubican por las anclas `<!-- agent-context-kit:section=<id> -->` (ver
// src/docs/template-architecture.md, sección "Anclas de sección"); los textos de headers y
// etiquetas de campos se conservan tal cual, sin interpretarlos.

/** Ids de sección por archivo, en el orden en que aparecen en la plantilla (plan B posicional). */
export const HANDOFF_SECTIONS = ["in-progress", "paused"];
export const BACKLOG_SECTIONS = ["free", "blocked", "grouped"];

const ANCHOR_RE = /^\s*<!--\s*agent-context-kit:section=([a-z-]+)\s*-->\s*$/;
const H2_RE = /^##(?!#)\s+(.+?)\s*$/;
const FENCE_RE = /^\s*(```|~~~)/;
// `### Tarea 4 — título` / `#### Task 12 - title` (acepta —, – o -).
const TASK_HEADING_RE = /^(#{3,4})\s+(\S+)\s+(\d+)\s*[—–-]\s*(.+?)\s*$/;
// `### Grupo — título (Tareas 10, 11)`: referencia a un grupo dentro de "Tareas libres".
const GROUP_REF_RE = /^###\s+(\S+)\s*[—–-]\s*(.+?)\s*\(([^)]*\d[^)]*)\)\s*$/;
// `### Grupo — título`: contenedor de un grupo dentro de "Tareas agrupadas".
const GROUP_RE = /^###\s+(\S+)\s*[—–-]\s*(.+?)\s*$/;
const FIELD_RE = /^[-*]\s+\*\*(.+?)(?::\*\*|\*\*:)\s*(.*)$/;
const CHECKBOX_RE = /^\s*[-*]\s+\[( |x|X)\]\s+(.+?)\s*$/;
// Línea con la tarea en progreso, con o sin etiqueta en negrita (`**Tarea:** Tarea 9 — título`).
const CURRENT_TASK_RE = /^(?:\*\*[^*]+:\*\*\s*)?(\S+)\s+(\d+)\s*[—–-]\s*(.+)$/;
const LIST_ITEM_RE = /^\s*(?:[-*+]|\d+\.)\s/;
const PLACEHOLDER_RE = /\[Placeholder/i;

/**
 * Quita los comentarios HTML (inline y multilínea). Un comentario sin cerrar se descarta
 * hasta el final del texto.
 * @param {string} text
 * @returns {string}
 */
export function stripComments(text) {
  return text.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
}

/** @param {string} value */
export function isPlaceholder(value) {
  return PLACEHOLDER_RE.test(value ?? "");
}

/**
 * Divide el documento en secciones `## `. Cada una se identifica por el ancla de la línea no
 * vacía anterior a su header. Si el documento no tiene ninguna ancla, se asignan los ids por
 * orden de aparición (plan B, para docs generados antes de existir las anclas).
 * Los headers dentro de comentarios HTML o bloques de código no cuentan.
 * @param {string} text documento con saltos de línea LF
 * @param {string[]} expectedIds ids esperados, en el orden de la plantilla
 * @returns {{ sections: Record<string, { header: string, body: string }>, usedFallback: boolean, missing: string[] }}
 */
export function findSections(text, expectedIds) {
  const lines = text.split("\n");
  const headers = []; // { index, header, anchor }
  let inComment = false;
  let inFence = false;
  let pendingAnchor = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const startsInComment = inComment;
    inComment = commentStateAfter(line, inComment);
    if (startsInComment) continue;

    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      pendingAnchor = null;
      continue;
    }
    if (inFence) continue;

    const anchor = line.match(ANCHOR_RE);
    if (anchor) {
      pendingAnchor = anchor[1];
      continue;
    }
    const h2 = line.match(H2_RE);
    if (h2) {
      headers.push({ index: i, header: h2[1], anchor: pendingAnchor });
      pendingAnchor = null;
      continue;
    }
    if (line.trim() !== "") pendingAnchor = null;
  }

  const anchored = headers.some((h) => h.anchor);
  const sections = {};
  headers.forEach((h, n) => {
    const id = anchored ? h.anchor : expectedIds[n];
    if (!id || !expectedIds.includes(id) || sections[id]) return;
    const end = n + 1 < headers.length ? headers[n + 1].index : lines.length;
    sections[id] = { header: h.header, body: lines.slice(h.index + 1, end).join("\n") };
  });

  return {
    sections,
    usedFallback: !anchored && headers.length > 0,
    missing: expectedIds.filter((id) => !sections[id]),
  };
}

/** Estado "dentro de un comentario HTML" al terminar la línea. */
function commentStateAfter(line, inComment) {
  let pos = 0;
  let state = inComment;
  while (pos < line.length) {
    if (state) {
      const close = line.indexOf("-->", pos);
      if (close === -1) return true;
      state = false;
      pos = close + 3;
    } else {
      const open = line.indexOf("<!--", pos);
      if (open === -1) return false;
      state = true;
      pos = open + 4;
    }
  }
  return state;
}

/**
 * Campos `- **Etiqueta:** valor` de un bloque de tarea. Las líneas indentadas que siguen
 * (sublistas) se suman al valor del campo anterior. Las etiquetas se guardan tal cual,
 * porque se redactan en el idioma de cada proyecto.
 * @param {string[]} lines
 * @returns {{ label: string, value: string, isPlaceholder: boolean }[]}
 */
export function parseFields(lines) {
  const fields = [];
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

/**
 * Tareas y grupos de una sección (ya sin comentarios HTML).
 * - `### Tarea N — título` / `#### Tarea N — título` → tarea.
 * - `### Grupo — título (Tareas N, M)` → referencia a un grupo (en "Tareas libres").
 * - Otro `### ...` → contenedor de grupo; las `#### Tarea` siguientes son sus tareas.
 * @param {string} body
 * @returns {{ tasks: Task[], groups: Group[] }}
 *
 * @typedef {{ number: number, label: string, title: string, level: number, fields: ReturnType<typeof parseFields>, body: string, isPlaceholder: boolean }} Task
 * @typedef {{ label: string, title: string, taskNumbers: number[], tasks: Task[], body: string }} Group
 */
export function parseBlocks(body) {
  const tasks = [];
  const groups = [];
  let current = null; // { kind: "task" | "group", item, lines }
  let currentGroup = null;

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
      const item = {
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
      const item = ref
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

function numbersIn(text) {
  return [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
}

/**
 * Sección "Tarea en progreso": la tarea (primera línea `Tarea N — título` antes de la primera
 * subsección, sin contar ítems de lista como los pasos del plan), los checkboxes del plan y las
 * subsecciones `### ` (genéricas, sus títulos están traducidos).
 * @param {string} body sección ya sin comentarios HTML
 */
export function parseInProgress(body) {
  const lines = body.split("\n");
  let task = null;
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

  const steps = [];
  for (const line of lines) {
    const match = line.match(CHECKBOX_RE);
    if (match) steps.push({ text: match[2], done: match[1] !== " " });
  }

  const subsections = [];
  let sub = null;
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

/**
 * handoff.md completo.
 * @param {string} text
 */
export function parseHandoff(text) {
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

/**
 * backlog.md completo.
 * @param {string} text
 */
export function parseBacklog(text) {
  const { sections, usedFallback, missing } = findSections(text, BACKLOG_SECTIONS);
  const bodies = Object.fromEntries(BACKLOG_SECTIONS.map((id) => [id, stripComments(sections[id]?.body ?? "")]));
  const free = parseBlocks(bodies.free);
  return {
    free: { tasks: free.tasks, groups: free.groups.filter((g) => g.taskNumbers.length) },
    blocked: parseBlocks(bodies.blocked).tasks,
    grouped: parseBlocks(bodies.grouped).groups.filter((g) => g.tasks.length),
    usedFallback,
    missing,
    placeholders: Object.values(bodies).some(isPlaceholder),
  };
}
