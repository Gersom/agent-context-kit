// Línea de comandos: `bun run check <ruta> [--operator <carpeta>] [--json] [--strict]`. Se interpreta
// con `node:util` `parseArgs` en modo estricto; un flag desconocido o sin valor es un error de uso (2).

import { parseArgs } from "node:util";
import { UsageError } from "../../task-manager/src/cli/errors.ts";

export interface CheckArgs {
  /** Raíz del proyecto, carpeta de agentes o carpeta de un operador; `null` solo con `help`. */
  path: string | null;
  operator: string | undefined;
  json: boolean;
  strict: boolean;
  help: boolean;
}

/** Ayuda: uso, flags y códigos de salida. */
export const HELP: string[] = [
  "Verifica que la documentación de agentes de OTRO proyecto cumpla lo que necesitan el skill, el",
  "seguimiento de tareas (`bun run tasks`) y el gestor de tareas (`bun run task`). Solo lee: no escribe nada.",
  "",
  "Uso: bun run check <ruta> [--operator <carpeta>] [--json] [--strict]",
  "",
  "  <ruta>                Raíz del proyecto, carpeta de agentes (docs/agents) o carpeta de un operador.",
  "  --operator <carpeta>  Carpeta del operador (modo multi-operador). Por defecto, el de `git config user.email`.",
  "  --json                Imprime el informe como un único objeto JSON (y nada más) por la salida estándar.",
  "  --strict              Los avisos también hacen fallar (código 1).",
  "  -h, --help            Muestra esta ayuda.",
  "",
  "Código de salida: 0 sin errores; 1 con errores (con --strict, también con avisos); 2 mal uso.",
];

const OPTIONS = {
  operator: { type: "string" },
  json: { type: "boolean" },
  strict: { type: "boolean" },
  help: { type: "boolean", short: "h" },
} as const;

/** Traduce un error de `parseArgs` a un mensaje de uso en español. */
function usageMessage(caught: unknown): string {
  const err = caught as { code?: string; message?: string };
  const name = err.message?.match(/'(--?[\w-]+)/)?.[1];
  switch (err.code) {
    case "ERR_PARSE_ARGS_UNKNOWN_OPTION":
      return `Flag desconocido: ${name ?? "(?)"}.`;
    case "ERR_PARSE_ARGS_INVALID_OPTION_VALUE":
      return name?.length && /argument missing/.test(err.message ?? "")
        ? `Falta el valor de ${name}.`
        : `El valor de ${name ?? "un flag"} es ambiguo: si empieza con «-», escríbelo como ${name ?? "--flag"}=<valor>.`;
    default:
      return err.message ?? "Argumentos inválidos.";
  }
}

/**
 * @param argv argumentos sin `bun` ni el script (`process.argv.slice(2)`)
 * @throws UsageError flag desconocido o sin valor, falta la ruta o sobran argumentos
 */
export function parseCheckArgs(argv: string[]): CheckArgs {
  const { values, positionals } = (() => {
    try {
      return parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
    } catch (caught) {
      throw new UsageError(usageMessage(caught));
    }
  })();
  const help = values.help === true;
  if (!help && positionals.length === 0) throw new UsageError("Falta la ruta del proyecto a verificar.");
  if (positionals.length > 1) throw new UsageError(`Sobran argumentos: ${positionals.slice(1).join(" ")}. Pasa una sola ruta.`);
  return {
    path: positionals[0] ?? null,
    operator: values.operator,
    json: values.json === true,
    strict: values.strict === true,
    help,
  };
}
