// `unblock [<N>]`: saca tareas de «Tareas bloqueadas / pospuestas» y las pone al final de «Tareas
// libres» de tu `backlog.md` (Regla 7: `Bloqueos` no se borra, pasa a `` `[Resuelto el <fecha>]` — era
// `[tag]` motivo ``).
// - Con `<N>`: desbloquea esa tarea, sin más condiciones (la decisión ya la tomó quien lo pide).
// - Sin argumento: revisa todas las bloqueadas y desbloquea solas las que el motivo condiciona a
//   «Tarea N» y todas esas tareas ya están cerradas en `history.md` (y las que ya no tienen un
//   bloqueo vigente). Las de motivo en texto libre —o que mencionan una tarea de otro operador— no
//   se tocan: se listan para revisarlas a mano (y, si corresponde, `unblock <N>`).
// Sin `--apply` solo muestra el diff.

import { CliError, UsageError } from "../cli/errors.ts";
import type { Command } from "../cli/types.ts";
import type { ChangeResult } from "../edit/changes.ts";
import { blockSeparator, insertBlock } from "../edit/layout.ts";
import { describeKnownNumbers, findTask, parseTarget } from "../query/find.ts";
import { blockedText, relFile, taskLine } from "../query/format.ts";
import { trimRange } from "../query/lines.ts";
import { type BlockedInfo, buildState } from "../query/state.ts";
import { requireDoc } from "../workspace/docs.ts";
import { requireOwnFolder } from "../workspace/ownership.ts";
import { currentBlockers, removeBlocks, resolvedValue, withBlockers } from "../write/blocking.ts";
import { emitWriteJson, JSON_FLAG } from "../write/json.ts";
import { detectLanguage, STRINGS } from "../write/language.ts";
import { formatLocalDate } from "../write/render.ts";
import { headerLabels } from "../write/samples.ts";

// Una referencia `T-N@operador` es una tarea de OTRO operador: `findTaskRefs` solo ve `T-N` y la
// confundiría con una propia, así que ese motivo se deja para revisión manual.
const OTHER_OPERATOR_REF_RE = /(?<![\p{L}\p{N}])T-\d+@\S/u;

type Verdict = "auto" | "stale" | "manual" | "waiting";

/** Qué hacer con una bloqueada al revisarlas todas. */
function judge(info: BlockedInfo): Verdict {
  if (!info.tag) return "stale";
  if (OTHER_OPERATOR_REF_RE.test(info.reason ?? "")) return "manual";
  if (!info.refs.length) return "manual";
  return info.refs.every((ref) => ref.state === "closed") ? "auto" : "waiting";
}

