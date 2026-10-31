// Lo que comparten los comandos que arman y desarman grupos de `backlog.md`: sacar una tarea de su
// grupo (`ejectTask`) y sumarle tareas libres (`addTasks`). Un grupo vive en dos lugares a la vez:
// la referencia `### Grupo — título (Tareas 14, 15)` + `- **Resumen:** ...` en «Tareas libres» y el
// contenedor `### Grupo — título` con sus `#### Tarea N` en «Tareas agrupadas». Las funciones son
// puras: devuelven las ediciones calculadas sobre el texto original (una sola vez, sin solaparse)
// y no leen ni escriben nada. Un grupo necesita al menos `MIN_GROUP_TASKS` tareas: si queda con menos,
// se desarma y sus tareas vuelven a «Tareas libres».

import { commentSpans } from "../../../_shared/parse/markdown.ts";
import type { Group, ParsedBacklog, Task } from "../../../_shared/types.ts";
import { CliError } from "../cli/errors.ts";
import { type Edit, insertAt, replaceRange } from "../edit/edits.ts";
import { blockSeparator, removeBlock } from "../edit/layout.ts";
import { lineAt, trimRange } from "../query/lines.ts";
import type { Doc } from "../workspace/docs.ts";
import { type Block, removeBlocks } from "./blocking.ts";
import type { Strings } from "./language.ts";
import { insertIntoFree } from "./unblocking.ts";

/** Tareas mínimas de un grupo: con menos de estas, el grupo se desarma. */
export const MIN_GROUP_TASKS = 2;

// La lista de números va entre paréntesis al final del header de la referencia: `(Tareas 14, 15)`.
const REFERENCE_LIST_RE = /\(([^)]*\d[^)]*)\)\s*$/;

/** Un grupo con sus dos mitades: el contenedor (sus tareas `####`) y su referencia en «Tareas libres». */
export interface GroupAt {
  /** Contenedor de «Tareas agrupadas»; sus `tasks` están en orden de aparición. */
  container: Group;
  /** Referencia de «Tareas libres» (`Resumen` y lista de números). */
  reference: Group;
}

/**
 * El grupo que contiene la tarea `number` (cualquiera de las suyas), o `null` si la tarea no está
 * agrupada. La referencia se busca por el número y, si la lista no lo trae, por el título del grupo.
 * @throws CliError el grupo no tiene referencia en «Tareas libres»
 */
export function findGroupOf(backlog: Doc<ParsedBacklog>, number: number): GroupAt | null {
  const { free, grouped } = backlog.parsed;
  const container = grouped.find((group) => group.tasks.some((task) => task.number === number));
  if (!container) return null;
  const reference = free.groups.find((group) => group.taskNumbers.includes(number)) ?? free.groups.find((group) => group.title === container.title);
  if (!reference) {
    throw new CliError(`El grupo «${container.title}» (con la Tarea ${number}) no tiene su referencia en «Tareas libres»: arréglalo a mano. No se escribió nada.`);
  }
  return { container, reference };
}

/**
 * Las tareas libres `numbers`, en ese orden, listas para agruparlas.
 * @throws CliError no hay números, uno se repite, o alguno no es una tarea de «Tareas libres» (el mensaje dice dónde está)
 */
export function pickFreeTasks(backlog: Doc<ParsedBacklog>, numbers: number[]): Task[] {
  if (!numbers.length) throw new CliError("Indica al menos una tarea libre. No se escribió nada.");
  const repeated = numbers.find((number, i) => numbers.indexOf(number) !== i);
  if (repeated !== undefined) throw new CliError(`La Tarea ${repeated} está repetida en la lista. No se escribió nada.`);

  const { free, blocked, grouped } = backlog.parsed;
  return numbers.map((number) => {
    const task = free.tasks.find((candidate) => candidate.number === number);
    if (task) return task;
    const group = grouped.find((candidate) => candidate.tasks.some((member) => member.number === number));
    const where = group
      ? `ya está en el grupo «${group.title}»`
      : blocked.some((candidate) => candidate.number === number)
        ? "está en «Tareas bloqueadas / pospuestas»"
        : "no figura en «Tareas libres» (¿en curso, pausada, cerrada o inexistente?)";
    throw new CliError(`La Tarea ${number} ${where}: solo se agrupan tareas libres. No se escribió nada.`);
  });
}

