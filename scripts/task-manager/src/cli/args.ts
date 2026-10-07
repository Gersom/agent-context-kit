// Línea de comandos: el comando es el primer argumento que no es un flag, los flags (globales y del
// comando) se interpretan con `node:util` `parseArgs` en modo estricto y un flag de texto con valor
// `-` lee su contenido de la entrada estándar (para textos largos: `--detalles -`).

import { parseArgs } from "node:util";
import { UsageError } from "./errors.ts";
import type { FlagSpec, FlagValue } from "./types.ts";

/** Flags que valen para todos los comandos. */
export const GLOBAL_FLAGS: Record<string, FlagSpec> = {
  agents: {
    type: "string",
    valueName: "ruta",
    description: "Raíz del proyecto, carpeta de agentes (docs/agents) o carpeta de un operador. Por defecto, el repo actual.",
  },
  operator: {
    type: "string",
    valueName: "carpeta",
    description: "Carpeta del operador (modo multi-operador). Por defecto, el que corresponde a `git config user.email`.",
  },
  "dry-run": { type: "boolean", description: "Muestra el diff de lo que se escribiría, sin escribir nada." },
  help: { type: "boolean", short: "h", description: "Muestra esta ayuda (o la del comando)." },
};

/** Flags globales que llevan un valor en el argumento siguiente (para no confundir el valor con el comando). */
const GLOBAL_VALUE_FLAGS = Object.entries(GLOBAL_FLAGS)
  .filter(([, spec]) => spec.type === "string")
  .map(([name]) => `--${name}`);

export interface SplitCommandLine {
  /** El comando (primer argumento que no es un flag ni el valor de un flag global), o `null` si no hay. */
  name: string | null;
  /** El resto de los argumentos, en el mismo orden, sin el comando. */
  rest: string[];
}

/**
 * Separa el nombre del comando del resto. Los flags globales pueden ir antes o después del
 * comando; los flags de un comando, solo después de su nombre.
 */
export function splitCommandLine(argv: string[]): SplitCommandLine {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") break;
    if (GLOBAL_VALUE_FLAGS.includes(arg)) {
      i++; // su valor
      continue;
    }
    if (arg.startsWith("-")) continue;
    return { name: arg, rest: [...argv.slice(0, i), ...argv.slice(i + 1)] };
  }
  return { name: null, rest: argv };
}

export interface ParsedFlags {
  values: Record<string, FlagValue>;
  positionals: string[];
}

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
        : `El valor de ${name ?? "un flag"} es ambiguo: si empieza con «-», escríbelo como ${name ?? "--flag"}=<valor> (o usa «-» para leerlo de la entrada estándar).`;
    default:
      return err.message ?? "Argumentos inválidos.";
  }
}

/**
 * Interpreta los flags y los argumentos posicionales de `argv` (sin el nombre del comando).
 * @param spec flags del comando más los globales
 * @throws UsageError flag desconocido o sin valor
 */
export function parseFlags(argv: string[], spec: Record<string, FlagSpec>): ParsedFlags {
  const options = Object.fromEntries(
    Object.entries(spec).map(([name, flag]) => [name, { type: flag.type, ...(flag.short ? { short: flag.short } : {}) }]),
  );
  try {
    const { values, positionals } = parseArgs({ args: argv, options, allowPositionals: true, strict: true });
    return { values: values as Record<string, FlagValue>, positionals };
  } catch (caught) {
    throw new UsageError(usageMessage(caught));
  }
}

/**
 * Reemplaza por el texto de la entrada estándar el valor `-` de los flags que lo admiten
 * (`stdin: true`). El texto se normaliza a LF y se le quita un salto de línea final (el que deja
 * un heredoc o `echo`). La entrada se lee una sola vez: dos flags con `-` es un error de uso.
 * @throws UsageError más de un flag con `-`
 */
export async function resolveStdinFlags(
  values: Record<string, FlagValue>,
  spec: Record<string, FlagSpec>,
  readStdin: () => Promise<string>,
): Promise<Record<string, FlagValue>> {
  const wanting = Object.keys(values).filter((name) => spec[name]?.stdin && values[name] === "-");
  if (!wanting.length) return values;
  if (wanting.length > 1) {
    throw new UsageError(`Solo un flag puede leer la entrada estándar (-), y hay ${wanting.length}: ${wanting.map((n) => `--${n}`).join(", ")}.`);
  }
  const text = (await readStdin()).replace(/\r\n?/g, "\n").replace(/\n$/, "");
  return { ...values, [wanting[0]]: text };
}
