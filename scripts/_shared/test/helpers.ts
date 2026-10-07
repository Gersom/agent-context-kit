import { readFileSync } from "node:fs";
import { join } from "node:path";

export const FIXTURES = join(import.meta.dir, "fixtures");

/** Contenido de un fixture, o null si no existe (ej. backlog.md del set mínimo). */
export function fixture(name: string, file: string): string | null {
  try {
    return readFileSync(join(FIXTURES, name, file), "utf8").replace(/\r\n/g, "\n");
  } catch {
    return null;
  }
}

/** Contenido de un fixture que tiene que existir (falla el test si no está). */
export function requireFixture(name: string, file: string): string {
  const text = fixture(name, file);
  if (text == null) throw new Error(`Falta el fixture ${name}/${file}`);
  return text;
}

/** El fragmento de `text` que cubre un rango (los offsets son los del texto original, fin exclusivo). */
export function sliceRange(text: string, range: { start: number; end: number }): string {
  return text.slice(range.start, range.end);
}

/**
 * Comprueba que `startLine`/`endLine` de un rango coinciden con sus offsets (líneas 1-based,
 * `endLine` inclusive o `startLine - 1` si está vacío).
 */
export function lineNumbersMatch(text: string, range: { startLine: number; endLine: number; start: number; end: number }): boolean {
  const lineAt = (offset: number) => text.slice(0, offset).split("\n").length;
  return range.startLine === lineAt(range.start) && range.endLine === (range.end > range.start ? lineAt(range.end - 1) : range.startLine - 1);
}
