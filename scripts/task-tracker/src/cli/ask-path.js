// Pregunta interactiva de la ruta a vigilar, y cómo se informan las rutas inválidas.

import { resolveAgentsDir } from "../io/paths.js";

/**
 * Pregunta la ruta hasta que sea válida. El `prompt()` de Bun devuelve null tanto para una
 * línea vacía como para el fin de la entrada: en una terminal se vuelve a preguntar (se sale
 * con Ctrl+C); con entrada redirigida, varias respuestas null seguidas se toman como EOF.
 */
export function askForPath() {
  let emptyAnswers = 0;
  for (;;) {
    const answer = prompt("Ruta del proyecto o de su carpeta docs/agents a vigilar:");
    if (answer == null || !answer.trim()) {
      if (!process.stdin.isTTY && ++emptyAnswers >= 3) {
        console.error("\nNo se recibió ninguna ruta. Saliendo.");
        process.exit(1);
      }
      continue;
    }
    emptyAnswers = 0;
    const result = resolveAgentsDir(answer);
    if (result.ok) return result;
    printResolveError(result);
  }
}

export function printResolveError({ error, tried }) {
  console.error(error);
  for (const dir of tried) console.error(`  - ${dir}`);
}
