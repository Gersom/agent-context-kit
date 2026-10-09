// Tareas de handoff.md y backlog.md: «Próximo número de tarea», números repetidos, headers que el
// parseo no reconoce, tareas sin campos y coherencia entre el bloqueo y la sección donde están.

import { TASK_HEADING_RE } from "../../../_shared/parse/blocks.ts";
import { blockInfo } from "../../../_shared/tasks/block-info.ts";
import type { Task } from "../../../_shared/types.ts";
import { findNextTaskNumber } from "../../../task-manager/src/query/next-number.ts";
import { proseLines } from "../lines.ts";
import type { Check, CheckContext, DocInfo, Finding } from "../types.ts";

// Se parece a un header de tarea: `###`/`####`, una palabra y un número.
const LOOKS_LIKE_TASK_RE = /^#{3,4}\s+\S+\s+\d+/;
const TASK_FORMAT = "`### Tarea N — título`";

/** Una tarea y dónde está. */
interface Located {
  number: number;
  file: string;
  line: number | null;
  /** Sección donde vive, en palabras genéricas (los headers del archivo están traducidos). */
  where: string;
}

const place = (item: Pick<Located, "file" | "line">) => (item.line === null ? item.file : `${item.file}:${item.line}`);

/** Las tareas vivas (no cerradas) de handoff y backlog, con grupos incluidos; sin las referencias de grupo. */
function liveTasks({ docs }: CheckContext): Located[] {
  const { handoff, backlog } = docs;
  const at = (doc: DocInfo<unknown>, where: string) => (task: { number: number; range?: { startLine: number } }): Located => ({
    number: task.number,
    file: doc.file,
    line: task.range?.startLine ?? null,
    where,
  });
  const { inProgress, paused } = handoff.parsed;
  const { free, blocked, grouped } = backlog.parsed;
  return [
    ...(handoff.exists && inProgress.task ? [at(handoff, "tarea en curso")(inProgress.task)] : []),
    ...(handoff.exists ? paused.map(at(handoff, "tareas pausadas")) : []),
    ...(backlog.exists ? free.tasks.map(at(backlog, "tareas libres")) : []),
    ...(backlog.exists ? blocked.map(at(backlog, "tareas bloqueadas")) : []),
    ...(backlog.exists ? grouped.flatMap((g) => g.tasks).map(at(backlog, "tareas agrupadas")) : []),
  ];
}

/** «Próximo número de tarea» presente y mayor que cualquier número que ya exista. */
export const checkNextNumber: Check = (ctx) => {
  const { backlog, history } = ctx.docs;
  if (!backlog.exists) return [];
  const next = findNextTaskNumber(backlog.text);
  if (!next) {
    return [
      {
        severity: "error",
        code: "next-number",
        file: backlog.file,
        line: null,
        message:
          "Falta la línea «Próximo número de tarea» (un campo en negrita con solo un número, ej. `**Próximo número de tarea:** 12`, antes de la primera sección): agrégala, sin ella no se pueden numerar tareas nuevas.",
      },
    ];
  }
  const numbers = [
    ...liveTasks(ctx).map((t) => t.number),
    ...backlog.parsed.free.groups.flatMap((g) => g.taskNumbers),
    ...history.parsed.entries.flatMap((e) => (e.number === null ? [] : [e.number])),
  ];
  const highest = numbers.length ? Math.max(...numbers) : null;
  if (highest === null || next.value > highest) return [];
  return [
    {
      severity: "error",
      code: "next-number",
      file: backlog.file,
      line: next.line,
      message: `«Próximo número de tarea» (${next.value}) no es mayor que la tarea más alta que ya existe (la ${highest}), así que repetiría un número. Corrígelo a ${highest + 1} como mínimo.`,
    },
  ];
};

