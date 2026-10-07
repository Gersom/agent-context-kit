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
  /** Solo `string`: el flag se puede repetir (`--nueva a --nueva b`) y su valor es la lista de textos. No admite `stdin`. */
  multiple?: boolean;
}

/** Valor de un flag ya interpretado: texto (con el stdin ya leído), lista de textos (flag `multiple`), booleano o ausente. */
export type FlagValue = string | string[] | boolean | undefined;

export interface CommandContext {
  /** Argumentos posicionales (sin el nombre del comando). */
  args: string[];
  /** Flags propios del comando, ya interpretados. */
  flags: Record<string, FlagValue>;
  /** Flags globales (valen para todos los comandos). */
  global: { dryRun: boolean; apply: boolean };
  io: Io;
  /** Operador y carpeta resueltos. Lanza `CliError` si no se pueden resolver; no escribe nada. */
  workspace(request?: WorkspaceRequest): Workspace;
  /** Lee y parsea los archivos del operador (una vez; después devuelve lo mismo). */
  docs(request?: WorkspaceRequest): Docs;
  /** Ahora (inyectable en los tests para fijar la fecha). */
  now(): Date;
  /**
   * Aplica ediciones a uno o más archivos: calcula todo, verifica que sigan legibles y recién
   * entonces escribe. Todo o nada a nivel de cálculo: si una edición es inválida no se escribe
   * ningún archivo.
   *
   * Qué se escribe lo decide el núcleo, no cada comando:
   * - un comando de lectura (`writes` ausente) escribe directamente, salvo con `--dry-run`;
   * - un comando de escritura (`writes: true`) solo escribe con `--apply`: sin él muestra el diff
   *   y avisa que no escribió nada; `--dry-run` gana sobre `--apply`;
   * - un comando de escritura se niega (sin escribir ni mostrar el diff) si algún cambio cae en la
   *   carpeta de otro operador; los cambios del `team-backlog.md`, compartido, no lo exigen.
   *
   * Con `quiet` no imprime el diff ni los avisos (para los comandos con `--json`, que informan ellos).
   */
  commit(changes: FileChange[], options?: { quiet?: boolean }): ChangeResult;
}

/** Cómo resolver el operador para un comando. */
export interface WorkspaceRequest {
  /**
   * Admitir al operador «solo team-backlog» (sin carpeta propia): el espacio resuelto trae su
   * nombre y la ruta del `team-backlog.md`, pero no hay handoff, backlog ni history que editar.
   */
  allowFolderless?: boolean;
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
  /**
   * `true` si el comando escribe archivos: sin `--apply` solo muestra el diff (ver `commit`) y su
   * ayuda lo avisa. Los comandos de lectura no lo ponen.
   */
  writes?: boolean;
  /** Devuelve el código de salida (por defecto 0). Los errores esperables se lanzan como `CliError`. */
  run(ctx: CommandContext): number | void | Promise<number | void>;
}
