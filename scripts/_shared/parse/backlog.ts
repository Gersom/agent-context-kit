// Interpretación de backlog.md: tareas libres (y referencias a grupos), bloqueadas y agrupadas.

import type { ParsedBacklog } from "../types.ts";
import { parseBlocks } from "./blocks.ts";
import { isPlaceholder, stripComments } from "./markdown.ts";
import { BACKLOG_SECTIONS, findSections } from "./sections.ts";

/** backlog.md completo. */
export function parseBacklog(text: string): ParsedBacklog {
  const { sections, usedFallback, missing } = findSections(text, BACKLOG_SECTIONS);
  const bodies: Record<string, string> = Object.fromEntries(
    BACKLOG_SECTIONS.map((id) => [id, stripComments(sections[id]?.body ?? "")]),
  );
  const free = parseBlocks(bodies.free);
  return {
    free: { tasks: free.tasks, groups: free.groups.filter((g) => g.taskNumbers.length) },
    blocked: parseBlocks(bodies.blocked).tasks,
    grouped: parseBlocks(bodies.grouped).groups.filter((g) => g.tasks.length),
    usedFallback,
    missing,
    placeholders: Object.values(bodies).some(isPlaceholder),
  };
}
