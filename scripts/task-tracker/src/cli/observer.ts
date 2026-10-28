// Modo observador (`--follow`): decide cuándo abrir un proyecto según lo que marca el mod de Claude.
// Puro y sin I/O: recibe lo leído de `active-project.json` y dice si hay algo nuevo que abrir.

import type { ActiveProject } from "../io/active-project.ts";
import { isSkillMissing, SKILL_URL } from "../io/paths.ts";
import type { NavKey } from "./keys.ts";

/** `since`: cuándo arrancó el observador; `lastAt`: la marca más reciente ya atendida (ms desde la época). */
export interface ObserverState {
  since: number;
  lastAt: number;
}

/**
 * `true` si la tecla no vale con el observador activo y un repo abierto: no se puede salir de la
 * vista del tablero (ni a la lista de proyectos con `p`, ni al equipo con `e`). Para eso hay que
 * salir antes del modo observador con `o`.
 */
export function ignoredWithObserver(key: NavKey): boolean {
  return key === "projects" || key === "team";
}

/**
 * Aviso del observador cuando no se pudo abrir el repo marcado `path`. `error`: el de `add` o de
 * `resolveAgentsDir` (con o sin el «:» final). Sin la skill iniciada lo dice claro y da el enlace
 * (sin punto final, para que la URL se copie entera); los demás errores van como «No se pudo abrir».
 * `warning`: aviso ya armado que se suma al final, si lo hay.
 */
export function observerFailureNotice(path: string, error: string, warning?: string | null): string {
  const extra = warning ? ` ${warning}` : "";
  if (isSkillMissing(error)) return `Este repo no tiene la skill iniciada: ${path}. Instálala desde ${SKILL_URL}${extra}`;
  return `No se pudo abrir ${path}: ${error.replace(/:$/, "")}.${extra}`;
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
