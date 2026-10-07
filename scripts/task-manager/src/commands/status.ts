// `status`: foto compacta del estado del operador (tarea en curso, pausadas, libres, bloqueadas,
// últimas cerradas y team-backlog) para que un agente no tenga que leer history.md ni el backlog
// entero. Solo lectura; de history solo imprime los headers de las últimas entradas.

import type { Command } from "../cli/types.ts";
import { blockedText, currentText, emitJson, freeText, nextStepText, relFile, taskLine } from "../query/format.ts";
import { buildState } from "../query/state.ts";

export const status: Command = {
  name: "status",
  summary: "Estado compacto: tarea en curso, pausadas, libres, bloqueadas y últimas cerradas (solo lectura)",
  usage: "status [--json] [--agents <ruta>] [--operator <carpeta>]",
  flags: { json: { type: "boolean", description: "Salida estructurada (JSON) en vez de texto." } },
  run({ flags, io, workspace, docs }) {
    const ws = workspace();
    const all = docs();
    const state = buildState(all);
    const warnings = [...ws.warnings, ...(ws.operator?.ownership === "other" ? ["Es la carpeta de otro operador: solo lectura."] : []), ...state.warnings];
    const handoffFile = relFile(ws, all.handoff.path);

    if (flags.json === true) {
      emitJson(io, "status", {
        operator: ws.operator?.folder ?? null,
        mode: ws.mode,
        current: state.current && { ...state.current, file: handoffFile },
        paused: state.paused,
        free: state.free,
        blocked: state.blocked,
        nextTaskNumber: state.nextTaskNumber?.value ?? null,
        recentHistory: state.recentHistory,
        team: state.team,
        warnings,
      });
      return;
    }

    if (ws.operator) io.out(`Operador: ${ws.operator.folder}`);
    if (state.current) {
      io.out(`En curso: ${currentText(state.current, handoffFile)[0]}`);
      currentText(state.current, handoffFile).slice(1).forEach((line) => io.out(line));
      nextStepText(state.current).forEach((line) => io.out(line));
    } else {
      io.out("En curso: Sin tarea en curso");
    }
    if (state.paused.length) {
      io.out(`Pausadas (${state.paused.length}):`);
      for (const task of state.paused) io.out(`  - ${taskLine(task.number, task.title)}`);
    }
    if (state.free.length) {
      io.out(`Libres (${state.free.length}):`);
      for (const task of state.free) io.out(`  - ${freeText(task)}`);
    }
    if (state.blocked.length) {
      io.out(`Bloqueadas (${state.blocked.length}):`);
      for (const task of state.blocked) io.out(`  - ${blockedText(task)}`);
    }
    if (state.nextTaskNumber) io.out(`Próximo número de tarea: ${state.nextTaskNumber.value}`);
    if (state.recentHistory.length) {
      io.out(`Últimas cerradas (history, ${state.recentHistory.length}):`);
      for (const entry of state.recentHistory) {
        io.out(`  - ${entry.date} ${entry.status === "done" ? "✅" : "❌"} ${entry.number != null ? `Tarea ${entry.number} — ` : ""}${entry.title}`);
      }
    }
    if (state.team && (state.team.free.length || state.team.blocked.length)) {
      io.out(`Team-backlog: ${state.team.free.length} libres, ${state.team.blocked.length} bloqueadas`);
      for (const task of state.team.free) io.out(`  - ${task.title}`);
      for (const task of state.team.blocked) io.out(`  - ${task.title}${task.tag ? ` [${task.tag}]` : ""} (bloqueada)`);
    }
    for (const warning of warnings) io.out(`Aviso: ${warning}`);
  },
};
