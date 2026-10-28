// Modo observador (`--follow`): decide cuándo abrir un proyecto según lo que marca el mod de Claude.
// Puro y sin I/O: recibe lo leído de `active-project.json` y dice si hay algo nuevo que abrir.

import type { ActiveProject } from "../io/active-project.ts";

/** `since`: cuándo arrancó el observador; `lastAt`: la marca más reciente ya atendida (ms desde la época). */
export interface ObserverState {
  since: number;
  lastAt: number;
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
