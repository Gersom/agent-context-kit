// Grupos de backlog.md. Un grupo vive en dos lugares a la vez: la referencia `### Grupo — título (Tareas N, M)`
// con su `- **Resumen:** ...` en «Tareas libres» y el contenedor `### Grupo — título` con sus `#### Tarea N` en
// «Tareas agrupadas». Aquí se empareja cada referencia con su contenedor y se avisa de lo que no cuadra: grupos de
// menos de dos tareas, mitades sin su pareja, números o títulos distintos, referencias sin resumen y headers con un
// comentario HTML que los comandos `group-*` no saben editar. Los números
// repetidos entre tareas los cubre `checkDuplicateNumbers`.

import { parseFields, TASK_HEADING_RE } from "../../../_shared/parse/blocks.ts";
import { commentSpans, stripComments } from "../../../_shared/parse/markdown.ts";
import type { ParsedBacklog } from "../../../_shared/types.ts";
import { normalizeTitle } from "../../../task-manager/src/query/find.ts";
import { lineAt } from "../../../task-manager/src/query/lines.ts";
import type { Check, DocInfo, Finding } from "../types.ts";

/** Tareas mínimas de un grupo (igual que `MIN_GROUP_TASKS` de task-manager, que no se importa porque arrastra los comandos). */
const MIN_GROUP_TASKS = 2;
// La etiqueta del resumen de una referencia, en español o inglés (las únicas lenguas que reconoce la suite).
const SUMMARY_LABEL_RE = /^(resumen|summary)$/i;

/** La referencia de un grupo en «Tareas libres». */
interface Reference {
  title: string;
  /** Números de su lista, sin repetir y en orden de aparición. */
  numbers: number[];
  line: number | null;
  hasSummary: boolean;
  /** Su header trae un comentario HTML. */
  hasComment: boolean;
}

/** El contenedor de un grupo en «Tareas agrupadas»; también los que se quedaron sin tareas. */
interface Container {
  title: string;
  /** Números de sus tareas `####`, sin repetir y en orden de aparición. */
  numbers: number[];
  line: number;
  /** Su header trae un comentario HTML. */
  hasComment: boolean;
}

/** Un header `###` de una sección, tal cual está en el texto (con sus comentarios). */
interface Header {
  raw: string;
  line: number;
}

const place = (file: string, line: number | null) => (line === null ? file : `${file}:${line}`);
const list = (numbers: number[]) => numbers.join(", ");
const unique = (numbers: number[]) => [...new Set(numbers)];

/** El título de un header `### Grupo — título` (sin la palabra ni comentarios HTML); el header entero si no tiene esa forma. */
function containerTitle(header: string): string {
  const line = stripComments(header).replace(/^###\s+/, "").trim();
  return line.match(/^\S+\s*[—–-]\s*(.+?)$/)?.[1] ?? line;
}

/** Los headers `###` de una sección que no son tareas ni están dentro de un comentario HTML. */
function headers(backlog: DocInfo<ParsedBacklog>, id: "free" | "grouped"): Header[] {
  const section = backlog.parsed.sections[id];
  if (!section) return [];
  const { text } = backlog;
  const { start, end } = section.bodyRange;
  const body = text.slice(start, end);
  const comments = commentSpans(body);
  const found: Header[] = [];
  for (const match of body.matchAll(/^###(?!#)\s+.*$/gm)) {
    const at = match.index ?? 0;
    if (comments.some(([from, to]) => at >= from && at < to) || TASK_HEADING_RE.test(match[0])) continue;
    found.push({ raw: match[0], line: lineAt(text, start + at) });
  }
  return found;
}

/** Las referencias de «Tareas libres». */
function references(backlog: DocInfo<ParsedBacklog>): Reference[] {
  const lines = backlog.text.split("\n");
  return backlog.parsed.free.groups.map((group) => ({
    title: group.title,
    numbers: unique(group.taskNumbers),
    line: group.range?.startLine ?? null,
    hasSummary: parseFields(group.body.split("\n")).some((field) => SUMMARY_LABEL_RE.test(field.label.trim()) && field.value !== ""),
    hasComment: group.range ? (lines[group.range.startLine - 1] ?? "").includes("<!--") : false,
  }));
}

/**
 * Los headers de grupo de «Tareas libres» que no traen la lista `(Tareas N, M)`: `parseBacklog` no los cuenta como
 * referencias, así que sus contenedores parecen no tener referencia.
 */
function listlessHeaders(backlog: DocInfo<ParsedBacklog>): { title: string; line: number }[] {
  return headers(backlog, "free")
    .filter((header) => !/\([^)]*\d[^)]*\)$/.test(stripComments(header.raw).trim()))
    .map((header) => ({ title: containerTitle(header.raw), line: header.line }));
}

/**
 * Los contenedores `###` de «Tareas agrupadas», todos: `parseBacklog` descarta de `parsed.grouped` los que no tienen
 * tareas, así que se buscan los headers en el texto y se les asignan las tareas del grupo parseado que empieza en
 * esa línea.
 */
