// Argumentos de la línea de comandos: la ruta a vigilar (opcional; sin ella, el proyecto de la
// carpeta actual), el operador cuyo panel abrir de frente en modo multi-operador (segundo
// argumento, solo si hay ruta) y `--once`. Las opciones de pantalla (compacto, flechas, modo
// observador) no tienen flag: salen de lo guardado en `settings.json` o del defecto
// (`resolveOptions`). Un `--algo` desconocido se ignora.

import type { BoardSettings } from "../io/settings.ts";

export interface CliArgs {
  once: boolean;
  pathArg: string | undefined;
  operator: string | undefined;
}

/** @param argv argumentos sin `bun` ni el script (`process.argv.slice(2)`) */
export function parseArgs(argv: string[]): CliArgs {
  const positional = argv.filter((arg) => !arg.startsWith("--"));
  return {
    once: argv.includes("--once"),
    pathArg: positional[0],
    operator: positional[1] || undefined,
  };
}

/** Los valores por defecto de las opciones del board, cuando no hay nada guardado. */
export const DEFAULT_OPTIONS: BoardSettings = { compact: false, arrows: true, follow: false };

/**
 * Las opciones con las que arranca el board: cada una es lo guardado en `settings.json` o, si no
 * hay, el defecto. Excepción: `follow` guardado solo vale sin ruta y sin `--once` (con una ruta o
 * con `--once` se pide otra cosa que esperar una marca).
 */
export function resolveOptions({ saved, hasPath, once }: { saved: Partial<BoardSettings>; hasPath: boolean; once: boolean }): BoardSettings {
  const savedFollow = !hasPath && !once ? saved.follow : undefined;
  return {
    compact: saved.compact ?? DEFAULT_OPTIONS.compact,
    arrows: saved.arrows ?? DEFAULT_OPTIONS.arrows,
    follow: savedFollow ?? DEFAULT_OPTIONS.follow,
  };
}
