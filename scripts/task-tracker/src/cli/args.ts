// Argumentos de la línea de comandos: la ruta a vigilar (opcional), `--once` y, en modo
// multi-operador, `--operator <carpeta>` (o `--operator=<carpeta>`).

/** @param argv argumentos sin `bun` ni el script (`process.argv.slice(2)`) */
export function parseArgs(argv: string[]): { once: boolean; pathArg: string | undefined; operator: string | undefined } {
  let pathArg: string | undefined;
  let operator: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--operator") operator = argv[++i];
    else if (arg.startsWith("--operator=")) operator = arg.slice("--operator=".length);
    else if (!arg.startsWith("--")) pathArg ??= arg;
  }
  return { once: argv.includes("--once"), pathArg, operator: operator || undefined };
}
