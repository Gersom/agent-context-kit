// Rutas: ubicar la carpeta de agentes del proyecto vigilado a partir de lo que pasa el
// operador, y el nombre del proyecto para el encabezado.

import { existsSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import type { ResolveResult } from "../shared/types.ts";

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

/**
 * Ubica la carpeta de agentes a partir de lo que pasó el operador: la carpeta misma si ya
 * contiene `handoff.md`, o `docs/agents/` / `agent-context/agents/` dentro de ella.
 * @param input ruta cruda (argumento o respuesta a la pregunta)
 * @param baseDir contra qué se resuelven las rutas relativas
 */
export function resolveAgentsDir(input: string, baseDir: string = invocationDir()): ResolveResult {
  const cleaned = cleanPathInput(input);
  if (!cleaned) return { ok: false, error: "La ruta está vacía.", tried: [] };

  const target = isAbsolute(cleaned) ? resolve(cleaned) : resolve(baseDir, cleaned);
  if (!isDir(target)) {
    return { ok: false, error: `No existe la carpeta: ${target}`, tried: [target] };
  }

  const candidates = [target, ...AGENTS_SUBDIRS.map((sub) => join(target, sub))];
  for (const dir of candidates) {
    if (existsSync(join(dir, "handoff.md"))) {
      return { ok: true, agentsDir: dir, projectName: projectNameFor(dir) };
    }
  }
  return { ok: false, error: "No se encontró handoff.md en ninguna de estas carpetas:", tried: candidates };
}

/**
 * Nombre del proyecto para el encabezado y el título de la terminal: la carpeta que contiene
 * `docs/agents` (o `agent-context/agents`); si la carpeta vigilada no sigue esa estructura,
 * su propio nombre.
 */
export function projectNameFor(agentsDir: string): string {
  const parent = dirname(agentsDir);
  if (basename(agentsDir) === "agents" && ["docs", "agent-context"].includes(basename(parent))) {
    return basename(dirname(parent));
  }
  return basename(agentsDir);
}
