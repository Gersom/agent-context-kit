// Contexto de los checks: lee (con una función inyectable) y parsea los archivos del espacio de
// trabajo ya resuelto. Es lo único que toca el disco además de resolver el espacio de trabajo, y
// solo lee.

import { join, relative, sep } from "node:path";
import { parseBacklog } from "../../_shared/parse/backlog.ts";
import { parseHandoff } from "../../_shared/parse/handoff.ts";
import { parseHistory } from "../../_shared/parse/history.ts";
import { normalizeEol } from "../../_shared/parse/positions.ts";
import { parseTeamBacklog } from "../../_shared/parse/team-backlog.ts";
import type { DocKind } from "../../task-manager/src/workspace/docs.ts";
import type { Workspace } from "../../task-manager/src/workspace/workspace.ts";
import type { CheckContext, DocInfo, RootFileInfo, RulesInfo } from "./types.ts";

/** Archivos de la raíz que llevan el bloque del skill. */
export const ROOT_FILES = ["AGENTS.md", "CLAUDE.md"];

/** Lee un archivo: su texto, o `null` si no existe (cualquier otro fallo lo lanza el lector). */
export type ReadFile = (path: string) => string | null;

/** Ruta relativa a `projectDir`, con `/` (`.` si es la propia raíz). */
export function relativeTo(projectDir: string, path: string): string {
  return relative(projectDir, path).split(sep).join("/") || ".";
}

/** Un archivo leído y parseado; ausente (`raw` en `null`) se parsea como vacío. */
export function makeDoc<P>(kind: DocKind, file: string, raw: string | null, parse: (text: string) => P): DocInfo<P> {
  const text = normalizeEol(raw ?? "").text;
  return { kind, file, exists: raw !== null, text, parsed: parse(text) };
}

/** AGENTS.md y CLAUDE.md de la raíz del proyecto. */
export function readRootFiles(projectDir: string, read: ReadFile): RootFileInfo[] {
  return ROOT_FILES.map((file) => {
    const raw = read(join(projectDir, file));
    return { file, exists: raw !== null, text: normalizeEol(raw ?? "").text };
  });
}

/** Cuántas líneas de `rules.md` se conservan: el marcador de versión va en las primeras. */
export const RULES_HEAD_LINES = 3;

/** `rules.md` de la carpeta de agentes: su cabecera, o vacía si no existe. */
export function makeRules(file: string, raw: string | null): RulesInfo {
  const text = normalizeEol(raw ?? "").text;
  return { file, exists: raw !== null, head: text.split("\n").slice(0, RULES_HEAD_LINES).join("\n") };
}

/** Contexto completo de un espacio de trabajo resuelto. */
export function buildContext(workspace: Workspace, read: ReadFile): CheckContext {
  const { projectDir, files } = workspace;
  const rel = (path: string) => relativeTo(projectDir, path);
  const rulesFile = join(workspace.agentsRoot, "rules.md");
  return {
    mode: workspace.mode,
    docs: {
      handoff: makeDoc("handoff", rel(files.handoff), read(files.handoff), parseHandoff),
      backlog: makeDoc("backlog", rel(files.backlog), read(files.backlog), parseBacklog),
      history: makeDoc("history", rel(files.history), read(files.history), parseHistory),
      teamBacklog: files.teamBacklog ? makeDoc("team-backlog", rel(files.teamBacklog), read(files.teamBacklog), parseTeamBacklog) : null,
    },
    rules: makeRules(rel(rulesFile), read(rulesFile)),
    rootFiles: readRootFiles(projectDir, read),
    operatorsFile: workspace.mode === "multi" ? rel(join(workspace.agentsRoot, "operators.md")) : null,
    operatorWarnings: workspace.warnings,
  };
}
