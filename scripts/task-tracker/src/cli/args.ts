// Argumentos de la línea de comandos: la ruta a vigilar (opcional), el operador cuyo panel abrir
// de frente en modo multi-operador (segundo argumento, o `--operator <carpeta>` /
// `--operator=<carpeta>`), `--once` y, para arrancar con la pantalla ya ajustada, `--compact`
// (una sola tarea por recuadro) y `--no-arrows` (sin flechas del flujo).

export interface CliArgs {
  once: boolean;
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
    pathArg: positional[0],
    operator: operator || positional[1] || undefined,
    compact: argv.includes("--compact"),
    arrows: !argv.includes("--no-arrows"),
  };
}