/** Un número de tarea en dos tareas vivas, o una viva que repite el de una entrada de history.md. */
export const checkDuplicateNumbers: Check = (ctx) => {
  const findings: Finding[] = [];
  const live = liveTasks(ctx);
  const byNumber = new Map<number, Located[]>();
  for (const task of live) byNumber.set(task.number, [...(byNumber.get(task.number) ?? []), task]);

  for (const [number, tasks] of byNumber) {
    if (tasks.length < 2) continue;
    const all = tasks.map((t) => `${place(t)} (${t.where})`).join("; ");
    for (const task of tasks.slice(1)) {
      findings.push({
        severity: "error",
        code: "task-duplicate",
        file: task.file,
        line: task.line,
        message: `La Tarea ${number} está repetida: ${all}. Una tarea vive en un solo lugar y su número no se reutiliza; renumera o borra una.`,
      });
    }
  }

  const { history } = ctx.docs;
  const closed = new Map<number, number | null>();
  for (const entry of history.parsed.entries) {
    if (entry.number !== null && !closed.has(entry.number)) closed.set(entry.number, entry.range?.startLine ?? null);
  }
  for (const task of live) {
    if (!closed.has(task.number)) continue;
    const entryLine = closed.get(task.number) ?? null;
    findings.push({
      severity: "error",
      code: "task-duplicate",
      file: task.file,
      line: task.line,
      message: `La Tarea ${task.number} (${task.where}) ya figura cerrada en ${place({ file: history.file, line: entryLine })}. Si está terminada, sácala de aquí; si es otra tarea, dale un número nuevo.`,
    });
  }
  return findings;
};

/** Líneas `###`/`####` con pinta de header de tarea que el parseo no reconoce (no la verá ni el seguimiento ni `bun run task`). */
export const checkTaskHeadings: Check = ({ docs }) => {
  const findings: Finding[] = [];
  for (const doc of [docs.handoff, docs.backlog]) {
    if (!doc.exists) continue;
    for (const line of proseLines(doc.text)) {
      if (!LOOKS_LIKE_TASK_RE.test(line.visible) || TASK_HEADING_RE.test(line.visible)) continue;
      findings.push({
        severity: "warning",
        code: "task-heading",
        file: doc.file,
        line: line.n,
        message: `Parece el header de una tarea pero no cumple ${TASK_FORMAT}: el parseo la ignora. Usa «#», un espacio, la palabra, el número, un guion (—) y el título.`,
      });
    }
  }
  return findings;
};

/** Tareas pausadas, libres, bloqueadas y agrupadas sin ningún campo `- **Etiqueta:** valor`. */
export const checkTaskFields: Check = ({ docs }) => {
  const findings: Finding[] = [];
  const tasks: { doc: DocInfo<unknown>; task: Task; hasPlan: boolean }[] = [];
  if (docs.handoff.exists) {
    // El campo que solo trae los checkboxes del plan no cuenta como campo en las pausadas.
    for (const task of docs.handoff.parsed.paused) tasks.push({ doc: docs.handoff, task, hasPlan: task.steps.length > 0 });
  }
  if (docs.backlog.exists) {
    const { free, blocked, grouped } = docs.backlog.parsed;
    for (const task of [...free.tasks, ...blocked, ...grouped.flatMap((g) => g.tasks)]) tasks.push({ doc: docs.backlog, task, hasPlan: false });
  }
  for (const { doc, task, hasPlan } of tasks) {
    if (task.isPlaceholder || task.fields.length > 0 || hasPlan) continue;
    findings.push({
      severity: "warning",
      code: "task-fields",
      file: doc.file,
      line: task.range?.startLine ?? null,
      message: `La Tarea ${task.number} no tiene ningún campo \`- **Etiqueta:** valor\` (ej. Descripción, Bloqueos): sin ellos no se ven su detalle ni su bloqueo. Escríbelos como lista con la etiqueta en negrita.`,
    });
  }
  return findings;
};

/** Una tarea bloqueada necesita un bloqueo vigente; una libre no puede tenerlo. */
export const checkBlockTags: Check = ({ docs }) => {
  const { backlog } = docs;
  if (!backlog.exists) return [];
  const findings: Finding[] = [];
  for (const task of backlog.parsed.blocked) {
    if (task.isPlaceholder || blockInfo(task).tag) continue;
    findings.push({
      severity: "warning",
      code: "block-tag",
      file: backlog.file,
      line: task.range?.startLine ?? null,
      message: `La Tarea ${task.number} está en «bloqueadas / pospuestas» pero no tiene un bloqueo vigente (un campo cuyo valor empiece con \`[dependencia]\` o \`[postergada]\`): muévela a libres o agrega el bloqueo.`,
    });
  }
  for (const task of backlog.parsed.free.tasks) {
    if (task.isPlaceholder) continue;
    const { tag } = blockInfo(task);
    if (!tag) continue;
    findings.push({
      severity: "warning",
      code: "block-tag",
      file: backlog.file,
      line: task.range?.startLine ?? null,
      message: `La Tarea ${task.number} está en «libres» pero tiene un bloqueo vigente (\`[${tag}]\`): muévela a «bloqueadas / pospuestas» o marca el bloqueo como resuelto (\`[Resuelto el <fecha>]\`).`,
    });
  }
  return findings;
};