function containers(backlog: DocInfo<ParsedBacklog>): Container[] {
  return headers(backlog, "grouped").map(({ raw, line }) => {
    const parsed = backlog.parsed.grouped.find((group) => group.range?.startLine === line);
    return { title: containerTitle(raw), numbers: unique(parsed?.tasks.map((task) => task.number) ?? []), line, hasComment: raw.includes("<!--") };
  });
}

/**
 * Empareja cada referencia con su contenedor: primero por título (sin distinguir mayúsculas ni acentos) y, las que
 * queden, por las tareas que comparten. Lo que no se empareja queda suelto.
 */
function pair(refs: Reference[], conts: Container[]): { pairs: [Reference, Container][]; loneRefs: Reference[]; loneConts: Container[] } {
  const pairs: [Reference, Container][] = [];
  const loneConts = [...conts];
  const unpaired: Reference[] = [];
  for (const ref of refs) {
    const index = loneConts.findIndex((cont) => normalizeTitle(cont.title) === normalizeTitle(ref.title));
    if (index === -1) unpaired.push(ref);
    else pairs.push([ref, loneConts.splice(index, 1)[0]]);
  }
  const loneRefs: Reference[] = [];
  for (const ref of unpaired) {
    const shared = (cont: Container) => cont.numbers.filter((number) => ref.numbers.includes(number)).length;
    const best = loneConts.reduce((top, cont) => (shared(cont) > shared(top) ? cont : top), loneConts[0]);
    if (best && shared(best) > 0) pairs.push([ref, loneConts.splice(loneConts.indexOf(best), 1)[0]]);
    else loneRefs.push(ref);
  }
  return { pairs, loneRefs, loneConts };
}

/** «tiene una sola tarea (la N)» o «no tiene ninguna tarea», con el verbo que toque («tiene», «lista»). */
const sizeOf = (numbers: number[], verb: string) => (numbers.length ? `${verb} una sola tarea (la ${numbers[0]})` : `no ${verb} ninguna tarea`);

