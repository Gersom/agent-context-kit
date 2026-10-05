// Pintado del modelo en la terminal con picocolors. render() devuelve un string (testeable);
// src/app.ts se encarga de limpiar la pantalla y escribirlo.
//
// La pantalla se agrupa por archivo, cada uno con su separador `━━ <archivo> ━━`: history.md
// (completadas, compacto y tachado), handoff.md (en progreso y pausadas, en detalle) y
// backlog.md (libres y bloqueadas, compacto con `T-N: título`).

import picocolors from "picocolors";
import { formatTime } from "../shared/time.ts";
import type { BlockedTask, DrawTrigger, HistoryEntry, Model, RenderMeta, TaskRef } from "../shared/types.ts";
import { displayProjectName, plainText, progressBar, shortTaskName, truncate, visibleLength } from "./format.ts";

/** Ancho máximo de los separadores. */
const RULE_MAX_WIDTH = 60;
/** Líneas que se muestran de cada subsección de la tarea en progreso (la primera + estas). */
const DETAIL_EXTRA_LINES = 2;

type Colors = ReturnType<typeof picocolors.createColors>;
type Paint = (s: string) => string;

/** Pantalla completa (ver `RenderMeta`). */
export function render(model: Model, meta: RenderMeta): string {
  const pc: Colors = meta.color === undefined ? picocolors : picocolors.createColors(meta.color);
  const width = Math.max(40, meta.width ?? process.stdout.columns ?? 100);
  const out: string[] = [];
  const line = (indent: number, text: string, color: Paint = (s) => s) =>
    out.push(" ".repeat(indent) + color(truncate(plainText(text), width - indent)));
  const blank = () => out.push("");
  const rule = (file: string) => {
    const head = `━━ ${file} `;
    const rest = Math.max(2, Math.min(width, RULE_MAX_WIDTH) - visibleLength(head));
    line(0, head + "━".repeat(rest), (s) => pc.bold(pc.blue(s)));
  };

  // Encabezado
  line(0, `▣ ${displayProjectName(meta.projectName)}`, (s) => pc.bold(pc.magenta(s)));
  line(2, meta.projectDir, pc.dim);
  line(2, `Última actualización ${formatTime(meta.updatedAt)} · ${triggerText(meta.trigger)}`, pc.dim);
  blank();

  // history.md
  if (model.hasHistory) {
    rule("history.md");
    line(0, `✔ TAREAS COMPLETADAS (últimas ${model.completed.length})`, (s) => pc.bold(pc.green(s)));
    if (!model.completed.length) line(2, "Ninguna", pc.dim);
    for (const entry of model.completed) out.push(completedLine(entry, width, pc));
    blank();
  }

  // handoff.md (detallado)
  rule("handoff.md");
  line(0, "▶ EN PROGRESO", (s) => pc.bold(pc.green(s)));
  const current = model.current;
  if (!current) {
    line(2, "Sin tarea en curso", pc.dim);
  } else {
    line(2, fullTaskName(current), (s) => pc.bold(pc.green(s)));
    const { plan } = current;
    if (plan.total) {
      line(2, `Plan ${progressBar(plan.done, plan.total)} ${plan.done}/${plan.total}`, pc.green);
      for (const step of plan.steps) {
        if (step.done) line(4, `✔ ${step.text}`, pc.dim);
        else if (step === plan.currentStep) line(4, `▸ ${step.text}`, (s) => pc.bold(pc.green(s)));
        else line(4, `○ ${step.text}`);
      }
    }
    for (const sub of current.details) {
      const lines = sub.body.split("\n").map((l) => l.trim()).filter(Boolean);
      const [first, ...rest] = lines;
      if (first === undefined) continue;
      line(2, `${sub.title}: ${first}`);
      for (const text of rest.slice(0, DETAIL_EXTRA_LINES)) line(4, text, pc.dim);
      if (rest.length > DETAIL_EXTRA_LINES) line(4, "…", pc.dim);
    }
  }
  blank();

  line(0, `⏸ PAUSADAS (${model.counts.paused})`, (s) => pc.bold(pc.yellow(s)));
  if (!model.paused.length) line(2, "Ninguna", pc.dim);
  for (const task of model.paused) {
    line(2, `• ${fullTaskName(task)}`, pc.yellow);
    for (const field of task.fields) line(6, `${field.label}: ${field.value}`, pc.dim);
  }
  blank();

  // backlog.md (compacto)
  if (model.hasBacklog) {
    rule("backlog.md");
    line(0, `○ LIBRES (${model.counts.free})`, (s) => pc.bold(pc.cyan(s)));
    if (!model.free.tasks.length && !model.free.groups.length) line(2, "Ninguna", pc.dim);
    for (const task of model.free.tasks) line(2, shortTaskName(task.number, task.title), pc.cyan);
    for (const group of model.free.groups) {
      const refs = group.taskNumbers.map((n) => `T-${n}`).join(", ");
      line(2, `◇ Grupo: ${group.title} (${refs})`, pc.cyan);
      for (const task of group.tasks) {
        if (task.title) line(4, `· ${shortTaskName(task.number, task.title)}`, pc.dim);
      }
    }
    blank();

    line(0, `■ BLOQUEADAS (${model.counts.blocked})`, (s) => pc.bold(pc.red(s)));
    if (!model.blocked.length) line(2, "Ninguna", pc.dim);
    for (const task of model.blocked) blockedLines(task, line, pc);
    blank();
  }

  // Notas y avisos
  for (const note of model.notes) line(0, `ℹ ${note}`, pc.dim);
  for (const warning of model.warnings) line(0, `! ${warning}`, pc.yellow);
  if (model.notes.length || model.warnings.length) blank();

  const footer = footerText(meta.controls ?? "ctrl-c");
  if (footer) line(0, footer, pc.dim);
  return out.join("\n") + "\n";
}

