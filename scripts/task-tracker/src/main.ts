// Arranque del seguimiento de tareas: interpreta los argumentos, resuelve el proyecto a vigilar
// y lanza la aplicación. Lo llaman `index.ts` y el despachador `acsuite`.

import { startApp } from "./app.ts";
import { parseArgs } from "./cli/args.ts";
import { askForPath, printResolveError } from "./cli/ask-path.ts";
import { resolveAgentsDir } from "./io/paths.ts";
import type { ResolveOk } from "./shared/types.ts";

export function main(argv: string[]): void {
  const { once, pathArg, operator, compact, arrows } = parseArgs(argv);

  const target = pathArg != null ? resolveFromArg(pathArg, operator) : askForPath(operator);
  const { agentsDir, projectName, projectDir, multi } = target;

  startApp({ agentsDir, projectName, projectDir, multi, compact, arrows, once });
}

/** Ruta pasada por argumento: si no es válida, se informa y se sale con código 1. */
function resolveFromArg(input: string, operatorArg: string | undefined): ResolveOk {
  const result = resolveAgentsDir(input, undefined, { operator: operatorArg });
  if (result.ok) return result;
  printResolveError(result);
  process.exit(1);
}
