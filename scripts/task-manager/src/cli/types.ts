// Contrato de los comandos: lo único que tiene que conocer un módulo de `src/commands/` para
// registrarse en el despachador (`cli/dispatch.ts`).

import type { ChangeResult, FileChange } from "../edit/changes.ts";
import type { Docs } from "../workspace/docs.ts";
import type { Workspace } from "../workspace/workspace.ts";

/** Salida del script, inyectable para probarlo sin tocar la terminal. */
export interface Io {
  /** Una línea a la salida estándar (agrega el salto de línea). */
  out(line?: string): void;
  /** Una línea a la salida de error. */
  err(line?: string): void;
}

/** Un flag propio de un comando (`--nombre`). */
export interface FlagSpec {
  type: "string" | "boolean";
  description: string;
  /** Cómo se llama el valor en la ayuda (`ruta` → `--flag <ruta>`); por defecto `valor`. */
  valueName?: string;
  /** Alias de una letra (`-n`). */
  short?: string;
  /** Solo `string`: el valor `-` lee el texto de la entrada estándar (para textos largos). */
  stdin?: boolean;
}

/** Valor de un flag ya interpretado: texto (con el stdin ya leído), booleano o ausente. */
export type FlagValue = string | boolean | undefined;

export interface CommandContext {
  /** Argumentos posicionales (sin el nombre del comando). */
  args: string[];
  /** Flags propios del comando, ya interpretados. */
  flags: Record<string, FlagValue>;
  /** Flags globales (valen para todos los comandos). */
  global: { dryRun: boolean };
  io: Io;
  /** Operador y carpeta resueltos. Lanza `CliError` si no se pueden resolver; no escribe nada. */
  workspace(): Workspace;
  /** Lee y parsea los archivos del operador (una vez; después devuelve lo mismo). */
  docs(): Docs;
  /**
   * Aplica ediciones a uno o más archivos: calcula todo, verifica que sigan legibles y recién
   * entonces escribe (o, con `--dry-run`, muestra el diff sin escribir). Todo o nada a nivel de
   * cálculo: si una edición es inválida no se escribe ningún archivo.
   */
  commit(changes: FileChange[]): ChangeResult;
}

/** Un comando de `bun run task <nombre>`. Se registra en `commands/index.ts`. */
export interface Command {
  /** Lo que se escribe tras `bun run task`, en minúsculas. */
  name: string;
  /** Una línea para el listado de la ayuda. */
  summary: string;
  /** Forma de uso para `bun run task <nombre> --help`, ej. `show <N>`. */
  usage: string;
  flags?: Record<string, FlagSpec>;
  /** Devuelve el código de salida (por defecto 0). Los errores esperables se lanzan como `CliError`. */
  run(ctx: CommandContext): number | void | Promise<number | void>;
}
