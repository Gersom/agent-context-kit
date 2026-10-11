// Ayudas de los tests de docs-check: un CheckContext armado desde texto en memoria (con los
// parsers reales de _shared/parse), proyectos temporales en disco y una salida capturada.

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parseBacklog } from "../../_shared/parse/backlog.ts";
import { parseHandoff } from "../../_shared/parse/handoff.ts";
import { parseHistory } from "../../_shared/parse/history.ts";
import { normalizeEol } from "../../_shared/parse/positions.ts";
import { parseTeamBacklog } from "../../_shared/parse/team-backlog.ts";
import type { Io } from "../../task-manager/src/cli/types.ts";
import type { DocKind } from "../../task-manager/src/workspace/docs.ts";
import { makeRules } from "../src/context.ts";
import type { CheckContext, DocInfo, Finding, RootFileInfo } from "../src/types.ts";
import { BACKLOG, HANDOFF, HISTORY, OPERATORS, ROOT_AGENTS, ROOT_CLAUDE, RULES, TEAM_BACKLOG } from "./fixtures.ts";

export interface ContextOptions {
  /** Modo del repo; por defecto `flat`, o `multi` si se pasa `teamBacklog`. */
  mode?: "flat" | "multi";
  /** Texto de cada archivo; `null` = el archivo no existe. Por defecto, el fixture válido. */
  handoff?: string | null;
  backlog?: string | null;
  history?: string | null;
  /** Solo en multi (se asume `multi` si se pasa); `null` = no existe. En multi, por defecto el fixture válido. */
  teamBacklog?: string | null;
  /** rules.md de la carpeta de agentes (compartida); `null` = no existe. Por defecto, el de la plantilla con su marcador. */
  rules?: string | null;
  /** AGENTS.md y CLAUDE.md de la raíz; `null` = no existen. */
  agentsMd?: string | null;
  claudeMd?: string | null;
  operatorWarnings?: string[];
}

function doc<P>(kind: DocKind, file: string, raw: string | null | undefined, fallback: string, parse: (text: string) => P): DocInfo<P> {
  const text = raw === undefined ? fallback : raw;
  const normalized = normalizeEol(text ?? "").text;
  return { kind, file, exists: text !== null, text: normalized, parsed: parse(normalized) };
}

function rootFile(file: string, raw: string | null | undefined, fallback: string): RootFileInfo {
  const text = raw === undefined ? fallback : raw;
  return { file, exists: text !== null, text: normalizeEol(text ?? "").text };
}

/** Rutas de los archivos en los contextos en memoria. */
export const PATHS = {
  flat: "docs/agents",
  multi: "docs/agents/gersom",
  teamBacklog: "docs/agents/team-backlog.md",
  operators: "docs/agents/operators.md",
};

/** Contexto de los checks desde texto en memoria; sin opciones es un repo plano válido. */
export function makeCtx(options: ContextOptions = {}): CheckContext {
  const mode = options.mode ?? (options.teamBacklog !== undefined ? "multi" : "flat");
  const dir = mode === "multi" ? PATHS.multi : PATHS.flat;
  const team = mode === "multi" ? doc("team-backlog", PATHS.teamBacklog, options.teamBacklog, TEAM_BACKLOG, parseTeamBacklog) : null;
  return {
    mode,
    docs: {
      handoff: doc("handoff", `${dir}/handoff.md`, options.handoff, HANDOFF, parseHandoff),
      backlog: doc("backlog", `${dir}/backlog.md`, options.backlog, BACKLOG, parseBacklog),
      history: doc("history", `${dir}/history.md`, options.history, HISTORY, parseHistory),
      teamBacklog: team,
    },
    rules: makeRules(`${PATHS.flat}/rules.md`, options.rules === undefined ? RULES : options.rules),
    rootFiles: [rootFile("AGENTS.md", options.agentsMd, ROOT_AGENTS), rootFile("CLAUDE.md", options.claudeMd, ROOT_CLAUDE)],
    operatorsFile: mode === "multi" ? PATHS.operators : null,
    operatorWarnings: options.operatorWarnings ?? [],
  };
}

/** Los hallazgos de un código. */
export const withCode = (findings: Finding[], code: string): Finding[] => findings.filter((f) => f.code === code);

/** Forma comparable de un hallazgo: sin el mensaje, que se comprueba aparte. */
export const brief = (f: Finding) => ({ severity: f.severity, code: f.code, file: f.file, line: f.line });

/** Salida capturada: `out`/`err` acumulan las líneas, `text()` las junta. */
export function captureIo(): { io: Io; out: string[]; err: string[]; text: () => string } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    io: { out: (line = "") => void out.push(line), err: (line = "") => void err.push(line) },
    out,
    err,
    text: () => out.join("\n"),
  };
}

/** Un hallazgo para los tests del informe. */
export function finding(partial: Partial<Finding> & Pick<Finding, "code">): Finding {
  return { severity: "error", file: "docs/agents/handoff.md", line: null, message: "mensaje", ...partial };
}

// -- Proyectos temporales ---------------------------------------------------------------------

/** Contenido de cada archivo del proyecto, por ruta relativa a la raíz (con `/`). */
export type Tree = Record<string, string>;

export interface TempProject {
  root: string;
  cleanup(): void;
}

/** Escribe `tree` en un directorio temporal nuevo. */
export function writeProject(tree: Tree): TempProject {
  const root = mkdtempSync(join(tmpdir(), "docs-check-"));
  for (const [path, content] of Object.entries(tree)) {
    const full = join(root, ...path.split("/"));
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/** Todos los archivos bajo `root` con su contenido (para comprobar que nada se modificó). */
export function snapshot(root: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of readdirSync(root, { recursive: true, encoding: "utf8" })) {
    try {
      result[name] = readFileSync(join(root, name), "utf8");
    } catch {
      // carpetas
    }
  }
  return result;
}

/** El árbol de un repo plano válido. */
export function flatTree(): Tree {
  return {
    "AGENTS.md": ROOT_AGENTS,
    "CLAUDE.md": ROOT_CLAUDE,
    "docs/agents/rules.md": RULES,
    "docs/agents/handoff.md": HANDOFF,
    "docs/agents/backlog.md": BACKLOG,
    "docs/agents/history.md": HISTORY,
  };
}

/** El árbol de un repo multi-operador válido (operadores gersom y ana, y luis solo team-backlog). */
export function multiTree(): Tree {
  return {
    "AGENTS.md": ROOT_AGENTS,
    "CLAUDE.md": ROOT_CLAUDE,
    "docs/agents/rules.md": RULES,
    "docs/agents/operators.md": OPERATORS,
    "docs/agents/team-backlog.md": TEAM_BACKLOG,
    "docs/agents/gersom/handoff.md": HANDOFF,
    "docs/agents/gersom/backlog.md": BACKLOG,
    "docs/agents/gersom/history.md": HISTORY,
    "docs/agents/ana/handoff.md": HANDOFF,
    "docs/agents/ana/backlog.md": BACKLOG,
    "docs/agents/ana/history.md": HISTORY,
  };
}
