// Medidas de la lista de proyectos: los anchos de las columnas de la tabla y la decisión de
// dibujarla como tabla (terminales anchas) o como tarjetas de tres líneas (terminales angostas).
// Son funciones puras: render.ts solo las aplica.

import type { ProjectRow } from "../shared/types.ts";
import { BOX_PADDING } from "./box.ts";
import { shortTaskName, visibleLength } from "./format.ts";

/** Separación entre las columnas de la lista de proyectos. */
export const PROJECT_GAP = "  ";
/** Ancho máximo de la columna «nombre». */
export const NAME_MAX_WIDTH = 24;
/** Ancho máximo de la columna «operador». */
export const OPERATOR_MAX_WIDTH = 16;
/** Parte de lo que sobra que se lleva la «ruta»; el resto es de «en curso». */
export const PATH_SHARE = 0.45;
/** Ancho mínimo que debe tener la «ruta» para que la tabla valga la pena (si la ruta más larga es más corta, basta con esa). */
export const MIN_PATH_WIDTH = 24;
/** Ancho mínimo de «en curso» para la tabla (si el texto más largo es más corto, basta con ese). */
export const MIN_CURRENT_WIDTH = 22;

export type ProjectViewMode = "table" | "cards";

export interface ProjectColumns {
  nameW: number;
  pathW: number;
  operatorW: number;
  currentW: number;
  freeW: number;
  blockedW: number;
  /** Ancho que pediría la ruta más larga (con su encabezado) y el texto «en curso» más largo: el tope de lo que la tabla necesita. */
  pathMax: number;
  currentMax: number;
}

/** Texto de la columna «en curso» de un proyecto: su tarea, «Sin tarea en curso» o «—» si no se sabe. */
export function currentText(project: ProjectRow): string {
  const { work } = project;
  return work?.current ? shortTaskName(work.current.number, work.current.title) : work ? "Sin tarea en curso" : "—";
}

const widest = (header: string, texts: string[]) => Math.max(visibleLength(header), ...texts.map(visibleLength));

/**
 * Anchos de las columnas de la tabla para una pantalla de `width` columnas: nombre, operador,
 * libres y bloqueadas llevan lo que su contenido pide (con un tope); la ruta y la tarea en curso
 * se reparten el resto.
 */
export function projectColumns(rows: ProjectRow[], width: number): ProjectColumns {
  const nameW = Math.min(NAME_MAX_WIDTH, widest("nombre", rows.map((r) => r.name)));
  const operatorW = Math.min(OPERATOR_MAX_WIDTH, widest("operador", rows.map((r) => r.operator ?? "—")));
  const freeW = widest("libres", rows.map((r) => String(r.work?.counts.free ?? "—")));
  const blockedW = widest("bloqueadas", rows.map((r) => String(r.work?.counts.blocked ?? "—")));
  const room = width - BOX_PADDING - 2 - nameW - operatorW - freeW - blockedW - PROJECT_GAP.length * 5;
  const pathMax = widest("ruta", rows.map((r) => r.path));
  const currentMax = widest("en curso", rows.map(currentText));
  const pathW = Math.max(1, Math.min(pathMax, Math.floor(room * PATH_SHARE)));
  const currentW = Math.max(1, room - pathW);
  return { nameW, pathW, operatorW, currentW, freeW, blockedW, pathMax, currentMax };
}

/**
 * Tabla si, con los anchos de `projectColumns`, la ruta y la tarea en curso quedan con al menos
 * `MIN_PATH_WIDTH` y `MIN_CURRENT_WIDTH` columnas (o con las que su contenido pide, si es menos);
 * si no, tarjetas. El umbral sale del contenido: no es un ancho fijo.
 */
export function projectViewMode(rows: ProjectRow[], width: number): ProjectViewMode {
  const { pathW, currentW, pathMax, currentMax } = projectColumns(rows, width);
  return pathW >= Math.min(pathMax, MIN_PATH_WIDTH) && currentW >= Math.min(currentMax, MIN_CURRENT_WIDTH) ? "table" : "cards";
}

/** Recorta por el principio, dejando el final (donde está lo que distingue una ruta): `…` + final, en `max` columnas. */
export function truncateStart(text: string, max: number): string {
  if (visibleLength(text) <= max) return text;
  const room = Math.max(0, max - 1);
  let tail = "";
  let used = 0;
  for (const char of Array.from(text).reverse()) {
    const w = visibleLength(char);
    if (used + w > room) break;
    tail = char + tail;
    used += w;
  }
  return `…${tail}`;
}
