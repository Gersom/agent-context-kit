// Textos de ayuda: el listado de comandos y la ayuda de uno solo.

import { GLOBAL_FLAGS } from "./args.ts";
import type { Command, FlagSpec } from "./types.ts";

function flagLine(name: string, spec: FlagSpec): [string, string] {
  const value = spec.type === "string" ? (spec.stdin ? ` <${spec.valueName ?? "texto"}|->` : ` <${spec.valueName ?? "valor"}>`) : "";
  const short = spec.short ? `-${spec.short}, ` : "";
  return [`${short}--${name}${value}`, spec.description];
}

/** Alinea pares `[izquierda, derecha]` en dos columnas con sangría de dos espacios. */
function table(rows: Array<[string, string]>): string[] {
  const width = Math.max(0, ...rows.map(([left]) => left.length));
  return rows.map(([left, right]) => `  ${left.padEnd(width)}  ${right}`);
}

/** Ayuda general: uso, comandos registrados y flags globales. */
export function renderHelp(commands: Command[]): string[] {
  return [
    "Gestiona las tareas (handoff.md, backlog.md, history.md y team-backlog.md) con ediciones quirúrgicas.",
    "Es opcional: sin este script, los archivos se editan a mano.",
    "",
    "Uso: bun run task <comando> [argumentos] [flags]",
    "",
    "Comandos:",
    ...table([...commands.map((c): [string, string] => [c.name, c.summary]), ["help [comando]", "Muestra esta ayuda o la de un comando"]]),
    "",
    "Flags globales:",
    ...table(Object.entries(GLOBAL_FLAGS).map(([name, spec]) => flagLine(name, spec))),
    "",
    "Un flag de texto con valor `-` lee su contenido de la entrada estándar (ej. `--detalles -`).",
    "Para más detalle de un comando: bun run task <comando> --help",
  ];
}

/** Ayuda de un comando: uso, descripción y sus flags (más los globales). */
export function renderCommandHelp(command: Command): string[] {
  const own = Object.entries(command.flags ?? {}).map(([name, spec]) => flagLine(name, spec));
  return [
    `Uso: bun run task ${command.usage}`,
    "",
    command.summary,
    ...(own.length ? ["", "Flags del comando:", ...table(own)] : []),
    "",
    "Flags globales:",
    ...table(Object.entries(GLOBAL_FLAGS).map(([name, spec]) => flagLine(name, spec))),
  ];
}
