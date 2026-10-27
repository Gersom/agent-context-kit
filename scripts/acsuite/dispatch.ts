// Despachador de `acsuite <subcomando> [argumentos]`: el primer argumento elige la herramienta de la
// suite y el resto se le pasa tal cual. Un subcomando desconocido o la falta de uno es un error de
// uso (código 2); `--help` o `-h` lista los subcomandos.

import { run as check } from "../docs-check/src/run.ts";
import { run as task } from "../task-manager/src/cli/dispatch.ts";
import { main as board } from "../task-tracker/src/main.ts";

/** Una herramienta de la suite: recibe los argumentos que siguen al subcomando y devuelve el código de salida. */
export type Runner = (argv: string[]) => number | Promise<number>;

/** Los subcomandos de `acsuite`, con la línea que los describe en la ayuda. */
export const SUBCOMMANDS: Record<string, { summary: string; run: Runner }> = {
  board: {
    summary: "Seguimiento de tareas en la terminal (task-tracker)",
    run: (argv) => {
      board(argv);
      return 0;
    },
  },
  task: { summary: "Gestión de tareas: edita handoff, backlog e history (task-manager)", run: task },
  check: { summary: "Verifica la documentación de agentes de un proyecto (docs-check)", run: check },
};

export function helpText(): string {
  const width = Math.max(...Object.keys(SUBCOMMANDS).map((name) => name.length));
  const lines = Object.entries(SUBCOMMANDS).map(([name, { summary }]) => `  ${name.padEnd(width)}  ${summary}`);
  return [
    "Uso: acsuite <subcomando> [argumentos]",
    "",
    "Subcomandos:",
    ...lines,
    "",
    "Para la ayuda de cada uno: acsuite <subcomando> --help",
  ].join("\n");
}

/** Despacha el subcomando y devuelve el código de salida: 0 sin errores, 2 por mal uso. */
export async function dispatch(
  argv: string[],
  subcommands: Record<string, { run: Runner }> = SUBCOMMANDS,
  out: (line: string) => void = console.log,
  err: (line: string) => void = console.error,
): Promise<number> {
  const [name, ...rest] = argv;
  if (name === undefined || name === "--help" || name === "-h" || name === "help") {
    (name === undefined ? err : out)(helpText());
    return name === undefined ? 2 : 0;
  }
  const subcommand = Object.hasOwn(subcommands, name) ? subcommands[name] : undefined;
  if (!subcommand) {
    err(`Subcomando desconocido: «${name}».\n\n${helpText()}`);
    return 2;
  }
  return subcommand.run(rest);
}
