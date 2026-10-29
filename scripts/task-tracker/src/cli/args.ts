// Argumentos de la línea de comandos: la ruta a vigilar (opcional; sin ella, el proyecto de la
// carpeta actual), el operador cuyo panel abrir de frente en modo multi-operador (segundo
// argumento, solo si hay ruta) y `--once`. Las opciones de pantalla (compacto, flechas, modo
// observador) no tienen flag: salen de lo guardado en `settings.json` o del defecto
// (`resolveOptions`). Cualquier otro `--algo` es un error de uso (`error`; `main` sale con 2): los
// flags quitados dicen qué usar ahora y los demás, que son desconocidos.

import type { BoardSettings } from "../io/settings.ts";

export interface CliArgs {
  once: boolean;
  pathArg: string | undefined;
  operator: string | undefined;
  /** Mensaje de uso si hay un `--flag` que no es `--once` (o `--help`); sin él, los argumentos valen. */
  error?: string;
}

const KEYS_HINT = "usa las teclas c / f; se recuerdan en settings.json";
const FOLLOW_HINT = "usa la tecla o; se recuerda en settings.json";

/** Qué hacer en lugar de cada flag que el board ya no tiene. */
const REMOVED_FLAGS: Record<string, string> = {
  "--operator": "pásalo como segundo argumento tras la ruta: acsuite board <ruta> <operador>",
  "--compact": KEYS_HINT,
  "--no-compact": KEYS_HINT,
  "--arrows": KEYS_HINT,
  "--no-arrows": KEYS_HINT,
  "--follow": FOLLOW_HINT,
  "--no-follow": FOLLOW_HINT,
};

function flagError(arg: string): string {
  const name = arg.split("=")[0]!;
  const hint = REMOVED_FLAGS[name];
  return hint ? `Ya no existe el flag ${name} del board: ${hint}` : `Flag desconocido: ${name}. Mira acsuite board --help.`;
}

/** @param argv argumentos sin `bun` ni el script (`process.argv.slice(2)`) */
export function parseArgs(argv: string[]): CliArgs {
  const positional = argv.filter((arg) => !arg.startsWith("--"));
  const badFlag = argv.find((arg) => arg.startsWith("--") && arg !== "--once" && arg !== "--help");
  return {
    once: argv.includes("--once"),
    pathArg: positional[0],
    operator: positional[1] || undefined,
    ...(badFlag != null && { error: flagError(badFlag) }),
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
