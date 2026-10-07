// «Próximo número de tarea»: el número que recibe una tarea nueva y su actualización a N+1 en la
// misma edición. Los números son correlativos, fijos y nunca se reutilizan (Numeración en
// backlog.md), así que antes de usar el contador se comprueba que sea coherente con lo que ya
// existe; si no lo es, se explica y no se elige un número por cuenta propia.

import { type Edit, replaceRange } from "../edit/edits.ts";
import { CliError } from "../cli/errors.ts";
import { findNextTaskNumber } from "../query/next-number.ts";
import { knownNumbers } from "../query/state.ts";
import { type Docs, requireDoc } from "../workspace/docs.ts";

export interface ReservedNumber {
  /** El número que recibe la tarea nueva. */
  number: number;
  /** Edición de `backlog.md` que deja el contador en `number + 1`. */
  edit: Edit;
}

export interface ReservedNumbers {
  /** Los números que reciben las tareas nuevas, correlativos y en orden. */
  numbers: number[];
  /** Edición de `backlog.md` que deja el contador en el último número + 1. */
  edit: Edit;
}

/**
 * Reserva `count` números seguidos desde «Próximo número de tarea».
 * @throws CliError backlog.md ausente o sin la línea del contador, o contador que no es mayor que la
 *   tarea más alta conocida en handoff, backlog (con grupos) e history (se repetiría un número)
 */
export function reserveNextNumbers(docs: Docs, count: number): ReservedNumbers {
  const backlog = requireDoc(docs.backlog, "backlog.md");
  const next = findNextTaskNumber(backlog.text);
  if (!next) {
    throw new CliError(
      "backlog.md no tiene la línea «Próximo número de tarea» (un campo en negrita con solo un número, antes de la primera sección): agrégala a mano antes de numerar tareas. No se escribió nada.",
    );
  }
  const numbers = knownNumbers(docs);
  const highest = numbers[numbers.length - 1];
  if (highest !== undefined && next.value <= highest) {
    throw new CliError(
      `«Próximo número de tarea» (${next.value}, línea ${next.line} de backlog.md) no es mayor que la tarea más alta que ya existe (la ${highest}), así que repetiría un número. Corrígelo a mano (al menos ${highest + 1}) y vuelve a intentarlo: no elijo un número por mi cuenta. No se escribió nada.`,
    );
  }
  return {
    numbers: Array.from({ length: count }, (_, i) => next.value + i),
    edit: replaceRange({ start: next.start, end: next.end }, String(next.value + count)),
  };
}

/** Reserva el número de «Próximo número de tarea» (ver `reserveNextNumbers`). */
export function reserveNextNumber(docs: Docs): ReservedNumber {
  const { numbers, edit } = reserveNextNumbers(docs, 1);
  return { number: numbers[0], edit };
}
