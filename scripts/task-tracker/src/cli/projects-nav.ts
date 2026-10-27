// Navegación de la lista de proyectos: qué proyecto está elegido y cuándo se pide abrirlo. Como la
// de nav.ts, es una función pura de estado y teclas, sin pantalla ni terminal. El elegido se guarda
// por su ruta (no por posición) para que siga siendo el mismo si la lista cambia al releerla.

import type { NavKey } from "./keys.ts";

export interface ProjectsNavState {
  /** Ruta del proyecto elegido; `null` si la lista está vacía. */
  selected: string | null;
  /** Ruta que Enter pidió abrir; quien llama la atiende y la limpia. */
  opened: string | null;
}

/** Estado inicial: elegido el primero de la lista (o `selected`, si todavía figura). */
export function initialProjectsNav(paths: string[], selected: string | null = null): ProjectsNavState {
  return { selected: selected && paths.includes(selected) ? selected : (paths[0] ?? null), opened: null };
}

/** Aplica una tecla de navegación (las demás no cambian el estado). */
export function projectsReduce(state: ProjectsNavState, key: NavKey, paths: string[]): ProjectsNavState {
  if (key === "up" || key === "down") {
    if (!paths.length) return state;
    const at = state.selected ? paths.indexOf(state.selected) : -1;
    const next = key === "down" ? (at + 1) % paths.length : at <= 0 ? paths.length - 1 : at - 1;
    return { ...state, selected: paths[next] };
  }
  if (key === "enter" && state.selected && paths.includes(state.selected)) return { ...state, opened: state.selected };
  return state;
}

/** Ajusta el estado a la lista actual: si el elegido desapareció, elige el primero. */
export function reconcileProjects(state: ProjectsNavState, paths: string[]): ProjectsNavState {
  const selected = state.selected && paths.includes(state.selected) ? state.selected : (paths[0] ?? null);
  const opened = state.opened && paths.includes(state.opened) ? state.opened : null;
  return selected === state.selected && opened === state.opened ? state : { selected, opened };
}

/** La ruta que queda elegida al quitar `removed`: la fila siguiente, o la anterior si era la última (`null` si no queda ninguna). */
export function neighborAfterRemove(paths: string[], removed: string): string | null {
  const at = paths.indexOf(removed);
  if (at < 0) return null;
  return paths[at + 1] ?? paths[at - 1] ?? null;
}
