// Teclas de la lista de proyectos (la vista sin repo abierto): escribir la ruta de un repo que se
// agrega, confirmar que se quita uno y la navegación de projects-nav.ts. Como esa, es una función
// pura de estado y bytes recibidos, sin pantalla ni terminal: no hace nada, devuelve los efectos
// (`ProjectsAction`) para que app.ts los ejecute en orden.

import { parseConfirm, parseKeys } from "./keys.ts";
import { editLine } from "./line-edit.ts";
import { type ProjectsNavState, projectsReduce } from "./projects-nav.ts";

export interface ProjectsKeysState {
  nav: ProjectsNavState;
  /** Texto de la ruta que se escribe para agregar un repo; `null` si no se está agregando. */
  adding: string | null;
  /** Ruta del proyecto que se pide quitar, a la espera de confirmar; `null` si no hay nada que confirmar. */
  confirmRemove: string | null;
}

/** Lo que el reductor necesita leer de afuera. */
export interface ProjectsKeysContext {
  /** Rutas de las filas que se ven ahora, en orden. */
  paths: string[];
}

/**
 * Efectos que app.ts ejecuta, en el orden en que vienen:
 * - `quit`: terminar el programa.
 * - `redraw`: redibujar la pantalla.
 * - `reload`: volver a leer la lista de proyectos y sus repos (`r`).
 * - `clearNotices`: borrar los avisos de la lista.
 * - `open`: abrir el repo en `path` (Enter); si no se puede, app.ts lo avisa y se queda.
 * - `submitAdd`: agregar la ruta `text`. Si no sirve, app.ts avisa y deja `adding` como está (la
 *   entrada sigue abierta); si sirve, pone `adding` en `null`.
 * - `submitRemove`: quitar de la lista el proyecto en `path` (la confirmación ya se limpió en el estado).
 * - `observe`: activar o desactivar el modo observador (`o`); app.ts redibuja por su cuenta.
 */
export type ProjectsAction =
  | { kind: "quit" }
  | { kind: "redraw" }
  | { kind: "reload" }
  | { kind: "clearNotices" }
  | { kind: "open"; path: string }
  | { kind: "submitAdd"; text: string }
  | { kind: "submitRemove"; path: string }
  | { kind: "observe" };

export interface ProjectsKeysResult {
  state: ProjectsKeysState;
  actions: ProjectsAction[];
  /**
   * Índice (en `parseKeys(chunk)`) de la primera tecla del bloque que falta atender, o `null` si no
   * queda ninguna. Tras `reload` y `open` el reductor se detiene: lo que sigue depende de lo que
   * cambie al ejecutarlos (otras filas, o un repo abierto en vez de la lista).
   */
  resume: number | null;
}

/**
 * Aplica lo que llegó de la terminal en modo raw a la lista de proyectos, desde la tecla `from` del
 * bloque (para seguir uno que quedó a medias, ver `resume`).
 * - Escribiendo una ruta: todo es texto, salvo Ctrl+C (sale), Enter (agrega) y Esc (cancela).
 * - Confirmando: solo Ctrl+C (sale), Enter (quita) y Esc o `n` (cancelan); lo demás se ignora.
 * - Si no: `q` o Ctrl+C salen, `r` relee, `o` alterna el observador, `a` abre la entrada de la ruta (lo que siga en el bloque ya
 *   es la ruta), `x` pide confirmar quitar el elegido (lo que siga en el bloque no puede contestar),
 *   y ↑/↓/Enter navegan. Las demás teclas se ignoran.
 */
export function projectsKeysReduce(state: ProjectsKeysState, chunk: string, ctx: ProjectsKeysContext, from = 0): ProjectsKeysResult {
  if (state.adding != null) {
    if (chunk.includes("\u0003")) return { state, actions: [{ kind: "quit" }], resume: null };
    const edit = editLine(state.adding, chunk);
    if (edit.done === "cancel") return { state: { ...state, adding: null }, actions: [{ kind: "clearNotices" }, { kind: "redraw" }], resume: null };
    const actions: ProjectsAction[] = edit.done === "submit" ? [{ kind: "submitAdd", text: edit.text }, { kind: "redraw" }] : [{ kind: "redraw" }];
    return { state: { ...state, adding: edit.text }, actions, resume: null };
  }

  if (state.confirmRemove != null) {
    const answer = parseConfirm(chunk);
    if (answer === "quit") return { state, actions: [{ kind: "quit" }], resume: null };
    if (answer === "accept") return { state: { ...state, confirmRemove: null }, actions: [{ kind: "submitRemove", path: state.confirmRemove }, { kind: "redraw" }], resume: null };
    if (answer === "cancel") return { state: { ...state, confirmRemove: null }, actions: [{ kind: "redraw" }], resume: null };
    return { state, actions: [], resume: null };
  }

  const keys = parseKeys(chunk);
  const actions: ProjectsAction[] = [];
  let nav = state.nav;
  const result = (patch: Partial<ProjectsKeysState>, extra: ProjectsAction[], resume: number | null = null): ProjectsKeysResult => ({
    state: { ...state, nav, ...patch },
    actions: [...actions, ...extra],
    resume,
  });

  for (let i = from; i < keys.length; i++) {
    const key = keys[i];
    const next = i + 1 < keys.length ? i + 1 : null;
    if (key === "quit") return result({}, [{ kind: "quit" }]);
    if (key === "redraw") return result({}, [{ kind: "reload" }, { kind: "redraw" }], next);
    if (key === "observe") {
      // No cambia las filas ni la vista: el bloque sigue con la tecla siguiente.
      actions.push({ kind: "observe" });
      continue;
    }
    if (key === "add") {
      // Lo que siga en este mismo bloque ya es la ruta, no teclas de navegación.
      const rest = chunk.slice(chunk.search(/[aA]/) + 1);
      return result({ adding: rest ? editLine("", rest).text : "" }, [{ kind: "clearNotices" }, { kind: "redraw" }]);
    }
    if (key === "remove") {
      // Sin filas no hay nada que quitar; con una elegida, se pide confirmar antes. Lo que siga en
      // este mismo bloque no puede contestar la confirmación.
      if (nav.selected && ctx.paths.includes(nav.selected)) return result({ confirmRemove: nav.selected }, [{ kind: "clearNotices" }, { kind: "redraw" }]);
      return result({}, []);
    }
    const moved = projectsReduce(nav, key, ctx.paths);
    if (moved.opened) return result({}, [{ kind: "open", path: moved.opened }], next);
    if (moved !== nav) {
      nav = moved;
      actions.push({ kind: "redraw" });
    }
  }
  return result({}, []);
}
