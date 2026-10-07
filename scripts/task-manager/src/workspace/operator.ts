// Operador actual en modo multi-operador (ver skill/docs/multi-operator.md, «Quién es el operador
// actual»): `--operator <carpeta>` si se indicó o, si no, el que corresponde al correo de
// `git config user.email` según `operators.md`. Ante lo ambiguo falla diciendo qué falta; nunca
// escribe (ni crea carpetas ni registra operadores).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseOperators } from "../../../_shared/parse/operators.ts";
import { normalizeEol } from "../../../_shared/parse/positions.ts";
import type { OperatorEntry } from "../../../_shared/types.ts";
import { CliError } from "../cli/errors.ts";
import { OPERATORS_FILE } from "./paths.ts";

/** Cómo se llegó al operador. */
export type OperatorSource = "flag" | "email" | "path";

/**
 * Si la carpeta resuelta es la del correo de git: `own` (coincide), `other` (el correo figura con
 * otra carpeta, o no figura) o `unverified` (no se pudo leer el correo). Las carpetas de otros
 * operadores son de solo lectura (Reglas, «Trabajo en paralelo»): los comandos que escriben
 * deciden qué hacer con `other` y `unverified`.
 */
export type Ownership = "own" | "other" | "unverified";

export interface ResolvedOperator {
  folder: string;
  source: OperatorSource;
  /** Correo de git usado (o `null` si no se pudo leer). */
  email: string | null;
  ownership: Ownership;
  /** `true` solo para un operador «solo team-backlog» admitido con `allowFolderless`: no tiene carpeta propia. */
  folderless?: boolean;
}

export interface OperatorsInfo {
  entries: OperatorEntry[];
  /** Líneas de operators.md que no se pudieron leer (se avisan, no se ignoran). */
  unreadable: string[];
}

export interface OperatorOptions {
  /** `--operator`: gana sobre el correo. */
  operator?: string;
  /** Carpeta de operador pasada directamente como `--agents`. */
  direct?: string;
  /** Correo a buscar (`null` = no disponible); lo lee quien llama de `git config user.email`. */
  email: string | null;
  /**
   * Admitir al operador «solo team-backlog» (sin carpeta): se resuelve con `folderless: true` en vez
   * de fallar, para los comandos que solo escriben en el `team-backlog.md` compartido.
   */
  allowFolderless?: boolean;
}

/** Lee y parsea `operators.md` de la raíz de agentes. */
export function readOperators(agentsRoot: string): OperatorsInfo {
  const path = join(agentsRoot, OPERATORS_FILE);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (caught) {
    throw new CliError(`No se pudo leer ${path}: ${(caught as Error).message}`);
  }
  const parsed = parseOperators(normalizeEol(raw).text);
  return { entries: parsed.operators, unreadable: parsed.unreadable };
}

/**
 * Carpeta del operador dentro de `agentsRoot`.
 * @throws CliError correo ausente, no registrado, «solo team-backlog», carpeta inexistente o sin
 *   `handoff.md`, o `--operator` desconocido; el mensaje dice qué falta y qué opciones hay.
 */
export function resolveOperator(agentsRoot: string, info: OperatorsInfo, options: OperatorOptions): ResolvedOperator {
  const withFolder = info.entries.filter((entry) => !entry.folderless);
  const choices = withFolder.length ? ` Operadores con carpeta: ${withFolder.map((e) => e.folder).join(", ")}.` : "";
  const unreadable = info.unreadable.length ? ` (líneas de ${OPERATORS_FILE} sin leer: ${info.unreadable.join("; ")})` : "";
  const fail = (message: string): never => {
    throw new CliError(message + choices + unreadable);
  };

  if (!info.entries.length) fail(`${OPERATORS_FILE} no tiene operadores legibles en ${agentsRoot}.`);

  const email = options.email;
  const mine = email ? info.entries.find((entry) => entry.emails.includes(email.toLowerCase())) : undefined;
  const ownFolder = mine && !mine.folderless ? mine.folder : null;
  const ownershipOf = (folder: string): Ownership =>
    !email ? "unverified" : ownFolder?.toLowerCase() === folder.toLowerCase() ? "own" : "other";

  const folderlessOperator = (entry: OperatorEntry, source: OperatorSource): ResolvedOperator => ({
    folder: entry.folder,
    source,
    email,
    ownership: !email ? "unverified" : entry.emails.includes(email.toLowerCase()) ? "own" : "other",
    folderless: true,
  });

  const pick = (entry: OperatorEntry, source: OperatorSource): ResolvedOperator => {
    if (!existsSync(join(agentsRoot, entry.folder, "handoff.md"))) {
      fail(`La carpeta «${entry.folder}» figura en ${OPERATORS_FILE} pero no existe o no tiene handoff.md en ${agentsRoot}.`);
    }
    return { folder: entry.folder, source, email, ownership: ownershipOf(entry.folder) };
  };

  const wanted = options.operator ?? options.direct;
  if (wanted) {
    const source: OperatorSource = options.operator ? "flag" : "path";
    const entry = info.entries.find((candidate) => candidate.folder.toLowerCase() === wanted.toLowerCase());
    if (!entry) {
      const onDisk = existsSync(join(agentsRoot, wanted, "handoff.md"))
        ? ` La carpeta existe pero no está registrada en ${OPERATORS_FILE}.`
        : "";
      return fail(`«${wanted}» no figura en ${OPERATORS_FILE}.${onDisk}`);
    }
    if (entry.folderless) {
      if (options.allowFolderless) return folderlessOperator(entry, source);
      return fail(`«${entry.folder}» figura como «solo team-backlog»: no tiene carpeta propia.`);
    }
    return pick(entry, source);
  }

  if (!email) {
    return fail("No se pudo leer `git config user.email` para saber qué operador corresponde; indica uno con --operator <carpeta>.");
  }
  if (!mine) return fail(`${email} no figura en ${OPERATORS_FILE}; indica uno con --operator <carpeta> o regístralo primero.`);
  if (mine.folderless && options.allowFolderless) return folderlessOperator(mine, "email");
  if (mine.folderless) {
    return fail(
      `${email} figura como «solo team-backlog» («${mine.folder}»): no tiene carpeta propia, así que no hay handoff, backlog ni history que editar.`,
    );
  }
  return pick(mine, "email");
}
