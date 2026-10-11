// Marcador de versión de la skill en la línea 1 de rules.md (lo escribe la skill desde la 1.9.0 y le
// sirve para detectar versiones más nuevas). Es solo un aviso: un proyecto anterior no lo tiene.

import type { Check, Finding } from "../types.ts";

/** Marcador de versión de la skill; el grupo 1 es la versión. Mismo formato que en la plantilla de la skill. */
export const VERSION_MARKER_RE = /<!-- agent-context-kit:version (\d+\.\d+\.\d+)[^>]*-->/;

/** Texto que identifica el marcador aunque su versión esté mal formada. */
export const VERSION_MARKER_NAME = "agent-context-kit:version";

/** `rules.md` lleva el marcador de versión en sus primeras líneas y bien formado. Si no existe, no dice nada. */
export const checkSkillVersion: Check = ({ rules }) => {
  if (!rules.exists) return [];
  const lines = rules.head.split("\n");
  if (lines.some((line) => VERSION_MARKER_RE.test(line))) return [];
  const findings: Finding[] = [];
  const malformed = lines.findIndex((line) => line.includes(VERSION_MARKER_NAME));
  if (malformed >= 0) {
    findings.push({
      severity: "warning",
      code: "skill-version",
      file: rules.file,
      line: malformed + 1,
      message: `El marcador de versión de la skill no tiene un formato válido: debe ser \`<!-- ${VERSION_MARKER_NAME} X.Y.Z … -->\`, con la versión como tres números separados por puntos.`,
    });
  } else {
    findings.push({
      severity: "warning",
      code: "skill-version",
      file: rules.file,
      line: null,
      message:
        "Falta el marcador de versión de la skill en las primeras líneas de rules.md: los proyectos generados antes de la 1.9.0 no lo tienen; agrégalo con la versión de la skill que generó las reglas.",
    });
  }
  return findings;
};
