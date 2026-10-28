// Lista de proyectos: de dónde sale (un proveedor de rutas inyectable; por defecto, el archivo
// guardado del usuario) y la lectura de cada repo para la vista de proyectos. Cada fila es lo que
// ve el operador de ese repo —el del correo de su `git config user.email`—, no el de quien lanzó
// el comando. La lectura es puntual (al abrir la vista y con `r`): no hay watchers por repo.

import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { gitToplevel } from "../../../_shared/git.ts";
import { buildModel } from "../model/model.ts";
import type { ProjectRow } from "../shared/types.ts";
import { cleanPathInput, expandHome, invocationDir, OTHER_USER_NOTE, resolveAgentsDir } from "./paths.ts";
import { createSnapshotReader } from "./snapshot.ts";
import { type ConfigError, failureMessage, loadSavedProjects, samePath } from "./user-config.ts";

/**
 * Rutas de los repos a listar. `warning`: aviso sobre la última lectura de donde salen (ej. un
 * archivo guardado que no sirve), o `null`; se pide justo después de listar.
 */
export type ProjectsProvider = (() => string[]) & { warning?: () => string | null };

/**
 * Proveedor por defecto: los repos guardados en `projects.json` (ver user-config.ts), en orden de
 * alta. Uno cuya carpeta ya no existe se queda: sale como fila con aviso (ver `readProjectRows`).
 */
export const defaultProjects: ProjectsProvider = Object.assign(() => loadSavedProjects().paths, {
  warning: () => loadSavedProjects().warning,
});

/** Qué hay en `path`: una carpeta, un archivo u otra cosa (o nada). */
function kindOf(path: string): "dir" | "file" | null {
  try {
    const stat = statSync(path);
    return stat.isDirectory() ? "dir" : stat.isFile() ? "file" : null;
  } catch {
    return null;
  }
}

/** Nota que se suma al error de `add` cuando git no deja leer la carpeta por ser de otro usuario. */
const DUBIOUS_OWNERSHIP_NOTE = `. ${OTHER_USER_NOTE} y git no puede leerla.`;

/** `true` si la salida de git dice «dubious ownership» (sin importar mayúsculas ni cuántos espacios hay entre las palabras). */
export function isDubiousOwnership(gitOutput: string): boolean {
  return /dubious\s+ownership/i.test(gitOutput);
}

/**
 * `true` si git corrió en `dir` y se negó por el dueño de la carpeta («dubious ownership»). El
 * mensaje se pide en inglés (`LC_ALL=C`) para poder reconocerlo; cualquier otro fallo da `false`.
 */
function gitRefusesOwnership(dir: string): boolean {
  try {
    const out = spawnSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      timeout: 5000,
      env: { ...process.env, LC_ALL: "C" },
    });
    return out.error == null && out.status != null && out.status !== 0 && isDubiousOwnership(`${out.stderr}\n${out.stdout}`);
  } catch {
    return false;
  }
}

export type AddResult = { ok: true; path: string; added: boolean; warning?: string } | { ok: false; error: string };

/** La lista que ve la vista de proyectos: la del proveedor más los repos agregados en esta sesión. */
export interface ProjectList {
  list(): string[];
  /**
   * Agrega la carpeta `input` (la raíz de un repo o cualquier subcarpeta suya; un `~` inicial es el
   * home del usuario): se sube a la raíz del repo y ahí se exige la documentación de la skill. Una
   * ruta que es un archivo se rechaza. Una ruta que ya figura no se duplica
   * (`added: false`). Si se pidió guardarla (`save`) y no se pudo, el resultado lleva `warning`
   * (el aviso ya armado, ver `failureMessage`): el repo queda en la lista de esta sesión igual.
   */
  add(input: string): AddResult;
  /**
   * Quita la ruta de la lista (sin tocar el repo): si se pidió quitarla de lo guardado (`remove`)
   * y no se pudo, devuelve el aviso ya armado (ver `failureMessage`) y la lista no cambia. Si salió bien, `list()` ya no la
   * devuelve, aunque el proveedor siga dándola. Devuelve `null` si quedó quitada.
   */
  remove(path: string): string | null;
}

