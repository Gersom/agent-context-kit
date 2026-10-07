// `step`: marca (o con `--undo` desmarca) pasos del «Plan» de la tarea en curso y pone al día los
// textos de handoff.md que dependen del avance (Regla 6 de rules.md): «Qué falta» y «Próximo paso
// concreto». Esos dos se reescriben solos únicamente si siguen con el texto que dejó el script
// (el de `start` o el que `step` mismo generó); un texto que alguien escribió no se toca sin el flag
// correspondiente (`--falta`, `--proximo`; `--decisiones` nunca es automático). Sin `--apply` solo
// muestra el diff.

import type { PlanStep } from "../../../_shared/types.ts";
import { CliError, UsageError } from "../cli/errors.ts";
import type { Command } from "../cli/types.ts";
import { replaceRange, type Edit } from "../edit/edits.ts";
import { replaceSubsectionBody } from "../edit/layout.ts";
import { normalizeTitle } from "../query/find.ts";
import { relFile } from "../query/format.ts";
import { requireDoc } from "../workspace/docs.ts";
import { requireOwnFolder } from "../workspace/ownership.ts";
import { textFlag } from "../write/flags.ts";
import { findPart } from "../write/handoff.ts";
import { emitWriteJson, JSON_FLAG } from "../write/json.ts";
import { detectLanguage, STRINGS, type Strings } from "../write/language.ts";
import { normalizeText } from "../write/render.ts";
import { headerLabels } from "../write/samples.ts";

/** Qué paso es el que se pidió: un número (posición, desde 1) o parte del texto del paso. */
function resolveStep(arg: string, steps: PlanStep[]): number {
  const wanted = arg.trim();
  if (/^\d+$/.test(wanted)) {
    const index = Number(wanted);
    if (index < 1 || index > steps.length) throw new CliError(`El plan tiene ${steps.length} pasos: no existe el paso ${index}. No se escribió nada.`);
    return index - 1;
  }
  const query = normalizeTitle(wanted);
  const exact = steps.flatMap((step, i) => (normalizeTitle(step.text) === query ? [i] : []));
  const found = exact.length ? exact : steps.flatMap((step, i) => (query && normalizeTitle(step.text).includes(query) ? [i] : []));
  if (!found.length) throw new CliError(`Ningún paso del plan tiene «${wanted}» en su texto. Usa el número del paso (1 a ${steps.length}). No se escribió nada.`);
  if (found.length > 1) {
    throw new CliError(`«${wanted}» coincide con ${found.length} pasos; usa su número:\n${found.map((i) => `  ${i + 1}. ${steps[i].text}`).join("\n")}\nNo se escribió nada.`);
  }
  return found[0];
}

/** Los textos que `step` escribe solo (y por lo tanto reconoce como suyos) según los pasos pendientes. */
function generated(S: Strings, pending: string[]): Record<"missing" | "next", string> {
  return {
    missing: pending.length ? `${S.pendingSteps}\n${pending.map((text) => `- ${text}`).join("\n")}` : S.allDone,
    next: pending[0] ?? S.planDone,
  };
}

