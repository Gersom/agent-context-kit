// Posiciones (línea y offset de caracteres) para que un editor pueda reemplazar rangos exactos
// del texto ORIGINAL de un archivo (ver `Range` en ../types.ts).
//
// Los parsers trabajan sobre cuerpos de sección ya recortados y sin comentarios HTML, así que sus
// offsets no sirven tal cual: `BodyPos` guarda cómo se quitaron los comentarios y traduce los
// offsets del texto sin comentarios al original. `LineIndex` convierte offsets en números de línea.
// Con CRLF, `normalizeEol` lleva el texto a LF (lo que esperan los parsers) y traduce los offsets
// de vuelta al texto crudo, para reemplazar sin alterar los finales de línea. Funciones y clases
// puras, sin leer archivos.

import type { Range } from "../types.ts";
import { commentSpans } from "./markdown.ts";

/** Índice de líneas de un texto LF: de offsets a números de línea (1-based) y al revés. */
export class LineIndex {
  readonly text: string;
  /** Offset en que empieza cada línea (índice 0-based). */
  private readonly starts: number[] = [0];

  constructor(text: string) {
    this.text = text;
    for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) this.starts.push(i + 1);
  }

  /** Línea (1-based) que contiene el offset; un offset al final del texto cae en su última línea. */
  lineOf(offset: number): number {
    let lo = 0;
    let hi = this.starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  }

  /** Offset en que empieza la línea (1-based); pasada la última línea, el fin del texto. */
  lineStart(line: number): number {
    return line > this.starts.length ? this.text.length : this.starts[line - 1];
  }

  /** Rango `[start, end)` con sus líneas; `endLine` es `startLine - 1` si está vacío. */
  range(start: number, end: number): Range {
    const startLine = this.lineOf(start);
    return { startLine, endLine: end > start ? this.lineOf(end - 1) : startLine - 1, start, end };
  }
}

/** Tramo del texto sin comentarios que sale tal cual del original (misma longitud en ambos). */
interface Segment {
  /** Offset en el texto sin comentarios. */
  s: number;
  /** Offset en el texto original. */
  o: number;
  len: number;
}

/**
 * Un cuerpo de sección sin comentarios HTML (igual que `stripComments`) con la forma de traducir
 * sus offsets y líneas al texto original del archivo.
 */
export class BodyPos {
  /** El cuerpo sin comentarios: lo que reciben los parsers. */
  readonly text: string;
  /** `text` dividido por `\n`, como lo recorren los parsers. */
  readonly lines: string[];
  readonly index: LineIndex;
  private readonly segs: Segment[] = [];
  /** Offset (en `text`) en que empieza cada línea de `lines`. */
  private readonly offs: number[] = [];
  private readonly limit: number;

  /**
   * @param raw cuerpo tal como está en el original (con comentarios)
   * @param base offset del original en que empieza `raw`
   * @param index índice de líneas del texto original completo
   * @param limit offset del original donde termina el cuerpo para los rangos de bloque (por
   *   defecto, el fin de `raw`); permite dejar fuera, por ejemplo, el ancla de la sección siguiente
   */
  constructor(raw: string, base: number, index: LineIndex, limit: number = base + raw.length) {
    this.index = index;
    this.limit = limit;
    let text = "";
    let at = 0;
    const take = (to: number) => {
      if (to <= at) return;
      this.segs.push({ s: text.length, o: base + at, len: to - at });
      text += raw.slice(at, to);
    };
    for (const [from, to] of commentSpans(raw)) {
      take(from);
      at = to;
    }
    take(raw.length);
    this.text = text;
    this.lines = text.split("\n");
    let offset = 0;
    for (const line of this.lines) {
      this.offs.push(offset);
      offset += line.length + 1;
    }
  }

