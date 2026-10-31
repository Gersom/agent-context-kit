// `group-add <N> <M>...`: suma tareas libres de tu `backlog.md` a un grupo ya formado. `N` es cualquier
// tarea del grupo (identifica al grupo); las `M` pasan de `### Tarea M` en «Tareas libres» a `#### Tarea M`
// al final del contenedor del grupo en «Tareas agrupadas», y sus números se suman a la lista de su
// referencia; el `Resumen` no se toca. Sin `--apply` solo muestra el diff.

import { CliError, UsageError } from "../cli/errors.ts";
import type { Command } from "../cli/types.ts";
import { findSinglePlace, parseTarget } from "../query/find.ts";
import { requireDoc } from "../workspace/docs.ts";
import { requireOwnFolder } from "../workspace/ownership.ts";
import { addTasks, findGroupOf, NOT_GROUPED } from "../write/group.ts";
import { emitWriteJson, JSON_FLAG } from "../write/json.ts";
import { STRINGS } from "../write/language.ts";
import { WHERE } from "./block.ts";

const USAGE = "`group-add <N> <M>...`";

/** Un número de tarea de tu propia carpeta (`14`, `T-14`). @throws UsageError si es un título; CliError si es de otro operador */
function parseNumber(arg: string): number {
  const target = parseTarget(arg);
  if (target.kind === "title") throw new UsageError(`«${arg}» no es un número de tarea: ${USAGE}.`);
  if (target.operator) throw new CliError(`group-add solo suma tareas de tu propia carpeta; «${arg}» es de otro operador (solo lectura). No se escribió nada.`);
  return target.number;
}

export const groupAdd: Command = {
  name: "group-add",
  summary: "Suma tareas libres a un grupo ya formado (pasan a «Tareas agrupadas» y entran en su referencia); escribe con --apply",
  usage: "group-add <N> <M>... [--json] [--apply]",
  writes: true,
  flags: { json: JSON_FLAG },
  run(ctx) {
    const { flags, io } = ctx;
    if (!ctx.args.length || !ctx.args[0].trim()) throw new UsageError(`Indica una tarea del grupo y las tareas libres que le sumas: ${USAGE}.`);
    if (ctx.args.length < 2) throw new UsageError(`Indica al menos una tarea libre para sumar al grupo de la Tarea ${ctx.args[0].trim()}: ${USAGE}.`);
    const [groupNumber, ...numbers] = ctx.args.map(parseNumber);
    const repeated = [groupNumber, ...numbers].find((number, i, all) => all.indexOf(number) !== i);
    if (repeated !== undefined) throw new CliError(`La Tarea ${repeated} está repetida en la lista. No se escribió nada.`);

    const ws = ctx.workspace();
    requireOwnFolder(ws);
    const docs = ctx.docs();
    const backlog = requireDoc(docs.backlog, "backlog.md");

    // Cada número vive en un solo lugar; si no, el mensaje dice cuál es antes de que `addTasks` valide el resto.
    const groupPlace = findSinglePlace(docs, groupNumber);
    if (groupPlace !== "grouped") {
      throw new CliError(`La Tarea ${groupNumber} ${NOT_GROUPED[groupPlace]}: indica una tarea que ya pertenezca al grupo. No se escribió nada.`);
    }
    for (const number of numbers) {
      const place = findSinglePlace(docs, number);
      // Libre pasa; agrupada y bloqueada las describe `addTasks`. Las demás se dicen aquí con palabras.
      if (place === "in-progress" || place === "paused" || place === "history") {
        throw new CliError(`La Tarea ${number} ${WHERE[place]}: solo se suman al grupo tareas libres. No se escribió nada.`);
      }
    }

    const { container } = findGroupOf(backlog, groupNumber)!;
    const tasks = [...container.tasks.map((task) => task.number), ...numbers];

    // Sumar no escribe etiquetas, así que no hay idioma que detectar ni avisar.
    const edits = addTasks(backlog, groupNumber, numbers, STRINGS.es);
    const result = ctx.commit([{ doc: backlog, edits }], { quiet: flags.json === true });

    if (flags.json === true) {
      emitWriteJson(ctx, "group-add", result, { group: { title: container.title, tasks }, added: numbers });
      return;
    }
    if (result.files.some((file) => file.written)) {
      const added = numbers.length === 1 ? `Tarea ${numbers[0]} sumada` : `Tareas ${numbers.join(", ")} sumadas`;
      io.out(`${added} al grupo «${container.title}»: ahora tiene ${tasks.length} tareas (${tasks.join(", ")}).`);
    }
  },
};
