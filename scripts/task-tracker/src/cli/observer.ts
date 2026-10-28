// Modo observador (`--follow`): decide cuándo abrir un proyecto según lo que marca el mod de Claude.
// Puro y sin I/O: recibe lo leído de `active-project.json` y dice si hay algo nuevo que abrir.

import type { ActiveProject } from "../io/active-project.ts";
import type { NavKey } from "./keys.ts";

/** `since`: cuándo arrancó el observador; `lastAt`: la marca más reciente ya atendida (ms desde la época). */
export interface ObserverState {
  since: number;
  lastAt: number;
}

/**
 * `true` si la tecla no vale con el observador activo y un repo abierto: no se puede salir de la
 * vista del tablero (ni a la lista de proyectos con `p`, ni a la lista o al equipo con `b`/Esc).
 * Para eso hay que salir antes del modo observador con `o`.
 */
export function ignoredWithObserver(key: NavKey): boolean {
  return key === "projects" || key === "back";
}

/** Estado inicial: lo marcado antes de `now` no cuenta, solo lo posterior. */
export function startObserver(now: number): ObserverState {
  return { since: now, lastAt: now };
}

/**
 * Un paso del observador. Abre (`open`) la carpeta leída solo si su marca es posterior a la última
 * atendida; si no hay lectura, o es vieja o igual, el estado queda igual y no abre nada.
 */
export function observerStep(state: ObserverState, read: ActiveProject | null): { state: ObserverState; open: string | null } {
  if (read === null || read.at <= state.lastAt) return { state, open: null };
  return { state: { ...state, lastAt: read.at }, open: read.path };
}
