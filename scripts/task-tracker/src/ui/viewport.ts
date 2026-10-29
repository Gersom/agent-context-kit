// Recorte de una pantalla al alto de la terminal: función pura sobre las líneas ya pintadas.
// La usan las vistas de equipo y de proyectos (ver ui/render.ts) para que la fila elegida con
// ↑/↓ siga a la vista; la vista de tareas no se recorta.

/** Rango de líneas (índices, ambos incluidos) que ocupa la fila elegida. */
export interface LineRange {
  start: number;
  end: number;
}

export interface FitOptions {
  /** Alto disponible, en líneas. */
  rows: number;
  /** Líneas de la fila elegida; `null` si no hay (la ventana arranca desde arriba). */
  selected: LineRange | null;
  /** Cantidad de líneas finales que siempre se conservan (el pie de teclas). */
  footer: number;
  /** Estilo de los indicadores `↑ N más` / `↓ N más`; por defecto, sin estilo. */
  paint?: (text: string) => string;
}

/** Con menos sitio que este en la ventana, los indicadores se llevarían todo el contenido: se omiten. */
const MIN_ROOM_FOR_INDICATORS = 3;

/**
 * Recorta `lines` a `rows` líneas. Si caben, las devuelve tal cual. Si no, conserva las últimas
 * `footer` líneas y deja, encima, una ventana del resto que incluye la fila elegida completa (si
 * es más alta que la ventana, su inicio). La primera o la última línea de la ventana pasan a ser
 * `↑ N más` / `↓ N más` cuando quedan líneas ocultas arriba o abajo (N las cuenta todas, también la
 * que el indicador reemplaza). Con muy poco alto devuelve lo que quepa, empezando por el pie.
 */
export function fitToHeight(lines: string[], { rows, selected, footer, paint = (text) => text }: FitOptions): string[] {
  if (lines.length <= rows) return lines;
  const kept = Math.min(Math.max(0, footer), lines.length);
  const body = lines.slice(0, lines.length - kept);
  const tail = lines.slice(lines.length - kept);
  const room = rows - kept;
  if (room < 1) return tail.slice(tail.length - Math.max(0, rows));

  const maxStart = body.length - room;
  const first = selected ? clamp(selected.start, 0, body.length - 1) : 0;
  const last = selected ? clamp(selected.end, first, body.length - 1) : 0;
  const useIndicators = room >= MIN_ROOM_FOR_INDICATORS;
  const start = !selected ? 0 : useIndicators ? windowStart(first, last, room, body.length) : clamp(first, 0, maxStart);

  const window = body.slice(start, start + room);
  if (useIndicators) {
    if (start > 0) window[0] = paint(`↑ ${start + 1} más`);
    const below = body.length - (start + room);
    if (below > 0) window[room - 1] = paint(`↓ ${below + 1} más`);
  }
  return [...window, ...tail];
}

/**
 * Primera línea de la ventana (de `room` líneas, sobre `total`) con la que el rango `first`–`last`
 * se ve entero, sin quedar bajo un indicador. Sin tocar nada arriba si así cabe; si no, la que deja
 * el rango más cerca del centro. Un rango más alto que la ventana prioriza su inicio.
 */
function windowStart(first: number, last: number, room: number, total: number): number {
  const maxStart = total - room;
  const fits = (start: number): boolean => {
    const top = start > 0 ? 1 : 0;
    const bottom = start < maxStart ? 1 : 0;
    return first >= start + top && last <= start + room - 1 - bottom;
  };
  if (fits(0)) return 0;
  const ideal = first - Math.floor((room - (last - first + 1)) / 2);
  let best = -1;
  for (let start = 1; start <= maxStart; start++) {
    if (fits(start) && (best < 0 || Math.abs(start - ideal) < Math.abs(best - ideal))) best = start;
  }
  return best >= 0 ? best : clamp(first - 1, 0, maxStart);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
