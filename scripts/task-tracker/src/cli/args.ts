// Argumentos de la línea de comandos: la ruta a vigilar (opcional; sin ella, el proyecto de la
// carpeta actual), el operador cuyo panel abrir de frente en modo multi-operador (segundo
// argumento, solo si hay ruta; o `--operator <carpeta>` / `--operator=<carpeta>`, con o sin
// ruta), `--once` y, para arrancar con la pantalla ya ajustada, `--compact`
// (una sola tarea por recuadro) y `--no-arrows` (sin flechas del flujo). `--follow` activa el
// modo observador: espera el proyecto que marque el mod de Claude y lo abre.

export interface CliArgs {
  once: boolean;
  follow: boolean;
  pathArg: string | undefined;
  operator: string | undefined;
  compact: boolean;
  arrows: boolean;
}

/** @param argv argumentos sin `bun` ni el script (`process.argv.slice(2)`) */
export function parseArgs(argv: string[]): CliArgs {
  const positional: string[] = [];
  let operator: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--operator") operator = argv[++i];
    else if (arg.startsWith("--operator=")) operator = arg.slice("--operator=".length);
    else if (!arg.startsWith("--")) positional.push(arg);
  }
  return {
    once: argv.includes("--once"),
    follow: argv.includes("--follow"),
    pathArg: positional[0],
    operator: operator || positional[1] || undefined,
    compact: argv.includes("--compact"),
    arrows: !argv.includes("--no-arrows"),
  };
}
