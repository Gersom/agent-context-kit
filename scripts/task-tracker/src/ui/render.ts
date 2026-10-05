// Pintado del modelo en la terminal con picocolors. render() devuelve un string (testeable);
// src/app.ts se encarga de limpiar la pantalla y escribirlo.

import picocolors from "picocolors";
import { formatTime } from "../shared/time.ts";
import type { Model, RenderMeta } from "../shared/types.ts";
import { plainText, progressBar, truncate } from "./format.ts";

const NEXT_STEP_MAX_LINES = 3;

/** Pantalla completa (ver `RenderMeta` para `changedFile` y `color`). */
export function render(model: Model, meta: RenderMeta): string {
  const pc = meta.color === undefined ? picocolors : picocolors.createColors(meta.color);
  const width = Math.max(40, meta.width ?? process.stdout.columns ?? 100);
  const out: string[] = [];
  const line = (indent: number, text: string, color: (s: string) => string = (s) => s) =>
    out.push(" ".repeat(indent) + color(truncate(plainText(text), width - indent)));
  const blank = () => out.push("");

  // Encabezado
  line(0, `▣ ${meta.projectName}`, (s) => pc.bold(pc.magenta(s)));
  line(2, meta.agentsDir, pc.dim);
  const changed = meta.changedFile ? `cambió ${meta.changedFile}` : meta.changedFile === null ? "cambio detectado" : "inicio";
  line(2, `Actualizado ${formatTime(meta.updatedAt)} · ${changed}`, pc.dim);
  line(0, "─".repeat(Math.min(width, 60)), pc.dim);
  blank();

  // En progreso
  line(0, "▶ EN PROGRESO", (s) => pc.bold(pc.green(s)));
  const current = model.current;
  if (!current) {
    line(2, "Sin tarea en curso", pc.dim);
  } else {
    line(2, taskName(current), (s) => pc.bold(pc.green(s)));
    const { plan } = current;
    if (plan.total) {
      line(2, `Plan ${progressBar(plan.done, plan.total)} ${plan.done}/${plan.total}`, pc.green);
      for (const step of plan.steps) {
        if (step.done) line(4, `✔ ${step.text}`, pc.dim);
        else if (step === plan.currentStep) line(4, `▸ ${step.text}`, (s) => pc.bold(pc.green(s)));
        else line(4, `○ ${step.text}`);
      }
    }
    if (current.nextStep) {
      const nextLines = current.nextStep.split("\n").map((l) => l.trim()).filter(Boolean);
      line(2, "Próximo paso:", pc.dim);
      for (const text of nextLines.slice(0, NEXT_STEP_MAX_LINES)) line(4, text, pc.dim);
      if (nextLines.length > NEXT_STEP_MAX_LINES) line(4, "…", pc.dim);
    }
  }
  blank();

  // Pausadas
  line(0, `⏸ PAUSADAS (${model.counts.paused})`, (s) => pc.bold(pc.yellow(s)));
  if (!model.paused.length) line(2, "Ninguna", pc.dim);
  for (const task of model.paused) line(2, `• ${taskName(task)}`, pc.yellow);
  blank();

  if (model.hasBacklog) {
    // Libres
    line(0, `○ LIBRES (${model.counts.free})`, (s) => pc.bold(pc.cyan(s)));
    if (!model.free.tasks.length && !model.free.groups.length) line(2, "Ninguna", pc.dim);
    for (const task of model.free.tasks) line(2, `• ${taskName(task)}`, pc.cyan);
    for (const group of model.free.groups) {
      const refs = group.taskNumbers.map((n) => `T${n}`).join(", ");
      line(2, `◇ Grupo: ${group.title} (${refs})`, pc.cyan);
      for (const task of group.tasks) {
        if (task.title) line(4, `· ${taskName(task)}`, pc.dim);
      }
    }
    blank();

    // Bloqueadas
    line(0, `■ BLOQUEADAS (${model.counts.blocked})`, (s) => pc.bold(pc.red(s)));
    if (!model.blocked.length) line(2, "Ninguna", pc.dim);
    for (const task of model.blocked) {
      const tag = task.block.tag ? ` [${task.block.tag}]` : "";
      line(2, `• ${taskName(task)}${tag}`, pc.red);
    }
    blank();
  }

  // Notas y avisos
  for (const note of model.notes) line(0, `ℹ ${note}`, pc.dim);
  for (const warning of model.warnings) line(0, `! ${warning}`, pc.yellow);
  if (model.notes.length || model.warnings.length) blank();

  line(0, "Ctrl+C para salir", pc.dim);
  return out.join("\n") + "\n";
}

/** `Tarea 9 — título`, con la etiqueta tal como está escrita en el documento. */
function taskName(task: { label: string | null; number: number; title: string | null }): string {
  return `${task.label ?? "#"} ${task.number} — ${task.title}`;
}
