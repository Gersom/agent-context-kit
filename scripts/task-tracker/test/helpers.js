import { readFileSync } from "node:fs";
import { join } from "node:path";

export const FIXTURES = join(import.meta.dir, "fixtures");

/** Contenido de un fixture, o null si no existe (ej. backlog.md del set mínimo). */
export function fixture(name, file) {
  try {
    return readFileSync(join(FIXTURES, name, file), "utf8").replace(/\r\n/g, "\n");
  } catch {
    return null;
  }
}