/** Grupos de menos de dos tareas, referencias y contenedores sin pareja, números o títulos que no coinciden, referencias sin resumen y headers con comentario HTML. */
export const checkGroups: Check = ({ docs }) => {
  const { backlog } = docs;
  if (!backlog.exists) return [];
  const findings: Finding[] = [];
  const add = (severity: Finding["severity"], code: string, line: number | null, message: string) =>
    findings.push({ severity, code, file: backlog.file, line, message });
  const refs = references(backlog);
  const conts = containers(backlog);
  const { pairs, loneRefs, loneConts } = pair(refs, conts);
  const where = (ref: Reference, cont: Container) => `referencia en ${place(backlog.file, ref.line)}, contenedor en ${place(backlog.file, cont.line)}`;

  for (const [ref, cont] of pairs) {
    // El contenedor es el que tiene las tareas: si él cumple, una lista corta en la referencia es un desajuste de números.
    if (cont.numbers.length < MIN_GROUP_TASKS) {
      const fix = cont.numbers.length
        ? `Desármalo con \`acsuite task group-eject ${cont.numbers[0]}\` (la tarea vuelve a «Tareas libres») o a mano.`
        : "Bórralo a mano, con su referencia.";
      add("error", "group-too-small", cont.line, `El grupo «${cont.title}» ${sizeOf(cont.numbers, "tiene")} (${where(ref, cont)}) y un grupo necesita al menos ${MIN_GROUP_TASKS}: se desarma. ${fix}`);
    }

    const missingInContainer = ref.numbers.filter((number) => !cont.numbers.includes(number));
    const missingInReference = cont.numbers.filter((number) => !ref.numbers.includes(number));
    if (missingInContainer.length || missingInReference.length) {
      const parts: string[] = [];
      if (missingInContainer.length) {
        const fix = cont.numbers.length
          ? `Si están libres, \`acsuite task group-add ${cont.numbers[0]} ${list(missingInContainer)}\` las suma al grupo; si no, quítalas de la lista a mano.`
          : "Quítalas de la lista a mano.";
        parts.push(`La referencia lista ${list(missingInContainer)}, que no está${missingInContainer.length > 1 ? "n" : ""} en el contenedor. ${fix}`);
      }
      if (missingInReference.length) {
        const eject = ref.title === cont.title ? ` o sácalas del grupo con \`acsuite task group-eject ${missingInReference[0]}\`` : "";
        parts.push(`El contenedor tiene ${list(missingInReference)}, que no figura${missingInReference.length > 1 ? "n" : ""} en la referencia: agrégalas a su lista a mano${eject}.`);
      }
      const contSays = cont.numbers.length ? `tiene (${list(cont.numbers)})` : "no tiene tareas";
      add("error", "group-numbers-mismatch", ref.line, `Los números del grupo «${ref.title}» no coinciden (${where(ref, cont)}): la referencia dice (${list(ref.numbers)}) y el contenedor ${contSays}. ${parts.join(" ")}`);
    }

    if (ref.title !== cont.title) {
      const fix = cont.numbers.length
        ? `\`acsuite task group-edit ${cont.numbers[0]} --title "…"\` reescribe los dos`
        : "iguala los dos a mano";
      add("error", "group-title-mismatch", ref.line, `El título de la referencia («${ref.title}») no es el del contenedor («${cont.title}») (${where(ref, cont)}): el título identifica al grupo y debe ser el mismo en los dos lugares; ${fix}.`);
    }

    if (!ref.hasSummary) {
      const fix = cont.numbers.length ? `\`acsuite task group-edit ${cont.numbers[0]} --summary "…"\` la escribe` : "agrégala a mano";
      add("warning", "group-no-summary", ref.line, `La referencia del grupo «${ref.title}» no tiene línea \`- **Resumen:** frase\` con el objetivo compartido: ${fix}.`);
    }
  }

  for (const ref of loneRefs) {
    // Con una sola tarea no hay grupo que restaurar ni formar: un único hallazgo, sin `group-create` (que exige dos).
    if (ref.numbers.length < MIN_GROUP_TASKS) {
      const only = ref.numbers.length ? `la Tarea ${ref.numbers[0]} en «Tareas libres» como \`### Tarea ${ref.numbers[0]}\`` : "sus tareas en «Tareas libres»";
      add("error", "group-too-small", ref.line, `La referencia del grupo «${ref.title}» ${sizeOf(ref.numbers, "lista")}, no tiene contenedor en «Tareas agrupadas» y un grupo necesita al menos ${MIN_GROUP_TASKS}: se desarma. Borra la referencia a mano y deja ${only} con su detalle (agrégala si no está), o suma otra tarea al grupo.`);
      continue;
    }
    add(
      "error",
      "group-missing-container",
      ref.line,
      `La referencia del grupo «${ref.title}» (Tareas ${list(ref.numbers)}) no tiene contenedor en «Tareas agrupadas», ni con ese título ni con alguna de sus tareas: el detalle de las tareas no está donde lo busca \`acsuite task\`. Borra la referencia y, si las tareas existen libres, vuelve a formar el grupo con \`acsuite task group-create\`; si no, restaura el contenedor a mano.`,
    );
    if (!ref.hasSummary) {
      add("warning", "group-no-summary", ref.line, `La referencia del grupo «${ref.title}» no tiene línea \`- **Resumen:** frase\` con el objetivo compartido: agrégala a mano.`);
    }
  }

  const listless = listlessHeaders(backlog);
  for (const cont of loneConts) {
    const tasks = cont.numbers.length ? `tareas ${list(cont.numbers)}` : "sin tareas";
    const header = listless.find((candidate) => normalizeTitle(candidate.title) === normalizeTitle(cont.title));
    let message: string;
    if (header) {
      message = cont.numbers.length
        ? `El header del grupo «${cont.title}» en «Tareas libres» (${place(backlog.file, header.line)}) no trae la lista \`(Tareas N, M)\` y por eso no cuenta como referencia del contenedor (${tasks}): los comandos \`acsuite task group-*\` no ubican el grupo. Agrégasela a ese mismo header a mano, sin crear otro: \`### Grupo — ${cont.title} (Tareas ${list(cont.numbers)})\`.`
        : `El contenedor del grupo «${cont.title}» (${tasks}) está vacío y su header en «Tareas libres» (${place(backlog.file, header.line)}) no trae la lista \`(Tareas N, M)\`: bórralos a mano.`;
    } else {
      message = `El contenedor del grupo «${cont.title}» (${tasks}) no tiene referencia en «Tareas libres», ni con ese título ni con alguna de sus tareas: sin ella los comandos \`acsuite task group-*\` no ubican el grupo. ${cont.numbers.length ? `Agrega a mano \`### Grupo — ${cont.title} (Tareas ${list(cont.numbers)})\` con su \`- **Resumen:** frase\`, o devuelve las tareas a libres (\`###\` en vez de \`####\`) y borra el contenedor.` : "Está vacío: bórralo."}`;
    }
    add("error", "group-missing-reference", cont.line, message);
    if (cont.numbers.length < MIN_GROUP_TASKS) {
      add("error", "group-too-small", cont.line, `El contenedor del grupo «${cont.title}» ${sizeOf(cont.numbers, "tiene")} y un grupo necesita al menos ${MIN_GROUP_TASKS}: se desarma; resuélvelo a mano.`);
    }
  }

  // Los comandos `group-*` se niegan a reescribir un header con comentario HTML (`retitleEdit` de task-manager).
  const commented = (kind: string, title: string, line: number | null) =>
    add("warning", "group-header-comment", line, `El header de ${kind} del grupo «${title}» tiene un comentario HTML: los comandos \`acsuite task group-*\` no pueden editar ese header; quita el comentario a mano.`);
  for (const ref of refs) if (ref.hasComment) commented("la referencia", ref.title, ref.line);
  for (const cont of conts) if (cont.hasComment) commented("el contenedor", cont.title, cont.line);
  return findings;
};
