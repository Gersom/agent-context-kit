// `acsuite init`: agrega a `rules.md` del proyecto (el compartido, en la carpeta de agentes) la sección
// que enseña al agente a usar la suite. Solo toca ese archivo y solo el bloque delimitado por sus
// marcas; sin `--apply` muestra el diff. Reutiliza la escritura del gestor de tareas (diff, escritura
// atómica y detección de cambios concurrentes).

import { join } from "node:path";
import { RulesBlockError, upsertSuiteBlock } from "../_shared/rules-block.ts";
import { GLOBAL_FLAGS, parseFlags } from "../task-manager/src/cli/args.ts";
import { APPLY_NOTICE, consoleIo } from "../task-manager/src/cli/dispatch.ts";
import { CliError, UsageError } from "../task-manager/src/cli/errors.ts";
import type { Io } from "../task-manager/src/cli/types.ts";
import { commitChanges, planChanges } from "../task-manager/src/edit/changes.ts";
import type { Edit } from "../task-manager/src/edit/edits.ts";
import { readDoc } from "../task-manager/src/workspace/docs.ts";
import { invocationDir, locateAgents } from "../task-manager/src/workspace/paths.ts";

export interface InitOptions {
  io?: Io;
  /** Contra qué se resuelven las rutas relativas y dónde está el repo por defecto (por defecto, desde donde se lanzó). */
  baseDir?: string;
}

/** Los flags de `init`: solo los globales que aplican (no tiene operador). */
const FLAGS = {
  agents: GLOBAL_FLAGS.agents,
  apply: GLOBAL_FLAGS.apply,
  "dry-run": GLOBAL_FLAGS["dry-run"],
  help: GLOBAL_FLAGS.help,
};

/** Ayuda: uso, flags y códigos de salida. */
export const HELP: string[] = [
  "Agrega a rules.md del proyecto la sección que enseña al agente a usar la suite (`acsuite task`,",
  "`acsuite check` y `acsuite board`). La pone al inicio de rules.md, después del título y entre sus marcas;",
  "si ya está, solo la actualiza cuando cambió, donde esté. No toca las reglas fijas ni ningún otro archivo.",
  "",
  "Uso: acsuite init [--agents <ruta>] [--apply] [--dry-run]",
  "",
  "  --agents <ruta>  Raíz del proyecto o su carpeta de agentes (docs/agents). Por defecto, el repo actual.",
  "  --apply          Escribe el cambio. Sin --apply solo muestra el diff y avisa que no escribió nada.",
  "  --dry-run        Muestra el diff sin escribir nada (gana sobre --apply).",
  "  -h, --help       Muestra esta ayuda.",
  "",
  "En modo multi-operador, rules.md es de todos los operadores: el cambio se aplica a todo el proyecto.",
  "Código de salida: 0 bien (también si ya está al día); 1 error; 2 mal uso.",
];

/** Edición mínima que lleva `before` a `after` (todo lo común al principio y al final queda intacto). */
function minimalEdit(before: string, after: string): Edit {
  const max = Math.min(before.length, after.length);
  let prefix = 0;
  while (prefix < max && before[prefix] === after[prefix]) prefix++;
  let suffix = 0;
  while (suffix < max - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++;
  return { start: prefix, end: before.length - suffix, text: after.slice(prefix, after.length - suffix) };
}

const ACTION_DONE = { inserted: "agregó la sección de la suite", updated: "actualizó la sección de la suite" } as const;

/**
 * Ejecuta `acsuite init`.
 * @param argv argumentos sin el subcomando
 * @returns código de salida: 0 bien (también si ya estaba al día), 1 error, 2 mal uso
 */
export async function init(argv: string[], options: InitOptions = {}): Promise<number> {
  const io = options.io ?? consoleIo;
  try {
    return run(argv, io, options.baseDir ?? invocationDir());
  } catch (caught) {
    if (caught instanceof CliError) {
      io.err(`Error: ${caught.message}`);
      if (caught instanceof UsageError) io.err("Usa `acsuite init --help` para ver el uso.");
      return caught.exitCode;
    }
    io.err(`Error inesperado: ${(caught as Error)?.stack ?? caught}`);
    return 1;
  }
}

function run(argv: string[], io: Io, baseDir: string): number {
  const { values, positionals } = parseFlags(argv, FLAGS);
  if (values.help === true) {
    HELP.forEach((line) => io.out(line));
    return 0;
  }
  if (positionals.length) throw new UsageError(`Sobran argumentos: ${positionals.join(" ")}. Para otra carpeta usa --agents <ruta>.`);
  const apply = values.apply === true;
  const dryRun = values["dry-run"] === true;

  const located = locateAgents(typeof values.agents === "string" ? values.agents : undefined, baseDir);
  const agentsRoot = located.mode === "flat" ? located.agentsDir : located.agentsRoot;
  const rules = readDoc("rules", join(agentsRoot, "rules.md"), () => null);
  if (!rules.exists) {
    throw new CliError(`Falta rules.md en ${agentsRoot}; este comando no lo crea. Si la documentación está en otra carpeta, indícala con --agents <ruta>.`);
  }

  let result: ReturnType<typeof upsertSuiteBlock>;
  try {
    result = upsertSuiteBlock(rules.text);
  } catch (caught) {
    if (caught instanceof RulesBlockError) throw new CliError(`${caught.message} No se escribió nada.`);
    throw caught;
  }
  if (result.action === "unchanged") {
    io.out("Ya está al día: no hay cambios.");
    return 0;
  }

  if (located.mode === "multi") io.out("rules.md es de todos los operadores: este cambio se aplicará a todo el proyecto.");
  const preview = !apply && !dryRun;
  const planned = planChanges([{ doc: rules, edits: [minimalEdit(rules.text, result.text)] }]);
  commitChanges(planned, { dryRun: dryRun || preview, io, notice: preview ? APPLY_NOTICE : undefined });
  if (!dryRun && apply) io.out(`Listo: se ${ACTION_DONE[result.action]} en ${rules.path}.`);
  return 0;
}
