// Formato compartido de los comandos de lectura: líneas de texto compactas (para ahorrar tokens),
// salida JSON y rutas relativas al proyecto.

import { isAbsolute, relative } from "node:path";
import type { Io } from "../cli/types.ts";
import type { Workspace } from "../workspace/workspace.ts";
import type { BlockedInfo, CurrentInfo, FreeInfo, RefInfo, RefState } from "./state.ts";

/** Versión del esquema `--json`: sube si un campo cambia de forma o significado (agregar campos no la sube). */
export const JSON_SCHEMA = 1;

/** Salida estructurada (`--json`): el esquema, el comando y su contenido. */
export function emitJson(io: Io, command: string, payload: Record<string, unknown>): void {
  io.out(JSON.stringify({ schema: JSON_SCHEMA, command, ...payload }, null, 2));
}

/** Ruta de un archivo relativa a la raíz del proyecto y con `/` (o absoluta si queda fuera). */
export function relFile(workspace: Pick<Workspace, "projectDir">, path: string): string {
  const rel = relative(workspace.projectDir, path);
  return (rel.startsWith("..") || isAbsolute(rel) ? path : rel).replaceAll("\\", "/");
}

export const taskLine = (number: number, title: string) => `Tarea ${number} — ${title}`;

/** Recorta un texto largo en una línea, con «…» si se pasó. */
export function shorten(text: string, max: number): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

const REF_STATE: Record<RefState, string> = {
  closed: "cerrada",
  current: "en curso",
  paused: "pausada",
  free: "libre",
  blocked: "bloqueada",
  unknown: "no encontrada",
};

/** `Tarea 3 (libre)` / `Tarea 3 (cerrada)`. */
export function refText(ref: RefInfo): string {
  return `Tarea ${ref.number} (${REF_STATE[ref.state]})`;
}

/** Línea de una tarea bloqueada: tag, tareas que menciona el motivo (o el motivo recortado) y si es candidata a desbloquear. */
export function blockedText(task: BlockedInfo): string {
  const parts = [taskLine(task.number, task.title)];
  if (task.tag) parts.push(`[${task.tag}]`);
  if (task.refs.length) parts.push(`→ ${task.refs.map(refText).join(", ")}`);
  else if (task.reason) parts.push(`→ ${shorten(task.reason, 70)}`);
  if (task.unblockCandidate) parts.push("⇒ candidata a desbloquear (Regla 7)");
  return parts.join(" ");
}

/** Líneas de la tarea en curso: título y avance del plan (sin su próximo paso concreto). */
export function currentText(current: CurrentInfo, file: string): string[] {
  const lines = [`${taskLine(current.number, current.title)}  (${file}${current.line ? `:${current.line}` : ""})`];
  if (current.plan) {
    const { done, total, nextStep } = current.plan;
    lines.push(`  Plan ${done}/${total}${nextStep ? ` — siguiente: ${nextStep}` : " — completo"}`);
  }
  return lines;
}

/** El próximo paso concreto con el título de su subsección, sangrado. */
export function nextStepText(current: CurrentInfo): string[] {
  const step = current.nextConcreteStep;
  if (!step) return [];
  const [first, ...rest] = step.text.split("\n");
  return [`  ${step.title}: ${first}`, ...rest.map((line) => (line.trim() ? `    ${line}` : ""))];
}

/** Línea de una tarea libre, con su grupo si lo tiene. */
export function freeText(task: FreeInfo): string {
  return `${taskLine(task.number, task.title)}${task.group ? `  [grupo: ${task.group}]` : ""}`;
}

/**
 * Disparadores que valen la pena mostrar: cortos y no repetidos (un disparador igual en todas las
 * tareas es el genérico de la plantilla y no ayuda a elegir). Devuelve el que corresponde a cada una.
 */
export function usefulTriggers(items: Array<{ trigger: string | null }>, maxLength: number): Array<string | null> {
  const counts = new Map<string, number>();
  for (const { trigger } of items) if (trigger) counts.set(trigger, (counts.get(trigger) ?? 0) + 1);
  return items.map(({ trigger }) => (trigger && trigger.length <= maxLength && counts.get(trigger) === 1 ? trigger : null));
}
