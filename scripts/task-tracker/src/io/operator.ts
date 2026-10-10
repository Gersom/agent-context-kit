// Modo multi-operador (ver docs/multi-operator.md de la skill): con `operators.md` en la carpeta de
// agentes, cada operador tiene su carpeta con handoff.md, backlog.md e history.md. Acá se ubica
// la del operador a vigilar: la indicada con `--operator` o, si no, la que corresponde al
// correo de `git config user.email` del repo.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseOperators } from "../../../_shared/parse/operators.ts";
import { readFileSafe } from "./files.ts";

export const OPERATORS_FILE = "operators.md";

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** `true` si la carpeta de agentes está en modo multi-operador (tiene `operators.md`). */
export function isMultiDir(agentsRoot: string): boolean {
  return existsSync(join(agentsRoot, OPERATORS_FILE));
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

export type OperatorResolution = { ok: true; folder: string } | { ok: false; error: string; choices: string[] };

export interface OperatorOptions {
  /** Carpeta indicada con `--operator`: gana sobre el correo. */
  operator?: string;
  /** Correo a buscar; si no se indica se lee de git en `repoDir` (`null` = no disponible). */
  email?: string | null;
  repoDir: string;
}

/**
 * Carpeta del operador dentro de `agentsRoot`. Si no se puede resolver sola (correo ausente,
 * no figura, figura sin carpeta, carpeta inexistente), devuelve el motivo y las carpetas entre
 * las que el operador puede elegir.
 */
export function resolveOperator(agentsRoot: string, options: OperatorOptions): OperatorResolution {
  const parsed = parseOperators(readFileSafe(join(agentsRoot, OPERATORS_FILE)).text ?? "");
  const withFolder = parsed.operators.filter((entry) => !entry.folderless);
  const choices = withFolder.map((entry) => entry.folder);
  const unreadable = parsed.unreadable.length ? ` (líneas de ${OPERATORS_FILE} sin leer: ${parsed.unreadable.join("; ")})` : "";
  const fail = (error: string): OperatorResolution => ({ ok: false, error: error + unreadable, choices });

  const pick = (folder: string): OperatorResolution => {
    if (!existsSync(join(agentsRoot, folder, "handoff.md"))) {
      return fail(`La carpeta «${folder}» de ${OPERATORS_FILE} no existe o no tiene handoff.md en ${agentsRoot}.`);
    }
    return { ok: true, folder };
  };

  if (options.operator) {
    const wanted = options.operator.toLowerCase();
    const entry = withFolder.find((candidate) => candidate.folder.toLowerCase() === wanted);
    return entry ? pick(entry.folder) : fail(`«${options.operator}» no figura con carpeta en ${OPERATORS_FILE}.`);
  }

  const email = options.email !== undefined ? options.email : gitEmail(options.repoDir);
  if (!email) return fail("No se pudo leer `git config user.email` para saber qué operador corresponde.");
  const mine = parsed.operators.find((entry) => entry.emails.includes(email.toLowerCase()));
  if (!mine) return fail(`${email} no figura en ${OPERATORS_FILE}.`);
  if (mine.folderless) return fail(`${email} figura como «solo team-backlog»: no tiene carpeta propia.`);
  return pick(mine.folder);
}