  /**
   * Offset original del carácter que está en `o` del texto sin comentarios. En un límite entre
   * tramos, el que sigue al comentario. Al final del texto (o pasado él) devuelve el límite del
   * cuerpo.
   */
  start(o: number): number {
    if (o >= this.text.length) return this.limit;
    let lo = 0;
    let hi = this.segs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.segs[mid].s <= o) lo = mid;
      else hi = mid - 1;
    }
    const seg = this.segs[lo];
    return seg.o + (o - seg.s);
  }

  /** Offset original justo después del carácter anterior a `o` (un fin que deja fuera los comentarios que siguen). */
  end(o: number): number {
    if (o <= 0 || !this.text.length) return this.start(0);
    return this.start(Math.min(o, this.text.length) - 1) + 1;
  }

  /** Offset (en `text`) en que empieza la línea `i` (0-based); pasada la última, el fin de `text`. */
  lineOffset(i: number): number {
    return i < this.offs.length ? this.offs[i] : this.text.length;
  }

  /** Una línea (0-based) sin su salto de línea. */
  lineRange(i: number): Range {
    const len = this.lines[i].length;
    const s = this.start(this.offs[i]);
    return this.index.range(s, len ? this.end(this.offs[i] + len) : s);
  }

  /** `len` caracteres a partir del offset `o` de `text` (sin comentarios de por medio). */
  charRange(o: number, len = 1): Range {
    const s = this.start(o);
    return this.index.range(s, s + len);
  }

  /**
   * Líneas `from` a `toExclusive` (0-based) como contenido: hasta su último carácter, con el salto
   * de línea final y sin los comentarios ni líneas vacías que sigan.
   */
  contentLines(from: number, toExclusive: number): Range {
    const s = this.start(this.lineOffset(from));
    const last = toExclusive - 1;
    const after = Math.min(this.lineOffset(last) + this.lines[last].length + 1, this.text.length);
    return this.index.range(s, Math.max(s, this.end(after)));
  }

  /**
   * Líneas `from` a `toExclusive` (0-based) como bloque: hasta el inicio de la línea
   * `toExclusive` (el siguiente header) o, si es la última, hasta el límite del cuerpo. Incluye
   * lo que haya entremedio (líneas en blanco, comentarios).
   */
  blockLines(from: number, toExclusive: number): Range {
    const s = this.start(this.lineOffset(from));
    const e = toExclusive < this.lines.length ? this.start(this.lineOffset(toExclusive)) : this.limit;
    return this.index.range(s, Math.max(s, e));
  }
}

export type Eol = "\n" | "\r\n";

/** Texto crudo llevado a LF, con la forma de volver a los offsets del crudo. */
export interface EolInfo {
  /** El texto con todos los finales de línea en LF (lo que esperan los parsers). */
  text: string;
  /** Final de línea predominante del crudo (`\r\n` si hay al menos tantos CRLF como LF sueltos). */
  eol: Eol;
  /**
   * Offset del texto crudo que corresponde a un offset de `text`. Un offset que apunta a un `\n`
   * (fin de línea de un rango de una línea) devuelve el de su `\r`, así reemplazar el rango no
   * toca el final de línea. Un offset al inicio de una línea queda después de su CRLF.
   */
  toRaw(offset: number): number;
  /** Rango en el crudo `[start, end)` de un rango del texto normalizado. */
  rawSpan(range: Range): [number, number];
}

/**
 * Normaliza `\r\n` y `\r` sueltos a `\n` (igual que el task-tracker al leer). Para editar sin
 * alterar los finales de línea: parsear `text`, reemplazar en el crudo con `rawSpan` (convirtiendo
 * con `toEol` lo que se inserte) y escribir el crudo. Los finales de línea mezclados quedan como
 * estaban fuera de lo reemplazado; lo insertado usa el predominante (`eol`).
 */
export function normalizeEol(raw: string): EolInfo {
  const crlf: number[] = []; // offsets (en el texto normalizado) de los `\n` que eran `\r\n`
  let lf = 0;
  let removed = 0;
  let text = "";
  let at = 0;
  for (const m of raw.matchAll(/\r\n?/g)) {
    const index = m.index ?? 0;
    text += raw.slice(at, index) + "\n";
    at = index + m[0].length;
    if (m[0] === "\r\n") {
      crlf.push(index - removed);
      removed++;
    }
  }
  text += raw.slice(at);
  for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) lf++;
  lf -= crlf.length;

  const toRaw = (offset: number) => {
    // Cantidad de CRLF cuyo `\n` está antes de `offset` = cantidad de `\r` quitados antes de él.
    let lo = 0;
    let hi = crlf.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (crlf[mid] < offset) lo = mid + 1;
      else hi = mid;
    }
    return offset + lo;
  };
  return {
    text,
    eol: crlf.length > 0 && crlf.length >= lf ? "\r\n" : "\n",
    toRaw,
    rawSpan: (range) => [toRaw(range.start), toRaw(range.end)],
  };
}

/** Convierte los saltos de línea de un texto a insertar (LF, CRLF o mezclados) al final de línea `eol`. */
export function toEol(text: string, eol: Eol): string {
  return text.replace(/\r\n?|\n/g, eol);
}