/** Texto de la línea de actualización según qué provocó el redibujo. */
export function triggerText(trigger: DrawTrigger): string {
  if (trigger.kind === "start") return "al iniciar";
  if (trigger.kind === "redraw") return "redibujado";
  return trigger.file ? `se modificó ${trigger.file}` : "cambio detectado";
}

function footerText(controls: NonNullable<RenderMeta["controls"]>): string | null {
  if (controls === "keys") return "q o Ctrl+C para salir · r para redibujar";
  if (controls === "ctrl-c") return "Ctrl+C para salir";
  return null;
}

/** `Tarea 9 — título`, con la etiqueta tal como está escrita en el documento. */
function fullTaskName(task: { label: string; number: number; title: string }): string {
  return `${task.label} ${task.number} — ${task.title}`;
}

/**
 * Línea de una tarea completada: el nombre tachado y, sin tachar, la marca de descartada y la
 * fecha. Si no entra en el ancho, se recorta el nombre (no la fecha).
 */
function completedLine(entry: HistoryEntry, width: number, pc: Colors): string {
  const indent = "  ";
  const name = plainText(entry.number == null ? entry.title : shortTaskName(entry.number, entry.title));
  const discarded = entry.status === "discarded" ? " ✖ (descartada)" : "";
  const date = entry.date ? ` · ${entry.date}` : "";
  const room = width - indent.length - visibleLength(discarded + date);
  const shown = truncate(name, Math.max(1, room));
  return indent + pc.strikethrough(shown) + (discarded ? pc.red(discarded) : "") + pc.dim(date);
}

/** Una tarea bloqueada y, debajo, las tareas de las que depende. */
function blockedLines(task: BlockedTask, line: (indent: number, text: string, color?: Paint) => void, pc: Colors): void {
  const tag = task.block.tag ? ` [${task.block.tag}]` : "";
  line(2, `${shortTaskName(task.number, task.title)}${tag}`, pc.red);
  for (const ref of task.dependsOn) line(7, dependencyText(ref), ref.closed ? pc.yellow : pc.dim);
}

/** `→ espera T-3: título`, con la pista de la Regla 7 si esa tarea ya se cerró. */
export function dependencyText(ref: TaskRef): string {
  const base = `→ espera ${shortTaskName(ref.number, ref.title)}`;
  return ref.closed ? `${base} (cerrada ✔ — ¿moverla a libres?)` : base;
}
