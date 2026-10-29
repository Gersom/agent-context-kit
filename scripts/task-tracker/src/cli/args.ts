// Argumentos de la línea de comandos: la ruta a vigilar (opcional; sin ella, el proyecto de la
// carpeta actual), el operador cuyo panel abrir de frente en modo multi-operador (segundo
// argumento, solo si hay ruta; o `--operator <carpeta>` / `--operator=<carpeta>`, con o sin
// ruta), `--once` y, para arrancar con la pantalla ya ajustada, los pares `--compact` /
// `--no-compact` (una sola tarea por recuadro), `--arrows` / `--no-arrows` (flechas del flujo) y
// `--follow` / `--no-follow` (modo observador: espera el proyecto que marque el mod de Claude y lo
// abre). Un flag que no se pasó queda `undefined`: lo decide `resolveOptions` (lo guardado en
// `settings.json` o el defecto). Si se pasan los dos de un par, gana el último de la línea.

import type { BoardSettings } from "../io/settings.ts";

export interface CliArgs {
  once: boolean;
  /** `undefined`: no se pasó `--follow` ni `--no-follow`. */
  follow: boolean | undefined;
  pathArg: string | undefined;
  operator: string | undefined;
  /** `undefined`: no se pasó `--compact` ni `--no-compact`. */
  compact: boolean | undefined;
  /** `undefined`: no se pasó `--arrows` ni `--no-arrows`. */
  arrows: boolean | undefined;
}

/** Los pares de flags de un booleano: `--<nombre>` lo activa y `--no-<nombre>` lo apaga. */
const TOGGLES = ["compact", "arrows", "follow"] as const;

/** @param argv argumentos sin `bun` ni el script (`process.argv.slice(2)`) */
export function parseArgs(argv: string[]): CliArgs {
  const positional: string[] = [];
  let operator: string | undefined;
  const toggles: Partial<Record<(typeof TOGGLES)[number], boolean>> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--operator") operator = argv[++i];
    else if (arg.startsWith("--operator=")) operator = arg.slice("--operator=".length);
    else if (!arg.startsWith("--")) positional.push(arg);
    else {
      for (const name of TOGGLES) {
        if (arg === `--${name}`) toggles[name] = true;
        else if (arg === `--no-${name}`) toggles[name] = false;
      }
    }
  }
  return {
    once: argv.includes("--once"),
    follow: toggles.follow,
    pathArg: positional[0],
    operator: operator || positional[1] || undefined,
    compact: toggles.compact,
    arrows: toggles.arrows,
  };
}

/** Los valores por defecto de las opciones del board, cuando no hay flag ni nada guardado. */
export const DEFAULT_OPTIONS: BoardSettings = { compact: false, arrows: true, follow: false };

/**
 * Las opciones con las que arranca el board: cada una es el flag, si se pasó; si no, lo guardado en
 * `settings.json`; si no, el defecto. Excepción: `follow` guardado solo vale sin ruta y sin `--once`
 * (con una ruta o con `--once` se pide otra cosa que esperar una marca); un `--follow` explícito
 * vale siempre.
 */
export function resolveOptions({ args, saved }: { args: CliArgs; saved: Partial<BoardSettings> }): BoardSettings {
  const savedFollow = args.pathArg == null && !args.once ? saved.follow : undefined;
  return {
    compact: args.compact ?? saved.compact ?? DEFAULT_OPTIONS.compact,
    arrows: args.arrows ?? saved.arrows ?? DEFAULT_OPTIONS.arrows,
    follow: args.follow ?? savedFollow ?? DEFAULT_OPTIONS.follow,
  };
}
