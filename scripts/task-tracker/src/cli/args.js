// Argumentos de la línea de comandos: la ruta a vigilar (opcional) y `--once`.

/**
 * @param {string[]} argv argumentos sin `bun` ni el script (`process.argv.slice(2)`)
 * @returns {{ once: boolean, pathArg: string | undefined }}
 */
export function parseArgs(argv) {
  const once = argv.includes("--once");
  const pathArg = argv.find((arg) => !arg.startsWith("--"));
  return { once, pathArg };
}
