// Ejecución: interpreta los argumentos, resuelve el espacio de trabajo del proyecto revisado, corre
// los checks y escribe el informe. Solo lee el proyecto revisado; los errores esperables salen como
// un mensaje en español, sin stack.

import { isAbsolute, resolve } from "node:path";
import { CliError, UsageError } from "../../task-manager/src/cli/errors.ts";
import type { Io } from "../../task-manager/src/cli/types.ts";
import { readRaw } from "../../task-manager/src/workspace/docs.ts";
import { cleanPathInput, invocationDir, isDir, locateAgents, projectDirFor } from "../../task-manager/src/workspace/paths.ts";
import { resolveWorkspace } from "../../task-manager/src/workspace/workspace.ts";
import { HELP, parseCheckArgs } from "./args.ts";
import { checkRootFiles, runChecks } from "./checks/index.ts";
import { buildContext, readRootFiles, relativeTo } from "./context.ts";
import { buildReport, type ReportMeta, renderJson, renderText } from "./report.ts";
import type { Finding } from "./types.ts";

export interface RunOptions {
  io?: Io;
  /** Contra qué se resuelven las rutas relativas (por defecto, desde donde se lanzó el comando). */
  baseDir?: string;
  /** Correo de git a usar en vez de leer `git config user.email` (`null` = no disponible). */
  email?: string | null;
}

/** Salida por defecto: la terminal. */
const consoleIo: Io = {
  out: (line = "") => process.stdout.write(`${line}\n`),
  err: (line = "") => process.stderr.write(`${line}\n`),
};

export interface Inspection {
  meta: ReportMeta;
  findings: Finding[];
}

/** Los mensajes del task-manager hablan de su flag `--agents`; aquí la ruta es un argumento. */
function askForPath(message: string): string {
  return message
    .replace("Indica la ruta con --agents <ruta>.", "Indica la raíz del proyecto o su carpeta de agentes.")
    .replace("indicada con --agents", "indicada")
    .replace("--agents está vacío", "La ruta está vacía");
}

/**
 * Lo que se sabe de dónde está el proyecto cuando el espacio de trabajo no se pudo resolver. Si ni
 * siquiera se ubica la documentación de agentes pero la ruta es una carpeta que existe, esa carpeta
 * es la raíz del proyecto (o la del repo, si es una carpeta de agentes vacía): modo y carpeta de
 * agentes quedan sin ubicar, pero AGENTS.md y CLAUDE.md se pueden revisar igual.
 */
function locateProject(path: string, baseDir: string): { projectDir: string; mode: "flat" | "multi" | null; agentsDir: string | null } | null {
  try {
    const located = locateAgents(path, baseDir);
    const agentsDir = located.mode === "flat" ? located.agentsDir : located.agentsRoot;
    return { projectDir: projectDirFor(agentsDir), mode: located.mode, agentsDir };
  } catch {
    const input = cleanPathInput(path);
    if (!input) return null;
    const dir = isAbsolute(input) ? resolve(input) : resolve(baseDir, input);
    return isDir(dir) ? { projectDir: projectDirFor(dir), mode: null, agentsDir: null } : null;
  }
}

/**
 * Revisa un proyecto: devuelve qué se revisó y los hallazgos. No imprime nada ni escribe en el
 * proyecto. Si el espacio de trabajo no se puede resolver, el motivo es un hallazgo `workspace` y
 * solo se revisan AGENTS.md y CLAUDE.md, si se pudo ubicar la raíz (también cuando la carpeta
 * indicada existe pero no tiene documentación de agentes).
 */
export function inspect(path: string, operator: string | undefined, options: Pick<RunOptions, "baseDir" | "email"> = {}): Inspection {
  const baseDir = options.baseDir ?? invocationDir();
  try {
    const workspace = resolveWorkspace({ agents: path, operator, baseDir, email: options.email });
    const ctx = buildContext(workspace, readRaw);
    return {
      meta: {
        project: workspace.projectDir,
        mode: workspace.mode,
        agentsDir: relativeTo(workspace.projectDir, workspace.agentsRoot),
        operator: workspace.operator?.folder ?? null,
      },
      findings: runChecks(ctx),
    };
  } catch (caught) {
    if (!(caught instanceof CliError)) throw caught;
    const located = locateProject(path, baseDir);
    const workspaceError: Finding = { severity: "error", code: "workspace", file: ".", line: null, message: askForPath(caught.message) };
    let rootFindings: Finding[] = [];
    if (located) {
      try {
        rootFindings = checkRootFiles({ rootFiles: readRootFiles(located.projectDir, readRaw) });
      } catch {
        // Un AGENTS.md ilegible no oculta el error que importa: el del espacio de trabajo.
      }
    }
    const input = cleanPathInput(path);
    return {
      meta: {
        project: located?.projectDir ?? (isAbsolute(input) ? resolve(input) : resolve(baseDir, input)),
        mode: located?.mode ?? null,
        agentsDir: located?.agentsDir ? relativeTo(located.projectDir, located.agentsDir) : null,
        operator: null,
      },
      findings: [workspaceError, ...rootFindings],
    };
  }
}

/**
 * Ejecuta una línea de comandos.
 * @param argv argumentos sin `bun` ni el script (`process.argv.slice(2)`)
 * @returns código de salida: 0 sin errores, 1 con errores (con --strict, también con avisos), 2 mal uso
 */
export async function run(argv: string[], options: RunOptions = {}): Promise<number> {
  const io = options.io ?? consoleIo;
  try {
    const args = parseCheckArgs(argv);
    if (args.help || args.path === null) {
      HELP.forEach((line) => io.out(line));
      return 0;
    }
    const { meta, findings } = inspect(args.path, args.operator, options);
    const report = buildReport(meta, findings, args.strict);
    if (args.json) io.out(renderJson(report));
    else renderText(report).forEach((line) => io.out(line));
    return report.ok ? 0 : 1;
  } catch (caught) {
    if (caught instanceof CliError) {
      io.err(`Error: ${caught.message}`);
      if (caught instanceof UsageError) io.err("Usa `bun run check --help` para ver el uso.");
      return caught.exitCode;
    }
    io.err(`Error inesperado: ${(caught as Error)?.stack ?? caught}`);
    return 1;
  }
}
