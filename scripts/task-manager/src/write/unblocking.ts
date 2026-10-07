// Lo que comparten `unblock` y `close` (Regla 7 de rules.md): decidir qué tareas bloqueadas dejaron
// de estarlo y moverlas al final de «Tareas libres» con su `Bloqueos` resuelto. `unblock` mira lo que
// `history.md` ya dice; `close` además cuenta como cerrada la tarea que está cerrando (todavía no
// figura en `history.md` cuando se calcula).

import type { ParsedBacklog, Task } from "../../../_shared/types.ts";
import { CliError } from "../cli/errors.ts";
import { type Edit } from "../edit/edits.ts";
import { blockSeparator, insertBlock } from "../edit/layout.ts";
import { trimRange } from "../query/lines.ts";
import type { BlockedInfo } from "../query/state.ts";
import type { Doc } from "../workspace/docs.ts";
import { currentBlockers, removeBlocks, resolvedValue, withBlockers } from "./blocking.ts";
import type { Strings } from "./language.ts";

// Una referencia `T-N@operador` es una tarea de OTRO operador: `findTaskRefs` solo ve `T-N` y la
// confundiría con una propia, así que ese motivo se deja para revisión manual.
const OTHER_OPERATOR_REF_RE = /(?<![\p{L}\p{N}])T-\d+@\S/u;

/**
 * Qué hacer con una tarea bloqueada al revisarlas todas:
 * - `auto`: el motivo nombra solo tareas propias y todas están cerradas.
 * - `stale`: ya no tiene un bloqueo vigente (solo falta moverla).
 * - `manual`: el motivo no nombra una tarea propia (texto libre, o una de otro operador).
 * - `waiting`: alguna tarea que nombra sigue sin cerrarse.
 */
export type Verdict = "auto" | "stale" | "manual" | "waiting";

/**
 * El veredicto de una bloqueada.
 * @param closing números de tareas que se están cerrando ahora: cuentan como cerradas aunque
 *   `history.md` todavía no las tenga
 */
export function judge(info: BlockedInfo, closing: number[] = []): Verdict {
  if (!info.tag) return "stale";
  if (OTHER_OPERATOR_REF_RE.test(info.reason ?? "")) return "manual";
  if (!info.refs.length) return "manual";
  return info.refs.every((ref) => ref.state === "closed" || closing.includes(ref.number)) ? "auto" : "waiting";
}

export interface BlockedReview {
  /** Las bloqueadas, con las tareas que se están cerrando ya marcadas como cerradas en sus referencias. */
  infos: BlockedInfo[];
  verdicts: Map<number, Verdict>;
}

/** Revisa todas las bloqueadas; con `closing`, esas tareas cuentan como cerradas. */
export function reviewBlocked(blocked: BlockedInfo[], closing: number[] = []): BlockedReview {
  const infos = blocked.map((info) => ({
    ...info,
    refs: info.refs.map((ref) => (closing.includes(ref.number) ? { ...ref, state: "closed" as const } : ref)),
  }));
  return { infos, verdicts: new Map(infos.map((info) => [info.number, judge(info)])) };
}

/** Lo que hay que escribir en `backlog.md` para desbloquear unas tareas. */
export interface UnblockPlan {
  /** Ediciones que sacan las tareas de «Tareas bloqueadas / pospuestas». */
  removals: Edit[];
  /** Sus bloques, con el `Bloqueos` resuelto, listos para ponerlos al final de «Tareas libres» (ver `insertIntoFree`). */
  blocks: string[];
}

/**
 * Saca las tareas `chosen` de «bloqueadas» y arma sus bloques con el `Bloqueos` resuelto
 * (`` `[Resuelto el <fecha>]` — era `[tag]` motivo ``; las que ya no tenían bloqueo vigente se mueven tal cual).
 * @param extraPicked otras tareas bloqueadas que el comando también saca de la sección (ej. la que se cierra)
 * @throws CliError falta alguna de las dos secciones, o no se encuentra el campo de bloqueos de una tarea
 */
export function planUnblock(backlog: Doc<ParsedBacklog>, chosen: BlockedInfo[], date: string, S: Strings, extraPicked: Task[] = []): UnblockPlan {
  const { blocked } = backlog.parsed;
  if (!backlog.parsed.sections.blocked || !backlog.parsed.sections.free) {
    throw new CliError("backlog.md no tiene las secciones «Tareas libres» y «Tareas bloqueadas / pospuestas» (anclas `free` y `blocked`). No se escribió nada.");
  }
  const text = backlog.text;
  const tasks = chosen.map((info) => blocked.find((task) => task.number === info.number)!);
  const blocks = tasks.map((task, i) => {
    const range = trimRange(text, task.range!);
    if (!chosen[i].tag) return text.slice(range.start, range.end);
    const value = currentBlockers(text, task.fields);
    if (!value) throw new CliError(`No encuentro el campo de bloqueos de la Tarea ${task.number}: edítalo a mano. No se escribió nada.`);
    return withBlockers(text, range, task.fields, S.fields.blockers, resolvedValue(value, date, S));
  });
  return { removals: removeBlocks(text, blocked, [...tasks, ...extraPicked], S.emptySection), blocks };
}

/**
 * Edición que pone `blocks` (ya renderizados) al final de «Tareas libres», con el espaciado de la
 * sección. Un solo `insertBlock` por sección: si hay varias fuentes de bloques (desbloqueadas y
 * nuevas), se pasan juntas.
 * @throws CliError falta la sección «Tareas libres»
 */
export function insertIntoFree(backlog: Doc<ParsedBacklog>, blocks: string[]): Edit {
  const destination = backlog.parsed.sections.free;
  if (!destination) throw new CliError("backlog.md no tiene la sección «Tareas libres» (ancla `free`). No se escribió nada.");
  const { free } = backlog.parsed;
  const freeBlocks = [...free.tasks, ...free.groups];
  const separator = blockSeparator(backlog.text, freeBlocks.flatMap((b) => (b.range ? [b.range] : [])));
  return insertBlock(backlog.text, destination.bodyRange, blocks.join(separator), { hasBlocks: freeBlocks.length > 0, separator });
}
