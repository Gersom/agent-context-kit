// Argumentos de la línea de comandos: la ruta a vigilar (opcional), el operador cuyo panel abrir
// de frente en modo multi-operador (segundo argumento, o `--operator <carpeta>` /
// `--operator=<carpeta>`) y `--once`.

/** @param argv argumentos sin `bun` ni el script (`process.argv.slice(2)`) */
export function parseArgs(argv: string[]): { once: boolean; pathArg: string | undefined; operator: string | undefined } {
  const positional: string[] = [];
  let operator: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--operator") operator = argv[++i];
    else if (arg.startsWith("--operator=")) operator = arg.slice("--operator=".length);
    else if (!arg.startsWith("--")) positional.push(arg);
  }
  return { once: argv.includes("--once"), pathArg: positional[0], operator: operator || positional[1] || undefined };
}