/** El texto de un bloque (tarea o grupo) sin las líneas en blanco de los extremos. */
export function blockText(text: string, block: Block): string {
  const range = trimRange(text, block.range!);
  return text.slice(range.start, range.end);
}

/** El bloque de una tarea libre (`### Tarea N`) como tarea de un grupo (`#### Tarea N`): solo cambia el nivel del header. */
export function asGrouped(block: string): string {
  return block.replace(/^###(?!#)/, "####");
}

/** El bloque de una tarea agrupada (`#### Tarea N`) como tarea libre (`### Tarea N`): solo cambia el nivel del header. */
export function asFree(block: string): string {
  return block.replace(/^####(?!#)/, "###");
}

/**
 * Los contenedores `###` de «Tareas agrupadas», todos: también los que se quedaron sin tareas, que
 * `parseBacklog` descarta de `parsed.grouped`. Cada rango va sin líneas en blanco de los extremos.
 * @throws CliError falta la sección «Tareas agrupadas»
 */
export function groupedContainers(backlog: Doc<ParsedBacklog>): Block[] {
  const section = backlog.parsed.sections.grouped;
  if (!section) throw new CliError("backlog.md no tiene la sección «Tareas agrupadas» (ancla `grouped`). No se escribió nada.");
  const { text } = backlog;
  const { start, end } = section.bodyRange;
  const body = text.slice(start, end);
  const comments = commentSpans(body);
  const starts = [...body.matchAll(/^###(?!#)\s+/gm)]
    .map((match) => match.index ?? 0)
    .filter((at) => !comments.some(([from, to]) => at >= from && at < to))
    .map((at) => start + at);
  return starts.map((from, i): Block => {
    const to = starts[i + 1] ?? end;
    return { range: trimRange(text, { startLine: lineAt(text, from), endLine: lineAt(text, to - 1), start: from, end: to }) };
  });
}

/**
 * Edición que reescribe la lista de números de la referencia (`(Tareas 14, 15)`), con la palabra que
 * ya usa (`Tareas`, `Tasks`) y sin tocar el resto del header.
 * @throws CliError el header no termina en una lista entre paréntesis
 */
export function referenceEdit(text: string, reference: Group, numbers: number[]): Edit {
  const start = reference.range!.start;
  const newline = text.indexOf("\n", start);
  const header = text.slice(start, newline === -1 ? text.length : newline);
  const list = header.match(REFERENCE_LIST_RE);
  if (!list || list.index === undefined) {
    throw new CliError(`No reconozco la lista de tareas del header de «${reference.title}» (${header.trim().slice(0, 80)}): cámbiala a mano. No se escribió nada.`);
  }
  const from = start + list.index + 1;
  return replaceRange({ start: from, end: from + list[1].length }, list[1].match(/^\D*/)![0] + numbers.join(", "));
}

/**
 * Ediciones que reemplazan la referencia de «Tareas libres» por `blocks` (ya renderizados) al final
 * de la sección. Si la referencia es el último bloque, `blocks` ocupan su lugar (quitarla y agregar
 * al final tocarían el mismo rango); si no, se quita sin dejar huecos y se agrega al final.
 */
function replaceReference(backlog: Doc<ParsedBacklog>, reference: Group, blocks: string[], S: Strings): Edit[] {
  const { text } = backlog;
  const { free } = backlog.parsed;
  const freeBlocks = [...free.tasks, ...free.groups];
  const last = freeBlocks.reduce((a, b) => (b.range!.start > a.range!.start ? b : a));
  if (last !== reference) return [...removeBlocks(text, freeBlocks, [reference], S.emptySection), insertIntoFree(backlog, blocks)];
  const separator = blockSeparator(text, freeBlocks.map((block) => block.range!));
  return [replaceRange(trimRange(text, reference.range!), blocks.join(separator))];
}

/**
 * Saca la tarea agrupada `number` de su grupo: su bloque pasa de `#### Tarea N` a `### Tarea N` (mismo
 * contenido) al final de «Tareas libres» y su número sale de la lista de la referencia. Si el grupo
 * queda con menos de `MIN_GROUP_TASKS` tareas se desarma: la que quedaba pasa también a libres (tras la
 * sacada) y se eliminan la referencia y el contenedor. Si «Tareas agrupadas» queda sin grupos, vuelve a
 * su texto de vacío.
 * @throws CliError la tarea no está agrupada, o el grupo no se puede ubicar en alguna de las dos secciones
 */
export function ejectTask(backlog: Doc<ParsedBacklog>, number: number, S: Strings): Edit[] {
  const at = findGroupOf(backlog, number);
  if (!at) throw new CliError(`La Tarea ${number} no está en «Tareas agrupadas»: solo se sacan de su grupo las tareas agrupadas. No se escribió nada.`);
  if (!backlog.parsed.sections.free) throw new CliError("backlog.md no tiene la sección «Tareas libres» (ancla `free`). No se escribió nada.");
  const { container, reference } = at;
  const { text } = backlog;

  const task = container.tasks.find((candidate) => candidate.number === number)!;
  const rest = container.tasks.filter((candidate) => candidate !== task);
  if (rest.length >= MIN_GROUP_TASKS) {
    return [
      referenceEdit(text, reference, rest.map((candidate) => candidate.number)),
      insertIntoFree(backlog, [asFree(blockText(text, task))]),
      removeBlock(text, trimRange(text, task.range!), S.emptyGrouped, true),
    ];
  }

  const containers = groupedContainers(backlog);
  const own = containers.find((candidate) => candidate.range!.start === trimRange(text, container.range!).start);
  if (!own) throw new CliError(`No ubico el contenedor del grupo «${container.title}» en «Tareas agrupadas»: arréglalo a mano. No se escribió nada.`);
  const blocks = [task, ...rest].map((moved) => asFree(blockText(text, moved)));
  return [...replaceReference(backlog, reference, blocks, S), ...removeBlocks(text, containers, [own], S.emptyGrouped)];
}

/**
 * Suma tareas libres al grupo que contiene la tarea `groupNumber`: sus bloques pasan de `### Tarea N` a
 * `#### Tarea N` al final del contenedor (en el orden de `numbers`) y sus números se agregan a la
 * referencia, que queda con los del grupo en orden de aparición y luego los nuevos. No toca el `Resumen`.
 * @throws CliError `groupNumber` no está agrupada, o `numbers` no son tareas libres distintas (ver `pickFreeTasks`)
 */
export function addTasks(backlog: Doc<ParsedBacklog>, groupNumber: number, numbers: number[], S: Strings): Edit[] {
  const at = findGroupOf(backlog, groupNumber);
  if (!at) throw new CliError(`La Tarea ${groupNumber} no está en «Tareas agrupadas»: indica una tarea que ya pertenezca al grupo. No se escribió nada.`);
  const tasks = pickFreeTasks(backlog, numbers);
  const { container, reference } = at;
  const { text } = backlog;
  const { free } = backlog.parsed;

  const separator = blockSeparator(text, container.tasks.map((task) => task.range!));
  const blocks = tasks.map((task) => asGrouped(blockText(text, task)));
  const list = [...container.tasks.map((task) => task.number), ...numbers];
  return [
    ...removeBlocks(text, [...free.tasks, ...free.groups], tasks, S.emptySection),
    referenceEdit(text, reference, list),
    insertAt(trimRange(text, container.range!).end, separator + blocks.join(separator)),
  ];
}
