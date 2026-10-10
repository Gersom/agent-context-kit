// Rutas: ubicar la carpeta de agentes (`docs/agents/`) del proyecto a partir de `--agents` o, sin
// él, del repo desde el que se lanzó el comando. Solo lee el disco: nunca escribe.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { CliError } from "../cli/errors.ts";

export const OPERATORS_FILE = "operators.md";

/** Subcarpetas donde el skill genera la documentación, relativas a la raíz del proyecto. */
const AGENTS_SUBDIRS = [join("docs", "agents"), join("agent-context", "agents")];

/**
 * Carpeta desde la que el operador lanzó el comando, para resolver rutas relativas.
 *
 * `bun run task` (Bun 1.4.2) cambia el cwd a la raíz del package y NO define `INIT_CWD`
 * (a diferencia de npm); sí deja la carpeta de invocación en `npm_config_local_prefix`.
 * Se prueban en ese orden y, si ninguna existe (ej. `bun scripts/task-manager/index.ts`
 * directo), el cwd real ya es la carpeta de invocación.
 */
export function invocationDir(): string {
  return process.env.INIT_CWD ?? process.env.npm_config_local_prefix ?? process.cwd();
}

/**
 * Limpia la ruta tal como la escribió o pegó el operador: espacios y comillas envolventes
 * (Windows las agrega al arrastrar una carpeta a la terminal).
 */
export function cleanPathInput(raw: string): string {
  let value = raw.trim();
  while (value.length >= 2 && /^(["']).*\1$/.test(value)) value = value.slice(1, -1).trim();
  return value;
}

export function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Raíz del repo git que contiene `dir`, o `dir` si no está en un repo (o git no responde). */
export function gitToplevel(dir: string): string {
  try {
    const out = spawnSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], { encoding: "utf8", timeout: 5000 });
    const top = out.status === 0 ? out.stdout.trim() : "";
    return top ? resolve(top) : dir;
  } catch {
    return dir;
  }
}

/** Correo de `git config user.email` en el repo (en minúsculas), o `null` si no se puede leer. */
export function gitEmail(repoDir: string): string | null {
  try {
    const out = spawnSync("git", ["-C", repoDir, "config", "user.email"], { encoding: "utf8", timeout: 5000 });
    const email = out.status === 0 ? out.stdout.trim().toLowerCase() : "";
    return email || null;
  } catch {
    return null;
  }
}

/** Subcarpetas de `agentsRoot` con su `handoff.md`: lo que parecen carpetas de operador. */
export function operatorFolders(agentsRoot: string): string[] {
  try {
    return readdirSync(agentsRoot)
      .filter((name) => isDir(join(agentsRoot, name)) && existsSync(join(agentsRoot, name, "handoff.md")))
      .sort();
  } catch {
    return [];
  }
}

/** `true` si la carpeta de agentes sigue la estructura del skill (`docs/agents` o `agent-context/agents`). */
function isStandardAgentsDir(agentsDir: string): boolean {
  return basename(agentsDir) === "agents" && ["docs", "agent-context"].includes(basename(dirname(agentsDir)));
}

/**
 * Raíz del repo a partir de la carpeta de agentes: la que contiene `docs/agents` (o
 * `agent-context/agents`); si no sigue esa estructura, la carpeta misma.
 */
export function projectDirFor(agentsDir: string): string {
  return isStandardAgentsDir(agentsDir) ? dirname(dirname(agentsDir)) : agentsDir;
}

/** Dónde quedó la documentación: repo plano o raíz multi-operador (y, si se pasó, la carpeta de un operador). */
export type Located =
  | { mode: "flat"; agentsDir: string }
  | { mode: "multi"; agentsRoot: string; /** Carpeta de operador pasada directamente como ruta. */ direct?: string };

/**
 * Ubica la carpeta de agentes a partir de lo que pasó el operador (`--agents`) o, sin él, del repo
 * de `baseDir`. Acepta la raíz del proyecto (busca `docs/agents/` o `agent-context/agents/`), la
 * carpeta de agentes o la carpeta de un operador. Reglas (ver `docs/multi-operator.md` de la skill):
 *
 * - **Multi** si la carpeta de agentes tiene `operators.md`; **plano** si no, y trae `handoff.md`.
 * - Sin `operators.md` pero con carpetas de operador: error, no se asume plano en silencio.
 * - Nada de eso: error con las carpetas probadas.
 *
 * @param input valor de `--agents` (ruta cruda), o `undefined` para el repo de `baseDir`
 * @param baseDir contra qué se resuelven las rutas relativas y dónde buscar el repo por defecto
 */
export function locateAgents(input: string | undefined, baseDir: string): Located {
  let target: string;
  if (input === undefined) {
    target = gitToplevel(baseDir);
  } else {
    const cleaned = cleanPathInput(input);
    if (!cleaned) throw new CliError("--agents está vacío: indica la raíz del proyecto o su carpeta de agentes.");
    target = isAbsolute(cleaned) ? resolve(cleaned) : resolve(baseDir, cleaned);
    if (!isDir(target)) throw new CliError(`No existe la carpeta indicada con --agents: ${target}`);
  }

  const candidates = [target, ...AGENTS_SUBDIRS.map((sub) => join(target, sub))];
  for (const dir of candidates) {
    if (existsSync(join(dir, OPERATORS_FILE))) return { mode: "multi", agentsRoot: dir };
  }
  for (const dir of candidates) {
    // Estado inconsistente: carpetas de operador sin `operators.md` (checks antes que el plano:
    // si hubiera un handoff.md suelto junto a ellas, sería ambiguo cuál editar).
    const folders = operatorFolders(dir);
    if (folders.length) {
      throw new CliError(
        `Hay carpetas de operador (${folders.join(", ")}) pero falta ${OPERATORS_FILE} en ${dir}. ` +
          "No se asume repo plano. Restaura el archivo (`git restore docs/agents/operators.md`, o desde un commit anterior) " +
          "o, si el repo es plano, mueve el contenido a la carpeta de agentes.",
      );
    }
  }
  for (const dir of candidates) {
    if (!existsSync(join(dir, "handoff.md"))) continue;
    // La carpeta de un operador pasada directamente: su padre tiene operators.md.
    if (existsSync(join(dirname(dir), OPERATORS_FILE))) {
      return { mode: "multi", agentsRoot: dirname(dir), direct: basename(dir) };
    }
    return { mode: "flat", agentsDir: dir };
  }
  throw new CliError(
    `No se encontró la documentación de agentes (handoff.md u ${OPERATORS_FILE}) en ninguna de estas carpetas:\n` +
      candidates.map((dir) => `  - ${dir}`).join("\n") +
      "\nIndica la ruta con --agents <ruta>.",
  );
}
