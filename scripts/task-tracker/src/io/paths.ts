// Rutas: ubicar la carpeta de agentes del proyecto vigilado a partir de lo que pasa el
// operador, y el nombre del proyecto para el encabezado.

import { existsSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import type { ResolveResult } from "../shared/types.ts";
import { isMultiDir, OPERATORS_FILE, operatorFolders, resolveOperator } from "./operator.ts";

/** Subcarpetas donde el skill genera la documentación, relativas a la raíz del proyecto. */
const AGENTS_SUBDIRS = [join("docs", "agents"), join("agent-context", "agents")];

/**
 * Carpeta desde la que el operador lanzó el comando, para resolver rutas relativas.
 *
 * `bun run tasks` (Bun 1.4.2) cambia el cwd a la raíz del package y NO define `INIT_CWD`
 * (a diferencia de npm); sí deja la carpeta de invocación en `npm_config_local_prefix`.
 * Se prueban en ese orden y, si ninguna existe (ej. `bun scripts/task-tracker/index.ts`
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

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Cómo elegir al operador en modo multi-operador (ver `resolveOperator`). */
export interface ResolveOptions {
  /** Carpeta del operador, indicada con `--operator`. */
  operator?: string;
  /** Correo con el que buscarlo, en lugar de leer `git config user.email` (`null` = no disponible). */
  email?: string | null;
}

/**
 * Ubica la carpeta de agentes a partir de lo que pasó el operador: la carpeta misma si ya
 * contiene `handoff.md`, o `docs/agents/` / `agent-context/agents/` dentro de ella.
 * En modo multi-operador (la carpeta de agentes tiene `operators.md`) devuelve la carpeta del
 * operador: la de `options.operator` o la que corresponde al correo de git. Pasar directamente
 * la carpeta de un operador también sirve.
 * @param input ruta cruda (argumento o respuesta a la pregunta)
 * @param baseDir contra qué se resuelven las rutas relativas
 */
export function resolveAgentsDir(
  input: string,
  baseDir: string = invocationDir(),
  options: ResolveOptions = {},
): ResolveResult {
  const cleaned = cleanPathInput(input);
  if (!cleaned) return { ok: false, error: "La ruta está vacía.", tried: [] };

  const target = isAbsolute(cleaned) ? resolve(cleaned) : resolve(baseDir, cleaned);
  if (!isDir(target)) {
    return { ok: false, error: `No existe la carpeta: ${target}`, tried: [target] };
  }

  const candidates = [target, ...AGENTS_SUBDIRS.map((sub) => join(target, sub))];
  for (const dir of candidates) {
    if (isMultiDir(dir)) return resolveMulti(dir, options);
    if (existsSync(join(dir, "handoff.md"))) {
      // La carpeta de un operador pasada directamente: su padre tiene operators.md.
      if (isMultiDir(dirname(dir))) return multiOk(dirname(dir), basename(dir));
      return { ok: true, agentsDir: dir, projectName: projectNameFor(dir), projectDir: projectDirFor(dir) };
    }
  }

  for (const dir of candidates) {
    const folders = operatorFolders(dir);
    if (folders.length) {
      return {
        ok: false,
        error: `Hay carpetas de operador (${folders.join(", ")}) pero falta ${OPERATORS_FILE} en ${dir}. Hay que restaurarlo (desde HEAD o un commit anterior) para usar el modo multi-operador.`,
        tried: [join(dir, OPERATORS_FILE)],
      };
    }
  }
  return { ok: false, error: "No se encontró handoff.md en ninguna de estas carpetas:", tried: candidates };
}

function multiOk(agentsRoot: string, folder: string): ResolveResult {
  return {
    ok: true,
    agentsDir: join(agentsRoot, folder),
    projectName: projectNameFor(agentsRoot),
    projectDir: projectDirFor(agentsRoot),
    operator: folder,
  };
}

function resolveMulti(agentsRoot: string, options: ResolveOptions): ResolveResult {
  const found = resolveOperator(agentsRoot, { ...options, repoDir: projectDirFor(agentsRoot) });
  if (found.ok) return multiOk(agentsRoot, found.folder);
  return {
    ok: false,
    error: found.error,
    tried: [join(agentsRoot, OPERATORS_FILE)],
    operatorChoices: found.choices.length ? found.choices : undefined,
  };
}

/**
 * Nombre del proyecto para el encabezado y el título de la terminal: la carpeta que contiene
 * `docs/agents` (o `agent-context/agents`); si la carpeta vigilada no sigue esa estructura,
 * su propio nombre.
 */
export function projectNameFor(agentsDir: string): string {
  return basename(projectDirFor(agentsDir));
}

/** `true` si la carpeta de agentes sigue la estructura del skill (`docs/agents` o `agent-context/agents`). */
function isStandardAgentsDir(agentsDir: string): boolean {
  return basename(agentsDir) === "agents" && ["docs", "agent-context"].includes(basename(dirname(agentsDir)));
}

/**
 * Ruta del repo para el encabezado: la carpeta que contiene `docs/agents` (o
 * `agent-context/agents`); si la carpeta vigilada no sigue esa estructura, ella misma.
 */
export function projectDirFor(agentsDir: string): string {
  return isStandardAgentsDir(agentsDir) ? dirname(dirname(agentsDir)) : agentsDir;
}
