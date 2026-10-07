// Espacio de trabajo resuelto: en qué carpeta están el handoff, el backlog y el history del
// operador, y qué archivos compartidos hay. Solo lee; resolverlo nunca modifica nada.

import { join } from "node:path";
import { CliError } from "../cli/errors.ts";
import { readOperators, type ResolvedOperator, resolveOperator } from "./operator.ts";
import { gitEmail, invocationDir, locateAgents, projectDirFor } from "./paths.ts";

export interface WorkspaceFiles {
  handoff: string;
  backlog: string;
  history: string;
  /** Solo en modo multi-operador (vive en la raíz de agentes, compartido). */
  teamBacklog: string | null;
}

export interface Workspace {
  /** `multi`: hay `operators.md` y una carpeta por operador. `flat`: los tres archivos van directo en `docs/agents/`. */
  mode: "multi" | "flat";
  projectDir: string;
  /** Carpeta de agentes (la que tiene `operators.md`, o los archivos en el repo plano). */
  agentsRoot: string;
  /** Carpeta donde están handoff.md, backlog.md e history.md (la del operador; en plano, `agentsRoot`). */
  dir: string;
  /**
   * Operador resuelto; `null` en el repo plano. Con `folderless` (operador «solo team-backlog»,
   * solo si se pidió `allowFolderless`) `dir` y los tres archivos propios apuntan a una carpeta que
   * no existe: solo `teamBacklog` es utilizable.
   */
  operator: ResolvedOperator | null;
  files: WorkspaceFiles;
  /** Avisos de lectura (ej. líneas de operators.md sin leer). */
  warnings: string[];
}

export interface ResolveWorkspaceOptions {
  /** `--agents`: raíz del proyecto, carpeta de agentes o carpeta de un operador. */
  agents?: string;
  /** `--operator`: carpeta del operador. */
  operator?: string;
  /** Contra qué se resuelven las rutas relativas y dónde está el repo por defecto. */
  baseDir?: string;
  /** Correo de git a usar (`null` = no disponible). Por defecto se lee de `git config user.email`. */
  email?: string | null;
  /** Admitir al operador «solo team-backlog» (ver `OperatorOptions.allowFolderless`). */
  allowFolderless?: boolean;
}

/**
 * Resuelve la carpeta de agentes y el operador. No escribe nada.
 * @throws CliError si falta algo o es ambiguo (el mensaje dice qué)
 */
export function resolveWorkspace(options: ResolveWorkspaceOptions = {}): Workspace {
  const located = locateAgents(options.agents, options.baseDir ?? invocationDir());

  if (located.mode === "flat") {
    if (options.operator) {
      throw new CliError(
        `--operator ${options.operator}: este repo es plano (no hay operators.md en ${located.agentsDir}), no tiene operadores.`,
      );
    }
    const dir = located.agentsDir;
    return {
      mode: "flat",
      projectDir: projectDirFor(dir),
      agentsRoot: dir,
      dir,
      operator: null,
      files: { handoff: join(dir, "handoff.md"), backlog: join(dir, "backlog.md"), history: join(dir, "history.md"), teamBacklog: null },
      warnings: [],
    };
  }

  const agentsRoot = located.agentsRoot;
  const projectDir = projectDirFor(agentsRoot);
  const info = readOperators(agentsRoot);
  const email = options.email !== undefined ? options.email : gitEmail(projectDir);
  const operator = resolveOperator(agentsRoot, info, {
    operator: options.operator,
    direct: located.direct,
    email,
    allowFolderless: options.allowFolderless,
  });
  const dir = join(agentsRoot, operator.folder);
  return {
    mode: "multi",
    projectDir,
    agentsRoot,
    dir,
    operator,
    files: {
      handoff: join(dir, "handoff.md"),
      backlog: join(dir, "backlog.md"),
      history: join(dir, "history.md"),
      teamBacklog: join(agentsRoot, "team-backlog.md"),
    },
    warnings: info.unreadable.map((line) => `operators.md: línea sin leer: ${line}`),
  };
}
