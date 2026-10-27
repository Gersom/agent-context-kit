import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// La skill vive en un repo aparte, ignorado, que puede no estar clonado: en `agent-context-skill/` o en `skill/`.
// Los tests que la leen se saltan con `describe.skipIf(!hasSkill)`.

export const ROOT = join(import.meta.dir, "..", "..");

/**
 * Resuelve la carpeta de la skill. Orden: `SKILL_DIR`, `<root>/agent-context-skill`, `<root>/skill`.
 * Una candidata cuenta si `exists` confirma su `SKILL.md`; si ninguna existe, devuelve `<root>/skill`.
 */
export function resolveSkillDir(
  envSkillDir: string | undefined,
  root: string,
  exists: (path: string) => boolean,
): string {
  const candidates = [
    ...(envSkillDir ? [resolve(envSkillDir)] : []),
    join(root, "agent-context-skill"),
    join(root, "skill"),
  ];
  return candidates.find((dir) => exists(join(dir, "SKILL.md"))) ?? join(root, "skill");
}

export const SKILL_DIR = resolveSkillDir(process.env.SKILL_DIR, ROOT, existsSync);
export const hasSkill = existsSync(join(SKILL_DIR, "SKILL.md"));

// Los módulos se evalúan una vez por proceso, así que el aviso sale una sola vez.
if (!hasSkill) {
  console.warn("skill-checks: no se encontró la skill (SKILL_DIR, agent-context-skill/ o skill/); se saltan sus tests. Ver CONTRIBUTING.md.");
}

const normalize = (text: string) => text.replace(/\r\n/g, "\n");

/** Lee un archivo de la suite (relativo a la raíz del repo). */
export function readRoot(rel: string): string {
  return normalize(readFileSync(join(ROOT, rel), "utf8"));
}

/** Lee un archivo de la skill; `rel` va sin el prefijo de su carpeta (ej. `template/multi/AGENTS.md`). */
export function readSkill(rel: string): string {
  return normalize(readFileSync(join(SKILL_DIR, rel), "utf8"));
}