export function createProjectList(
  base: ProjectsProvider,
  { save, remove }: { save?: (path: string) => ConfigError | null; remove?: (path: string) => ConfigError | null } = {},
): ProjectList {
  const extra: string[] = [];
  // Rutas quitadas en esta sesión: se filtran de la lista aunque el proveedor las vuelva a dar.
  // `add` de una de ellas la vuelve a admitir.
  const removed: string[] = [];
  const list = () => {
    const paths = [...base()];
    for (const path of extra) if (!paths.some((p) => samePath(p, path))) paths.push(path);
    return paths.filter((p) => !removed.some((r) => samePath(r, p)));
  };
  return {
    list,
    add(input) {
      const cleaned = cleanPathInput(input);
      if (!cleaned) return { ok: false, error: "Escribe la ruta de la carpeta del repo." };
      const target = resolve(invocationDir(), expandHome(cleaned));
      if (kindOf(target) === "file") return { ok: false, error: `${target} es un archivo, no una carpeta.` };
      const root = gitToplevel(target);
      const resolved = resolveAgentsDir(root);
      if (!resolved.ok) {
        const error = resolved.error.replace(/:$/, "");
        // Sin docs y con git negándose por el dueño de la carpeta, la raíz pudo no encontrarse por eso.
        // Se omite el comando `git config --global --add safe.directory <ruta>`: con la ruta no cabe en el ancho.
        const note = kindOf(target) === "dir" && gitRefusesOwnership(target) ? DUBIOUS_OWNERSHIP_NOTE : "";
        return { ok: false, error: error + note };
      }
      const known = list().find((p) => samePath(p, root));
      if (known) return { ok: true, path: known, added: false };
      for (let i = removed.length - 1; i >= 0; i--) if (samePath(removed[i], root)) removed.splice(i, 1);
      extra.push(root);
      const failure = save?.(root);
      return failure ? { ok: true, path: root, added: true, warning: failureMessage("guardar", basename(root), failure) } : { ok: true, path: root, added: true };
    },
    remove(path) {
      const failure = remove?.(path);
      if (failure) return failureMessage("quitar", basename(path), failure);
      for (let i = extra.length - 1; i >= 0; i--) if (samePath(extra[i], path)) extra.splice(i, 1);
      removed.push(path);
      return null;
    },
  };
}

/**
 * Una fila por ruta, en el mismo orden. Un repo que no se puede leer (no existe, sin docs de la
 * skill, handoff.md ilegible) sale como fila con aviso: nunca corta la lista.
 * `email`: correo con el que buscar al operador en cada repo; por defecto, el de git de ese repo.
 */
export function readProjectRows(paths: string[], { email }: { email?: string | null } = {}): ProjectRow[] {
  return paths.map((path) => {
    try {
      return readProject(path, email);
    } catch (error) {
      return unreadable(path, `No se pudo leer: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

function unreadable(path: string, warning: string): ProjectRow {
  return { name: basename(path), path, operator: null, work: null, warning };
}

function readProject(path: string, email: string | null | undefined): ProjectRow {
  const resolved = resolveAgentsDir(path, undefined, { email });
  // El motivo de un repo sin docs termina en «:» porque lista las carpetas probadas; acá no se listan.
  if (!resolved.ok) return unreadable(path, resolved.error.replace(/:$/, ""));

  // Modo multi-operador: solo el operador del correo; plano: el único backlog del repo.
  const operator = resolved.multi ? resolved.multi.preferred : null;
  const row = { name: resolved.projectName, path, operator };
  if (resolved.multi && !operator) return { ...row, work: null, warning: null };

  const snapshot = createSnapshotReader(operator ? join(resolved.agentsDir, operator) : resolved.agentsDir).read({ allowRetry: false });
  if (snapshot.handoffText == null) {
    return { ...row, work: null, warning: snapshot.warnings[0] ?? "No se pudo leer handoff.md." };
  }
  const model = buildModel({ handoffText: snapshot.handoffText, backlogText: snapshot.backlogText, historyText: snapshot.historyText });
  return {
    ...row,
    work: {
      current: model.current ? { label: model.current.label, number: model.current.number, title: model.current.title } : null,
      counts: { free: model.counts.free, blocked: model.counts.blocked },
    },
    warning: null,
  };
}
