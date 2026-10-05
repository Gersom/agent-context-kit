// Interpretación de backlog.md: tareas libres (y referencias a grupos), bloqueadas y agrupadas.

import { parseBlocks } from "./blocks.js";
import { isPlaceholder, stripComments } from "./markdown.js";
import { BACKLOG_SECTIONS, findSections } from "./sections.js";

/**
 * backlog.md completo.
 * @param {string} text
 */
export function parseBacklog(text) {
  const { sections, usedFallback, missing } = findSections(text, BACKLOG_SECTIONS);
  const bodies = Object.fromEntries(BACKLOG_SECTIONS.map((id) => [id, stripComments(sections[id]?.body ?? "")]));
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
