// Interpretación de team-backlog.md (modo multi-operador, ver skill/docs/multi-operator.md):
// las tareas sin dueño, `### <título único>` sin número, en las secciones libres y bloqueadas
// (anclas `free` y `blocked`, con plan B por orden).

import type { ParsedTeamBacklog, TeamTask } from "../types.ts";
import { parseFields } from "./blocks.ts";
import { isPlaceholder, stripComments } from "./markdown.ts";
import { findSections } from "./sections.ts";

export const TEAM_BACKLOG_SECTIONS: string[] = ["free", "blocked"];

const H3_RE = /^###(?!#)\s+(.+?)\s*$/;
const FENCE_RE = /^\s*(```|~~~)/;

/**
 * Tareas de team-backlog.md. Los placeholders de la plantilla quedan marcados con
 * `isPlaceholder` (no se pintan) y se avisan en `placeholders`.
 * @param text documento con saltos de línea LF
 */
export function parseTeamBacklog(text: string): ParsedTeamBacklog {
  const { sections, usedFallback, missing } = findSections(text, TEAM_BACKLOG_SECTIONS);
  const bodies: Record<string, string> = Object.fromEntries(
    TEAM_BACKLOG_SECTIONS.map((id) => [id, stripComments(sections[id]?.body ?? "")]),
  );
  return {
    free: parseTeamTasks(bodies.free),
    blocked: parseTeamTasks(bodies.blocked),
    usedFallback,
    missing,
    placeholders: Object.values(bodies).some(isPlaceholder),
  };
}

/** Tareas `### título` de una sección (ya sin comentarios HTML), con sus campos. */
function parseTeamTasks(body: string): TeamTask[] {
  const tasks: TeamTask[] = [];
  let lines: string[] = [];
  let current: TeamTask | null = null;
  let inFence = false;

  const flush = () => {
    if (!current) return;
    current.fields = parseFields(lines);
    current.body = lines.join("\n").trim();
    lines = [];
    current = null;
  };

  for (const line of body.split("\n")) {
    if (FENCE_RE.test(line)) inFence = !inFence;
    const heading = inFence ? null : line.match(H3_RE);
    if (heading) {
      flush();
      current = { title: heading[1], fields: [], body: "", isPlaceholder: isPlaceholder(heading[1]) };
      tasks.push(current);
      continue;
    }
    if (current) lines.push(line);
  }
  flush();
  return tasks;
}
