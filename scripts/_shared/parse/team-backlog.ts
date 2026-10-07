// Interpretación de team-backlog.md (modo multi-operador, ver skill/docs/multi-operator.md):
// las tareas sin dueño, `### <título único>` sin número, en las secciones libres y bloqueadas
// (anclas `free` y `blocked`, con plan B por orden).

import type { ParsedTeamBacklog, TeamTask } from "../types.ts";
import { parseFields } from "./blocks.ts";
import { isPlaceholder } from "./markdown.ts";
import { type BodyPos, LineIndex } from "./positions.ts";
import { findSections, sectionPos } from "./sections.ts";

export const TEAM_BACKLOG_SECTIONS: string[] = ["free", "blocked"];

const H3_RE = /^###(?!#)\s+(.+?)\s*$/;
const FENCE_RE = /^\s*(```|~~~)/;

/**
 * Tareas de team-backlog.md. Los placeholders de la plantilla quedan marcados con
 * `isPlaceholder` (no se pintan) y se avisan en `placeholders`. Cada tarea y cada campo traen su
 * `range` en el texto original.
 * @param text documento con saltos de línea LF
 */
export function parseTeamBacklog(text: string): ParsedTeamBacklog {
  const index = new LineIndex(text);
  const { sections, usedFallback, missing } = findSections(text, TEAM_BACKLOG_SECTIONS, index);
  const poses = Object.fromEntries(TEAM_BACKLOG_SECTIONS.map((id) => [id, sectionPos(sections[id], index)]));
  const bodies: Record<string, string> = Object.fromEntries(TEAM_BACKLOG_SECTIONS.map((id) => [id, poses[id]?.text ?? ""]));
  return {
    free: parseTeamTasks(bodies.free, poses.free),
    blocked: parseTeamTasks(bodies.blocked, poses.blocked),
    sections,
    usedFallback,
    missing,
    placeholders: Object.values(bodies).some(isPlaceholder),
  };
}

/** Tareas `### título` de una sección (ya sin comentarios HTML), con sus campos. */
function parseTeamTasks(body: string, pos?: BodyPos): TeamTask[] {
  const tasks: TeamTask[] = [];
  let lines: string[] = [];
  let current: { task: TeamTask; startLine: number } | null = null;
  let inFence = false;

  // `endLine` es la línea (0-based) donde empieza la tarea siguiente, o el total de líneas.
  const flush = (endLine: number) => {
    if (!current) return;
    current.task.fields = parseFields(lines, pos && { pos, firstLine: current.startLine + 1 });
    current.task.body = lines.join("\n").trim();
    if (pos) current.task.range = pos.blockLines(current.startLine, endLine);
    lines = [];
    current = null;
  };

  const all = body.split("\n");
  all.forEach((line, i) => {
    if (FENCE_RE.test(line)) inFence = !inFence;
    const heading = inFence ? null : line.match(H3_RE);
    if (heading) {
      flush(i);
      const task: TeamTask = { title: heading[1], fields: [], body: "", isPlaceholder: isPlaceholder(heading[1]) };
      tasks.push(task);
      current = { task, startLine: i };
      return;
    }
    if (current) lines.push(line);
  });
  flush(all.length);
  return tasks;
}
