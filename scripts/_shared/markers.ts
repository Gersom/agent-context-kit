// Prefijo de los comentarios HTML de máquina de la skill: anclas de sección, marcador de versión,
// firma y bloques `start`/`end` de AGENTS.md y CLAUDE.md. Desde la skill 2.0.0 es uno solo. Los
// prefijos anteriores se siguen leyendo (los proyectos generados antes los tienen) y nunca se escriben.

/** Prefijo vigente, igual al nombre del repo de la skill. */
export const MARKER_PREFIX = "agent-context-skill";

/** Prefijo anterior a la 2.0.0 de anclas, marcador de versión y firma. */
export const LEGACY_MARKER_PREFIX = "agent-context-kit";

/** Prefijo anterior a la 2.0.0 de los bloques `start`/`end` de AGENTS.md y CLAUDE.md. */
export const LEGACY_ROOT_PREFIX = "agent-docs-skill";

/** Fragmento de regex para anclas, versión y firma: el prefijo vigente o el anterior. */
export const ANCHOR_PREFIX_PATTERN = `(?:${MARKER_PREFIX}|${LEGACY_MARKER_PREFIX})`;

/** Marcador de máquina con un prefijo anterior (`agent-context-kit:section=…`, `agent-docs-skill:start`…). */
export const LEGACY_MARKER_RE = new RegExp(
  String.raw`<!--\s*(?:${LEGACY_MARKER_PREFIX}:(?:section|version|signature)|${LEGACY_ROOT_PREFIX}:(?:start|end))`,
);

/** Líneas (1-based) de `text` que llevan un marcador con prefijo anterior. */
export function legacyMarkerLines(text: string): number[] {
  const out: number[] = [];
  text.split("\n").forEach((line, i) => {
    if (LEGACY_MARKER_RE.test(line)) out.push(i + 1);
  });
  return out;
}