export const step: Command = {
  name: "step",
  summary: "Marca pasos del plan de la tarea en curso y actualiza «Qué falta» y «Próximo paso concreto»; escribe con --apply",
  usage: "step [<N | texto>...] [--undo] [--falta <texto>] [--decisiones <texto>] [--proximo <texto>] [--json] [--apply]",
  writes: true,
  flags: {
    undo: { type: "boolean", description: "Desmarcar los pasos indicados en vez de marcarlos." },
    falta: { type: "string", valueName: "texto", stdin: true, description: "Texto de «Qué falta» (reemplaza al actual). Sin él, se actualiza solo si seguía con el texto automático." },
    decisiones: { type: "string", valueName: "texto", stdin: true, description: "Texto de «Decisiones a medio camino» (reemplaza al actual; nunca cambia solo)." },
    proximo: { type: "string", valueName: "texto", stdin: true, description: "Texto de «Próximo paso concreto» (reemplaza al actual). Sin él, se actualiza solo si seguía con el texto automático." },
    json: JSON_FLAG,
  },
  run(ctx) {
    const { flags, io } = ctx;
    const ws = ctx.workspace();
    requireOwnFolder(ws);
    const given: Record<"missing" | "decisions" | "next", string | undefined> = {
      missing: textFlag(flags, "falta"),
      decisions: textFlag(flags, "decisiones"),
      next: textFlag(flags, "proximo"),
    };
    const undo = flags.undo === true;
    if (!ctx.args.length && !Object.values(given).some(Boolean)) {
      throw new UsageError("Indica qué paso marcar (`step <N | texto>`) o qué texto actualizar (`--falta`, `--decisiones`, `--proximo`).");
    }
    if (undo && !ctx.args.length) throw new UsageError("--undo necesita indicar qué paso desmarcar: `step <N | texto> --undo`.");

    const docs = ctx.docs();
    const handoff = requireDoc(docs.handoff, "handoff.md");
    const { task, steps, subsections } = handoff.parsed.inProgress;
    if (!task) throw new CliError("No hay tarea en curso: «Tarea en progreso» dice «Sin tarea en curso». No se escribió nada.");
    if (ctx.args.length && !steps.length) throw new CliError(`La Tarea ${task.number} no tiene plan (checkboxes) en «Tarea en progreso»: no hay pasos que marcar. No se escribió nada.`);

    const want = !undo;
    const targets = [...new Set(ctx.args.map((arg) => resolveStep(arg, steps)))];
    const toggled = targets.filter((i) => steps[i].done !== want);
    const notes = targets.filter((i) => steps[i].done === want).map((i) => `El paso ${i + 1} ya estaba ${want ? "hecho" : "pendiente"}: «${steps[i].text}».`);

    const edits: Edit[] = toggled.map((i) => replaceRange(steps[i].markRange!, want ? "x" : " "));

    // Textos que dependen del avance. Con labels de la tarea se elige el idioma de los que se generan.
    const S = STRINGS[detectLanguage([task.label, ...headerLabels(docs)]).lang];
    const pendingBefore = steps.filter((s) => !s.done).map((s) => s.text);
    const pendingAfter = steps.filter((s, i) => (toggled.includes(i) ? !want : !s.done)).map((s) => s.text);
    const before = generated(S, pendingBefore);
    const after = generated(S, pendingAfter);
    const defaults = (part: "missing" | "next"): string[] =>
      Object.values(STRINGS).flatMap((strings) => (part === "missing" ? [strings.missingWithPlan, strings.missingNoPlan] : [strings.nextNoPlan]));

    const updated: string[] = [];
    const stale: Array<{ label: string; flag: string }> = [];
    for (const part of ["missing", "decisions", "next"] as const) {
      const sub = findPart(subsections, part);
      let text = given[part] && normalizeText(given[part]);
      if (!text && toggled.length && part !== "decisions" && sub) {
        // Sigue con el texto del script (el de `start` o el generado antes por `step`): se pone al día.
        const current = sub.body.trim();
        if (current === before[part] || defaults(part).includes(current)) text = after[part];
        else stale.push({ label: sub.title, flag: part === "missing" ? "--falta" : "--proximo" });
      }
      if (!text) continue;
      if (!sub) throw new CliError(`«Tarea en progreso» no tiene la subsección «${STRINGS.es[part]}»: agrégala a mano antes de actualizarla. No se escribió nada.`);
      if (sub.body.trim() === text) continue;
      edits.push(replaceSubsectionBody(handoff.text, sub.range!, text));
      updated.push(sub.title);
    }

    const result = ctx.commit([{ doc: handoff, edits }], { quiet: flags.json === true });
    const done = steps.filter((s, i) => (toggled.includes(i) ? want : s.done)).length;
    if (flags.json === true) {
      emitWriteJson(ctx, "step", result, {
        task: { number: task.number, title: task.title },
        steps: steps.map((s, i) => ({ index: i + 1, text: s.text, done: toggled.includes(i) ? want : s.done, changed: toggled.includes(i) })),
        plan: { done, total: steps.length, nextStep: pendingAfter[0] ?? null },
        updated,
        notes: [...notes, ...stale.map(({ label }) => `«${label}» tiene texto propio: no se actualizó solo.`)],
      });
      return;
    }
    for (const note of notes) io.out(`Aviso: ${note}`);
    if (result.files.some((file) => file.written)) {
      for (const i of toggled) io.out(`Paso ${i + 1} ${want ? "marcado como hecho" : "desmarcado"}: «${steps[i].text}».`);
      if (steps.length) io.out(`Plan ${done}/${steps.length}${pendingAfter[0] ? ` — siguiente: ${pendingAfter[0]}` : " — completo"} (${relFile(ws, handoff.path)}).`);
      if (updated.length) io.out(`Actualizado: ${updated.join(", ")}.`);
    }
    for (const { label, flag } of stale) io.out(`Aviso: «${label}» tiene un texto propio y no lo toqué; si ya no vale, actualízalo con ${flag} (Regla 6).`);
  },
};
