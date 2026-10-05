// Argumentos de la línea de comandos: la ruta a vigilar (opcional) y `--once`.

/** @param argv argumentos sin `bun` ni el script (`process.argv.slice(2)`) */
export function parseArgs(argv: string[]): { once: boolean; pathArg: string | undefined } {
  const once = argv.includes("--once");
  const pathArg = argv.find((arg) => !arg.startsWith("--"));
  return { once, pathArg };
}
