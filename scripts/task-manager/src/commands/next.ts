// `next`: qué hacer ahora, lo mínimo. Con tarea en curso, su primer paso pendiente y el próximo
// paso concreto; sin ella, las pausadas (retomables), las libres y las del team-backlog, y avisa
// de las bloqueadas que ya podrían desbloquearse. No elige por el operador: lista y sugiere.

import type { Command } from "../cli/types.ts";
import { blockedText, emitJson, freeText, nextStepText, relFile, shorten, taskLine, usefulTriggers } from "../query/format.ts";
import { buildState, SHORT_TRIGGER } from "../query/state.ts";

export const next: Command = {
  name: "next",
  summary: "Qué hacer ahora: el siguiente paso de la tarea en curso o las tareas que se pueden tomar (solo lectura)",
  usage: "next [--json] [--agents <ruta>] [--operator <carpeta>]",
  flags: { json: { type: "boolean", description: "Salida estructurada (JSON) en vez de texto." } },
  run({ flags, io, workspace, docs }) {
    const ws = workspace();
    const all = docs();
    const state = buildState(all);
    const candidates = state.blocked.filter((task) => task.unblockCandidate);
    const team = state.team?.free ?? [];
    const mode = state.current ? "current" : state.paused.length || state.free.length || team.length ? "pick" : "empty";

    if (flags.json === true) {
      emitJson(io, "next", {
        mode,
        current: state.current && { ...state.current, file: relFile(ws, all.handoff.path) },
        paused: state.current ? [] : state.paused,
        free: state.current ? [] : state.free,
        team: state.current ? [] : team,
        unblockCandidates: state.current ? [] : candidates,
        suggestion: suggestion(mode, state.paused.length > 0) || null,
      });
      return;
    }

    if (state.current) {
      io.out(`En curso: ${taskLine(state.current.number, state.current.title)}`);
      const plan = state.current.plan;
      if (plan) io.out(`  ${plan.nextStep ? `Siguiente paso (${plan.done}/${plan.total} hechos): ${plan.nextStep}` : `Plan completo (${plan.total}/${plan.total}): falta cerrar la tarea`}`);
      nextStepText(state.current).forEach((line) => io.out(line));
      return;
    }

    io.out("Sin tarea en curso.");
    if (state.paused.length) {
      io.out("Pausadas (retomables):");
      for (const task of state.paused) {
        const plan = task.plan ? ` (plan ${task.plan.done}/${task.plan.total})` : "";
        io.out(`  - ${taskLine(task.number, task.title)}${plan}`);
      }
    }
    const withTrigger = (items: Array<{ trigger: string | null }>, text: (index: number) => string) => {
      const triggers = usefulTriggers(items, SHORT_TRIGGER);
      items.forEach((_, i) => io.out(`  - ${text(i)}${triggers[i] ? `  (Disparador: ${shorten(triggers[i], SHORT_TRIGGER)})` : ""}`));
    };
    if (state.free.length) {
      io.out("Libres (en el orden del archivo):");
      withTrigger(state.free, (i) => freeText(state.free[i]));
    }
    if (team.length) {
      io.out("Libres del team-backlog (se toman por título):");
      withTrigger(team, (i) => team[i].title);
    }
    if (candidates.length) {
      io.out("Bloqueadas que podrían desbloquearse (Regla 7):");
      for (const task of candidates) io.out(`  - ${blockedText(task)}`);
    }
    io.out(suggestion(mode, state.paused.length > 0));
  },
};

/** Sugerencia final: el operador elige, esto solo le dice por dónde mirar. */
function suggestion(mode: "current" | "pick" | "empty", hasPaused: boolean): string {
  if (mode === "current") return "";
  if (mode === "empty") return "No hay tareas pendientes: agrega una al backlog o al team-backlog.";
  return hasPaused
    ? "Sugerencia: retomar una pausada o tomar una libre; la elige el operador."
    : "Sugerencia: tomar una libre; la elige el operador.";
}
