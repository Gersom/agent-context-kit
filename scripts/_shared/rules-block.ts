// El bloque de la suite en rules.md: la sección delimitada que enseña al agente a usar las
// herramientas (`acsuite init` la escribe y `acsuite check` avisa si falta). Código puro, sin E/S:
// recibe el texto de rules.md en LF y devuelve el texto nuevo. Las reglas fijas de rules.md no se tocan;
// el bloque va al final de «Reglas específicas de este proyecto», justo antes de «Al cerrar una tarea».

import { commentStateAfter } from "./parse/markdown.ts";
import { FENCE_RE, H2_RE } from "./parse/sections.ts";

export const SUITE_BLOCK_START = "<!-- agent-context-suite:start -->";
export const SUITE_BLOCK_END = "<!-- agent-context-suite:end -->";

/** El bloque completo, con sus marcas (sin salto de línea final). */
export const SUITE_BLOCK = `${SUITE_BLOCK_START}
### Herramientas de la suite

Este proyecto usa [agent-context-suite](https://github.com/Gersom/agent-context-suite). Aplica la cláusula «Con una herramienta de tareas» de «Al cerrar una tarea»: no edites a mano \`handoff.md\`, \`backlog.md\` ni \`history.md\`; usa \`acsuite task\` (el detalle: \`acsuite task --help\`). Para verificar la documentación, \`acsuite check\`; para ver el tablero, \`acsuite board\`.
${SUITE_BLOCK_END}`;

/** Encabezado de la sección donde va el bloque (se crea si falta). */
export const SPECIFIC_HEADING = "Reglas específicas de este proyecto";

/** Encabezado de la sección fija ante la cual se inserta el bloque (se busca por su comienzo). */
export const CLOSING_HEADING = "Al cerrar una tarea";

export type RulesBlockAction = "inserted" | "updated" | "unchanged";

/** El bloque no se puede escribir sin adivinar (marcas incompletas, repetidas o invertidas; falta «Al cerrar una tarea»). El mensaje es para el operador. */
export class RulesBlockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RulesBlockError";
  }
}

interface Scan {
  lines: string[];
  /** Líneas (0-based) de las marcas de inicio y de cierre. */
  starts: number[];
  ends: number[];
  /** Encabezados `## ` con su línea (0-based). */
  headings: { line: number; title: string }[];
}

/** Recorre el texto ignorando bloques de código y comentarios HTML (lo que contienen no cuenta). */
function scan(text: string): Scan {
  const lines = text.split("\n");
  const result: Scan = { lines, starts: [], ends: [], headings: [] };
  let inComment = false;
  let inFence = false;
  lines.forEach((line, i) => {
    const startsInComment = inComment;
    inComment = commentStateAfter(line, inComment);
    if (startsInComment) return;
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const trimmed = line.trim();
    if (trimmed === SUITE_BLOCK_START) result.starts.push(i);
    else if (trimmed === SUITE_BLOCK_END) result.ends.push(i);
    else {
      const h2 = line.match(H2_RE);
      if (h2) result.headings.push({ line: i, title: h2[1] });
    }
  });
  return result;
}

/** `true` si el texto tiene el bloque: la marca de inicio y, después, la de cierre. No mira el contenido. */
export function hasSuiteBlock(text: string): boolean {
  const { starts, ends } = scan(text);
  return starts.length > 0 && ends.some((end) => end > starts[0]);
}

/** Mensaje del problema con las marcas, o `null` si hay exactamente una de cada una y en orden. */
function marksProblem({ starts, ends }: Scan): string | null {
  const both = `${SUITE_BLOCK_START} y ${SUITE_BLOCK_END}`;
  if (starts.length === 1 && ends.length === 1) {
    return starts[0] < ends[0] ? null : `La marca de cierre ${SUITE_BLOCK_END} está antes que la de inicio ${SUITE_BLOCK_START}.`;
  }
  if (starts.length === 1 && ends.length === 0) return `Falta la marca de cierre ${SUITE_BLOCK_END} (la de inicio está en la línea ${starts[0] + 1}).`;
  if (starts.length === 0 && ends.length === 1) return `Falta la marca de inicio ${SUITE_BLOCK_START} (la de cierre está en la línea ${ends[0] + 1}).`;
  return `Hay ${starts.length} marca(s) de inicio y ${ends.length} de cierre; tiene que haber una sola de cada una (${both}).`;
}

/**
 * Deja el bloque de la suite en `text`: lo reemplaza si ya está y difiere, o lo inserta al final de
 * «Reglas específicas de este proyecto» (antes de «Al cerrar una tarea»; si esa sección no existe,
 * la crea). No escribe nada: devuelve el texto nuevo y qué hizo.
 * @param text contenido de rules.md con saltos de línea LF
 * @throws RulesBlockError marcas incompletas, repetidas o invertidas, o sin «Al cerrar una tarea» donde insertar
 */
export function upsertSuiteBlock(text: string): { text: string; action: RulesBlockAction } {
  const found = scan(text);
  const { lines, starts, ends, headings } = found;

  if (starts.length || ends.length) {
    const problem = marksProblem(found);
    if (problem) {
      throw new RulesBlockError(`${problem} No sé qué parte de rules.md es el bloque: arréglalo a mano (deja una sola marca de cada tipo, o bórralas) y vuelve a intentarlo.`);
    }
    const current = lines.slice(starts[0], ends[0] + 1).join("\n");
    if (current === SUITE_BLOCK) return { text, action: "unchanged" };
    const next = [...lines.slice(0, starts[0]), ...SUITE_BLOCK.split("\n"), ...lines.slice(ends[0] + 1)];
    return { text: next.join("\n"), action: "updated" };
  }

  const closing = headings.find((h) => h.title.startsWith(CLOSING_HEADING));
  if (!closing) {
    throw new RulesBlockError(
      `No encuentro la sección «${CLOSING_HEADING}» en rules.md, así que no sé dónde insertar el bloque. Restaura la sección o agrega el bloque a mano.`,
    );
  }
  const hasSpecific = headings.some((h) => h.line < closing.line && h.title.startsWith(SPECIFIC_HEADING));
  const head = lines.slice(0, closing.line);
  const insert = hasSpecific ? SUITE_BLOCK.split("\n") : [`## ${SPECIFIC_HEADING}`, "", ...SUITE_BLOCK.split("\n")];
  const next = [...head, ...(head.length && head[head.length - 1].trim() !== "" ? [""] : []), ...insert, "", ...lines.slice(closing.line)];
  return { text: next.join("\n"), action: "inserted" };
}