export const unblock: Command = {
  name: "unblock",
  summary: "Desbloquea tareas del backlog: una (`unblock N`) o, sin número, las que bloqueaba una tarea ya cerrada; escribe con --apply",
  usage: "unblock [<N | T-N>] [--json] [--apply]",
  writes: true,
  flags: { json: JSON_FLAG },
  run(ctx) {
    const { flags, io } = ctx;
    if (ctx.args.length > 1) throw new UsageError("`unblock` recibe a lo sumo una tarea: `unblock <N>`, o sin número para revisar todas las bloqueadas.");
    const wanted = ctx.args.length ? parseTarget(ctx.args[0]) : null;
    if (wanted?.kind === "title") throw new UsageError(`«${ctx.args[0]}» no es un número de tarea: \`unblock <N>\`.`);
    if (wanted?.operator) throw new CliError(`unblock solo desbloquea tareas de tu propia carpeta; «${ctx.args[0]}» es de otro operador (solo lectura). No se escribió nada.`);
    const ws = ctx.workspace();
    requireOwnFolder(ws);
    const docs = ctx.docs();
    const backlog = requireDoc(docs.backlog, "backlog.md");
    const state = buildState(docs);

    // Qué tareas bloqueadas se desbloquean, y las que quedan para revisar.
    const verdicts = new Map(state.blocked.map((info) => [info.number, judge(info)]));
    let chosen: BlockedInfo[];
    if (wanted) {
      const found = findTask(docs, wanted.number);
      if (!found.length) throw new CliError(`No existe la Tarea ${wanted.number}. ${describeKnownNumbers(docs)}`);
      if (found.length > 1) {
        throw new CliError(`La Tarea ${wanted.number} aparece en ${found.length} lugares (${found.map((l) => l.place).join(", ")}): una tarea vive en un solo lugar; corrígelo a mano. No se escribió nada.`);
      }
      if (found[0].place !== "blocked") throw new CliError(`La Tarea ${wanted.number} no está en «bloqueadas / pospuestas» (está en: ${found[0].place}). No se escribió nada.`);
      chosen = state.blocked.filter((info) => info.number === wanted.number);
    } else {
      chosen = state.blocked.filter((info) => ["auto", "stale"].includes(verdicts.get(info.number)!));
    }
    const rest = (verdict: Verdict) => (wanted ? [] : state.blocked.filter((info) => verdicts.get(info.number) === verdict));

    let result: ChangeResult | null = null;
    if (chosen.length) {
      const { blocked, free } = backlog.parsed;
      const source = backlog.parsed.sections.blocked;
      const destination = backlog.parsed.sections.free;
      if (!source || !destination) {
        throw new CliError("backlog.md no tiene las secciones «Tareas libres» y «Tareas bloqueadas / pospuestas» (anclas `free` y `blocked`). No se escribió nada.");
      }
      const text = backlog.text;
      const { lang, notice } = detectLanguage([blocked[0]?.label, ...headerLabels(docs)].filter((label): label is string => !!label));
      const S = STRINGS[lang];
      const date = formatLocalDate(ctx.now());
      const tasks = chosen.map((info) => blocked.find((task) => task.number === info.number)!);

      // Cada bloque con su `Bloqueos` resuelto (los que ya no tenían bloqueo vigente se mueven tal cual).
      const moved = tasks.map((task, i) => {
        const range = trimRange(text, task.range!);
        if (!chosen[i].tag) return text.slice(range.start, range.end);
        const value = currentBlockers(text, task.fields);
        if (!value) throw new CliError(`No encuentro el campo de bloqueos de la Tarea ${task.number}: edítalo a mano. No se escribió nada.`);
        return withBlockers(text, range, task.fields, S.fields.blockers, resolvedValue(value, date, S));
      });
      const freeBlocks = [...free.tasks, ...free.groups];
      const separator = blockSeparator(text, freeBlocks.flatMap((b) => (b.range ? [b.range] : [])));
      const insert = insertBlock(text, destination.bodyRange, moved.join(separator), { hasBlocks: freeBlocks.length > 0, separator });
      result = ctx.commit([{ doc: backlog, edits: [...removeBlocks(text, blocked, tasks, S.emptySection), insert] }], { quiet: flags.json === true });
      if (notice && flags.json !== true) io.out(`Aviso: ${notice}`);
    }

    if (flags.json === true) {
      const row = (info: BlockedInfo) => ({ number: info.number, title: info.title, tag: info.tag, reason: info.reason, refs: info.refs });
      const payload = {
        unblocked: chosen.map((info) => ({ ...row(info), noActiveBlock: !info.tag })),
        manualReview: rest("manual").map(row),
        stillBlocked: rest("waiting").map(row),
      };
      if (result) emitWriteJson(ctx, "unblock", result, payload);
      else emitWriteJson(ctx, "unblock", { dryRun: ctx.global.dryRun, files: [] }, payload);
      return;
    }

    const written = result?.files.some((file) => file.written) ?? false;
    if (written) io.out(`Desbloqueadas (${chosen.length}), pasaron a «Tareas libres» de ${relFile(ws, backlog.path)}:`);
    else if (chosen.length) io.out(`Se desbloquearían (${chosen.length}):`);
    for (const info of chosen) {
      const why = !info.tag ? "ya no tenía un bloqueo vigente" : info.refs.length ? info.refs.map((ref) => `Tarea ${ref.number} cerrada`).join(", ") : "decidido por quien lo pidió";
      io.out(`  ${taskLine(info.number, info.title)} — ${why}`);
    }
    if (!chosen.length && !wanted) io.out("Ninguna tarea bloqueada se puede desbloquear sola.");
    if (rest("manual").length) {
      io.out(`Para revisar a mano (el motivo no nombra una tarea propia): si ya no aplica, \`unblock <N>\`:`);
      for (const info of rest("manual")) io.out(`  ${blockedText(info)}`);
    }
    if (rest("waiting").length) {
      io.out("Siguen bloqueadas:");
      for (const info of rest("waiting")) io.out(`  ${blockedText(info)}`);
    }
  },
};
