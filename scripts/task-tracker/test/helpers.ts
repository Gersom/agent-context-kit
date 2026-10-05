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
