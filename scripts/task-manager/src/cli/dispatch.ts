// Despachador: `bun run task <comando> [argumentos] [flags]`. Busca el comando en el registro,
// interpreta los flags (globales y propios), arma el contexto (operador, archivos y escritura
// perezosos: solo se resuelven si el comando los pide) y devuelve el código de salida. Los errores
// esperables (`CliError`) salen como un mensaje en español, sin stack.

import { COMMANDS } from "../commands/index.ts";
import { commitChanges, planChanges } from "../edit/changes.ts";
import { type Docs, readDocs } from "../workspace/docs.ts";
import { resolveWorkspace, type Workspace } from "../workspace/workspace.ts";
import { GLOBAL_FLAGS, parseFlags, resolveStdinFlags, splitCommandLine } from "./args.ts";
import { CliError, UsageError } from "./errors.ts";
import { renderCommandHelp, renderHelp } from "./help.ts";
import type { Command, CommandContext, Io } from "./types.ts";

export interface RunOptions {
  /** Registro de comandos; por defecto, el de `commands/index.ts`. */
  commands?: Command[];
  io?: Io;
  /** Lee la entrada estándar completa (para los flags con valor `-`). */
  readStdin?: () => Promise<string>;
  /** Contra qué se resuelven las rutas relativas y dónde está el repo por defecto (por defecto, desde donde se lanzó). */
  baseDir?: string;
  /** Correo de git a usar en vez de leer `git config user.email` (`null` = no disponible). */
  email?: string | null;
}

/** Salida por defecto: la terminal. */
export const consoleIo: Io = {
  out: (line = "") => process.stdout.write(`${line}\n`),
  err: (line = "") => process.stderr.write(`${line}\n`),
};

/** Entrada estándar por defecto; sin nada redirigido (terminal interactiva) falla en vez de quedarse esperando. */
async function defaultReadStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    throw new UsageError("El valor `-` lee la entrada estándar, pero no hay nada redirigido: usa `... | bun run task ...` o un heredoc.");
  }
  return Bun.stdin.text();
}

/**
 * Comprueba el registro: nombres únicos y en minúsculas, sin `help` (es del despachador) y sin
 * flags que choquen con los globales. Es un error de programación, no de uso.
 */
export function validateCommands(commands: Command[]): void {
  const names = new Set<string>(["help"]);
  for (const command of commands) {
    if (!/^[a-z][a-z0-9-]*$/.test(command.name)) throw new Error(`Nombre de comando inválido: «${command.name}».`);
    if (names.has(command.name)) throw new Error(`Comando repetido o reservado: «${command.name}».`);
    names.add(command.name);
    for (const [flag, spec] of Object.entries(command.flags ?? {})) {
      if (flag in GLOBAL_FLAGS) throw new Error(`El flag --${flag} del comando «${command.name}» choca con un flag global.`);
      if (spec.stdin && spec.type !== "string") throw new Error(`--${flag} de «${command.name}»: solo un flag de texto puede leer stdin.`);
    }
  }
}

/**
 * Ejecuta una línea de comandos.
 * @param argv argumentos sin `bun` ni el script (`process.argv.slice(2)`)
 * @returns código de salida: 0 bien, 1 error, 2 mal uso de la línea de comandos
 */
export async function run(argv: string[], options: RunOptions = {}): Promise<number> {
  const io = options.io ?? consoleIo;
  try {
    const commands = options.commands ?? COMMANDS;
    validateCommands(commands);
    return await dispatch(argv, commands, { ...options, io });
  } catch (caught) {
    if (caught instanceof CliError) {
      io.err(`Error: ${caught.message}`);
      if (caught instanceof UsageError) io.err("Usa `bun run task --help` para ver los comandos y flags.");
      return caught.exitCode;
    }
    io.err(`Error inesperado: ${(caught as Error)?.stack ?? caught}`);
    return 1;
  }
}

async function dispatch(argv: string[], commands: Command[], options: RunOptions & { io: Io }): Promise<number> {
  const { io } = options;
  const { name, rest } = splitCommandLine(argv);
  const wantsHelp = rest.includes("--help") || rest.includes("-h");

  if (name === null) {
    if (!argv.length || wantsHelp) {
      renderHelp(commands).forEach((line) => io.out(line));
      return 0;
    }
    throw new UsageError("Falta el comando.");
  }

  if (name === "help") {
    const target = rest.find((arg) => !arg.startsWith("-"));
    const command = target ? commands.find((c) => c.name === target) : undefined;
    if (target && !command) throw new UsageError(`Comando desconocido: «${target}».`);
    (command ? renderCommandHelp(command) : renderHelp(commands)).forEach((line) => io.out(line));
    return 0;
  }

  const command = commands.find((c) => c.name === name);
  if (!command) {
    const known = commands.map((c) => c.name).join(", ");
    throw new UsageError(`Comando desconocido: «${name}».${known ? ` Comandos: ${known}.` : ""}`);
  }
  if (wantsHelp) {
    renderCommandHelp(command).forEach((line) => io.out(line));
    return 0;
  }

  const spec = { ...(command.flags ?? {}), ...GLOBAL_FLAGS };
  const { values, positionals } = parseFlags(rest, spec);
  const flags = await resolveStdinFlags(values, spec, options.readStdin ?? defaultReadStdin);

  let workspace: Workspace | undefined;
  let docs: Docs | undefined;
  const ctx: CommandContext = {
    args: positionals,
    flags: Object.fromEntries(Object.entries(flags).filter(([flag]) => !(flag in GLOBAL_FLAGS))),
    global: { dryRun: flags["dry-run"] === true },
    io,
    workspace: () =>
      (workspace ??= resolveWorkspace({
        agents: typeof flags.agents === "string" ? flags.agents : undefined,
        operator: typeof flags.operator === "string" ? flags.operator : undefined,
        baseDir: options.baseDir,
        email: options.email,
      })),
    docs: () => (docs ??= readDocs(ctx.workspace())),
    commit: (changes) => commitChanges(planChanges(changes), { dryRun: flags["dry-run"] === true, io }),
  };

  const code = await command.run(ctx);
  return code ?? 0;
}
