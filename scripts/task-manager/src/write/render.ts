// Texto que el script escribe: bloques de tarea de backlog.md y team-backlog.md y el cuerpo de
// «Tarea en progreso» de handoff.md, con el formato exacto de las plantillas de
// skill/template/agents/. Funciones puras (sin leer ni escribir archivos).

import type { Field } from "../../../_shared/types.ts";
import { findFieldOfKind, NONE_RE, type FieldKind, type Strings } from "./language.ts";

/** Texto con LF, sin espacios al final de cada línea ni saltos de línea en los extremos. */
export function normalizeText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .trim();
}

/** Fecha local `YYYY-MM-DD`. */
export function formatLocalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * `- **Etiqueta:** valor`. Un valor de varias líneas sigue indentado dos espacios, como lo lee el
 * parser (las líneas indentadas continúan el campo y no pueden confundirse con un header o campo).
 */
export function renderField(label: string, value: string): string {
  const [first, ...rest] = normalizeText(value).split("\n");
  return [`- **${label}:** ${first}`, ...rest.map((line) => (line ? `  ${line}` : ""))].join("\n");
}

/** Un bloque de tarea: su header, una línea en blanco y sus campos (sin salto de línea final). */
export function renderTaskBlock(header: string, fields: Array<[label: string, value: string]>): string {
  return `${header}\n\n${fields.map(([label, value]) => renderField(label, value)).join("\n")}`;
}

/**
 * Pasos de un plan a partir de un texto con uno por línea. Quita las líneas en blanco y el
 * prefijo de lista o checkbox que ya traigan (`- [ ] `, `- `).
 */
export function parsePlan(text: string): string[] {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.trim().replace(/^[-*](?:\s+(?:\[[ xX]\]\s*)?|$)/, "").trim())
    .filter(Boolean);
}

/**
 * El valor de un campo tal como está en el archivo, sin la etiqueta y sin la indentación de sus
 * líneas de continuación (conserva sublistas). Texto vacío si el campo no tiene valor.
 */
export function fieldBody(text: string, field: Field): string {
  const raw = field.range ? text.slice(field.range.start, field.range.end) : field.value;
  const [first = "", ...rest] = raw.replace(/\s+$/, "").split("\n");
  const head = first.replace(/^[-*]\s+\*\*.+?(?::\*\*|\*\*:)\s*/, "");
  return [head, ...rest.map((line) => line.replace(/^ {1,2}/, ""))].join("\n").trim();
}

/** Valor de un campo por su tipo, o `null` si falta, es un placeholder o dice «Ninguno». */
export function meaningfulField(text: string, fields: Field[], kind: FieldKind): string | null {
  const field = findFieldOfKind(fields, kind);
  if (!field || field.isPlaceholder) return null;
  const body = fieldBody(text, field);
  return body && !NONE_RE.test(body) ? body : null;
}

/** Tipos de campo que se tratan aparte al empezar una tarea; los demás (Detalles, Desbloquea, Origen...) se conservan. */
const HANDLED_KINDS: FieldKind[] = ["description", "decisions", "blockers", "trigger", "added"];

/**
 * Los campos de una tarea que no tienen lugar propio en el handoff (`Detalles`, `Desbloquea`,
 * `Origen`...), tal como están escritos en el archivo, para que no se pierdan al sacar la tarea del
 * backlog. Se omiten los vacíos («Ninguno»), los placeholders y los que ya van aparte.
 */
export function carriedFields(text: string, fields: Field[]): string[] {
  return fields
    .filter((field) => !field.isPlaceholder && !HANDLED_KINDS.some((kind) => findFieldOfKind([field], kind)))
    .filter((field) => !NONE_RE.test(fieldBody(text, field)) && fieldBody(text, field) !== "")
    .map((field) => (field.range ? text.slice(field.range.start, field.range.end).replace(/\s+$/, "") : `- **${field.label}:** ${field.value}`));
}

export interface InProgressInput {
  strings: Strings;
  /** Palabra del header (`Tarea`, `Task`). */
  label: string;
  number: number;
  title: string;
  description: string | null;
  /** Líneas `- **Campo:** valor` ya escritas (Detalles, Origen...), tras la descripción. */
  extras: string[];
  /** Lo que la tarea traía en «decisiones a definir», si no era «Ninguno». */
  decisions: string | null;
  /** Pasos del plan, sin el de cierre (se agrega siempre); `null` si la tarea va sin plan. */
  plan: string[] | null;
  mode: string | null;
}

/**
 * Cuerpo de «Tarea en progreso» según la plantilla de handoff.md (sin salto de línea final): la
 * línea `Tarea N — título` antes de la primera subsección `###`, la descripción, y las subsecciones
 * Plan (solo con plan; termina siempre en «Documentar cierre de tarea»), Qué falta, Decisiones a
 * medio camino y Próximo paso concreto, en ese orden (el tracker y `status` las ubican por posición).
 */
export function renderInProgress(input: InProgressInput): string {
  const { strings: S, plan } = input;
  const parts: string[] = [`${input.label} ${input.number} — ${input.title}`];
  if (input.description) parts.push(input.description);
  if (input.extras.length) parts.push(input.extras.join("\n"));
  if (plan) {
    const closing = new RegExp(`^(${S.closeStep}|documentar cierre|document task closure)`, "i");
    const steps = [...plan, ...(plan.length && closing.test(plan[plan.length - 1]) ? [] : [S.closeStep])];
    parts.push(`### ${S.plan}\n\n${steps.map((step) => `- [ ] ${step}`).join("\n")}`);
    if (input.mode) parts.push(`**${S.mode}:** ${input.mode}`);
  }
  parts.push(`### ${S.missing}\n\n${plan ? S.missingWithPlan : S.missingNoPlan}`);
  parts.push(`### ${S.decisions}\n\n${input.decisions ?? S.noDecisions}`);
  parts.push(`### ${S.next}\n\n${plan?.length ? plan[0] : S.nextNoPlan}`);
  return parts.join("\n\n");
}
