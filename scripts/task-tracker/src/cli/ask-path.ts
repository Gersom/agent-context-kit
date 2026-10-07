// Pregunta interactiva de la ruta a vigilar, elección del operador en modo multi-operador, y
// cómo se informan las rutas inválidas.

import { resolveAgentsDir } from "../io/paths.ts";
import type { ResolveError, ResolveOk, ResolveResult } from "../shared/types.ts";

/**
 * Pregunta la ruta hasta que sea válida. El `prompt()` de Bun devuelve null tanto para una
 * línea vacía como para el fin de la entrada: en una terminal se vuelve a preguntar (se sale
 * con Ctrl+C); con entrada redirigida, varias respuestas null seguidas se toman como EOF.
 * @param operator carpeta del operador indicada con `--operator`, si la hubo
 */
export function askForPath(operator?: string): ResolveOk {
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
    const result = resolveAgentsDir(answer, undefined, { operator });
    if (result.ok) return result;
    const chosen = chooseOperator(result, (folder) => resolveAgentsDir(answer, undefined, { operator: folder }));
    if (chosen) return chosen;
    printResolveError(result);
  }
}

/**
 * Cuando el operador no se pudo resolver solo (modo multi-operador), deja elegir su carpeta de
 * la lista. Devuelve `null` si no hay entre qué elegir o la entrada no es una terminal.
 * @param resolveWith vuelve a resolver la ruta con la carpeta elegida
 */
export function chooseOperator(error: ResolveError, resolveWith: (folder: string) => ResolveResult): ResolveOk | null {
  const choices = error.operatorChoices;
  if (!choices?.length || !process.stdin.isTTY) return null;
  console.error(error.error);
  choices.forEach((folder, i) => console.error(`  ${i + 1}. ${folder}`));
  for (;;) {
    const answer = prompt("Operador a vigilar (número o nombre):")?.trim();
    if (!answer) continue;
    const picked = choices[Number(answer) - 1] ?? choices.find((folder) => folder.toLowerCase() === answer.toLowerCase());
    if (!picked) {
      console.error("No es una opción de la lista.");
      continue;
    }
    const result = resolveWith(picked);
    if (result.ok) return result;
    printResolveError(result);
  }
}

export function printResolveError({ error, tried }: ResolveError): void {
  console.error(error);
  for (const dir of tried) console.error(`  - ${dir}`);
}
