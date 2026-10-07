// Lectura de los flags de texto de los comandos que escriben.

import { UsageError } from "../cli/errors.ts";
import type { FlagValue } from "../cli/types.ts";

/** El flag de texto, sin espacios en los extremos; `undefined` si no se pasó o quedó vacío. */
export function textFlag(flags: Record<string, FlagValue>, name: string): string | undefined {
  const value = flags[name];
  if (typeof value !== "string") return undefined;
  const text = value.replace(/\r\n?/g, "\n").trim();
  return text || undefined;
}

/** Un flag de texto obligatorio. @throws UsageError si falta o está vacío */
export function requiredFlag(flags: Record<string, FlagValue>, name: string): string {
  const text = textFlag(flags, name);
  if (!text) throw new UsageError(`Falta --${name}.`);
  return text;
}

/** Un título (o cualquier texto de una línea) no puede traer saltos de línea. @throws UsageError */
export function singleLine(name: string, value: string): string {
  if (value.includes("\n")) throw new UsageError(`--${name} debe ser una sola línea.`);
  return value;
}
