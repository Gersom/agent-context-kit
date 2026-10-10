import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// La skill (`skill/`) vive en un repo aparte, ignorado, que puede no estar clonado.
// Los tests que la leen se saltan con `describe.skipIf(!hasSkill)`.

export const ROOT = join(import.meta.dir, "..", "..");
export const SKILL_DIR = process.env.SKILL_DIR ? resolve(process.env.SKILL_DIR) : join(ROOT, "skill");
export const hasSkill = existsSync(join(SKILL_DIR, "SKILL.md"));

// Los módulos se evalúan una vez por proceso, así que el aviso sale una sola vez.
if (!hasSkill) {
  console.warn(`skill-checks: no se encontró la skill en ${SKILL_DIR}; se saltan sus tests. Defínela con SKILL_DIR=<ruta> o clónala en skill/.`);
}

const normalize = (text: string) => text.replace(/\r\n/g, "\n");

/** Lee un archivo del kit (relativo a la raíz del repo). */
export function readRoot(rel: string): string {
  return normalize(readFileSync(join(ROOT, rel), "utf8"));
}

/** Lee un archivo de la skill; `rel` va sin el prefijo `skill/` (ej. `template/multi/AGENTS.md`). */
export function readSkill(rel: string): string {
  return normalize(readFileSync(join(SKILL_DIR, rel), "utf8"));
}
