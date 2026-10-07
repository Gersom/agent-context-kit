// Interpretación de backlog.md: tareas libres (y referencias a grupos), bloqueadas y agrupadas.

import type { ParsedBacklog } from "../types.ts";
import { parseBlocks } from "./blocks.ts";
import { isPlaceholder } from "./markdown.ts";
import { LineIndex } from "./positions.ts";
import { BACKLOG_SECTIONS, findSections, sectionPos } from "./sections.ts";

/** backlog.md completo. */
export function parseBacklog(text: string): ParsedBacklog {
  const index = new LineIndex(text);
  const { sections, usedFallback, missing } = findSections(text, BACKLOG_SECTIONS, index);
  const poses = Object.fromEntries(BACKLOG_SECTIONS.map((id) => [id, sectionPos(sections[id], index)]));
  const bodies: Record<string, string> = Object.fromEntries(BACKLOG_SECTIONS.map((id) => [id, poses[id]?.text ?? ""]));
  const free = parseBlocks(bodies.free, poses.free);
  return {
    free: { tasks: free.tasks, groups: free.groups.filter((g) => g.taskNumbers.length) },
    blocked: parseBlocks(bodies.blocked, poses.blocked).tasks,
    grouped: parseBlocks(bodies.grouped, poses.grouped).groups.filter((g) => g.tasks.length),
    sections,
    usedFallback,
    missing,
    placeholders: Object.values(bodies).some(isPlaceholder),
  };
}
