// De dónde copia el script las palabras al escribir: los headers y las etiquetas de campo de las
// tareas que el archivo ya tiene, para que la tarea nueva se vea igual que sus vecinas.

import type { Field, Task } from "../../../_shared/types.ts";
import type { Docs } from "../workspace/docs.ts";
import { findFieldOfKind, type FieldKind, type Strings } from "./language.ts";

/** Todas las tareas de backlog.md con detalle: libres, bloqueadas y agrupadas, en el orden del archivo. */
export function backlogTasks(docs: Docs): Task[] {
  const { free, blocked, grouped } = docs.backlog.parsed;
  return [...free.tasks, ...blocked, ...grouped.flatMap((group) => group.tasks)];
}

/**
 * Las palabras de header de tarea (`Tarea`, `Task`...) que usan los archivos del operador, de las
 * más cercanas a las más lejanas: backlog, pausadas, tarea en curso e history.
 */
export function headerLabels(docs: Docs): string[] {
  const { handoff, history } = docs;
  return [
    ...backlogTasks(docs).map((task) => task.label),
    ...handoff.parsed.paused.map((task) => task.label),
    ...(handoff.parsed.inProgress.task ? [handoff.parsed.inProgress.task.label] : []),
    ...history.parsed.entries.flatMap((entry) => (entry.label ? [entry.label] : [])),
  ];
}

/** Función que da la etiqueta de un tipo de campo: la de la primera tarea que lo tenga, o la de la tabla del idioma. */
export function labelResolver(fieldLists: Field[][], strings: Strings): (kind: FieldKind) => string {
  return (kind) => {
    for (const fields of fieldLists) {
      const found = findFieldOfKind(fields, kind);
      if (found) return found.label;
    }
    return strings.fields[kind];
  };
}
