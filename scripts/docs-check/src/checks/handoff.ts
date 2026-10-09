// Tarea en progreso de handoff.md: que la línea `Tarea N — título` se reconozca y que traiga un plan.

import { isPlaceholder, stripComments } from "../../../_shared/parse/markdown.ts";
import type { Check, Finding } from "../types.ts";

// «Sin tarea en curso» en los idiomas conocidos (el texto de la plantilla está traducido).
const NO_TASK_RE = /sin tarea en curso|no task in progress|no current task|no active task/i;

export const checkCurrentTask: Check = ({ docs }) => {
  const { handoff } = docs;
  const section = handoff.parsed.sections["in-progress"];
  if (!handoff.exists || !section) return [];
  const { task, steps } = handoff.parsed.inProgress;
  const findings: Finding[] = [];

  if (task) {
    if (!steps.length) {
      findings.push({
        severity: "warning",
        code: "current-no-plan",
        file: handoff.file,
        line: task.range?.startLine ?? section.headerRange.startLine,
        message: `La Tarea ${task.number} está en curso pero no tiene plan: agrega sus pasos como checkboxes \`- [ ] Paso\` (el seguimiento cuenta el avance con ellos).`,
      });
    }
    return findings;
  }

  // Sin tarea reconocida: está bien solo si la sección dice que no hay (o aún es la plantilla, que ya avisa el check de placeholders).
  const body = stripComments(section.body).trim();
  if (body && !NO_TASK_RE.test(body) && !isPlaceholder(body)) {
    findings.push({
      severity: "warning",
      code: "current-task-line",
      file: handoff.file,
      line: section.headerRange.startLine,
      message:
        "«Tarea en progreso» tiene contenido pero no se reconoce la línea `Tarea N — título` (antes de la primera subsección `###`): escríbela así, o deja «Sin tarea en curso» si no hay ninguna.",
    });
  }
  return findings;
};
