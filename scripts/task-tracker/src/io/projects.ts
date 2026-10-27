// Lista de proyectos: de dónde sale (un proveedor de rutas inyectable) y la lectura de cada repo
// para la vista de proyectos. Cada fila es lo que ve el operador de ese repo —el del correo de su
// `git config user.email`—, no el de quien lanzó el comando. La lectura es puntual (al abrir la
// vista y con `r`): no hay watchers por repo.

import { basename, join } from "node:path";
import { gitToplevel } from "../../../_shared/git.ts";
import { buildModel } from "../model/model.ts";
import type { ProjectRow } from "../shared/types.ts";
import { invocationDir, resolveAgentsDir } from "./paths.ts";
import { createSnapshotReader } from "./snapshot.ts";

/** Rutas de los repos a listar. La Tarea 97 la reemplaza por la lista guardada del usuario. */
export type ProjectsProvider = () => string[];

/**
 * Proveedor por defecto: solo el repo actual (la raíz git de la carpeta de invocación, o la
 * carpeta misma si no está en uno), y únicamente si tiene la documentación de la skill.
 */
export const defaultProjects: ProjectsProvider = () => {
  const root = gitToplevel(invocationDir());
  return resolveAgentsDir(root).ok ? [root] : [];
};

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
