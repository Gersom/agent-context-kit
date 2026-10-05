// Seguimiento de tareas: vigila docs/agents/ de un proyecto y muestra en la terminal la tarea
// en progreso, las pausadas y las pendientes de handoff.md / backlog.md, redibujando en cada
// cambio. Pensado para correr en una terminal aparte mientras un agente trabaja en otra.
//
// Uso (desde la raíz de agent-context-kit):
//   bun run tasks                 → pregunta la ruta a vigilar
//   bun run tasks <ruta>          → raíz del proyecto (busca docs/agents/ o agent-context/agents/)
//                                   o la carpeta que contiene handoff.md
//   bun run tasks <ruta> --once   → pinta una sola vez y sale (útil para probar o en CI)
//
// Cada instancia es independiente (sin lockfiles, puertos ni estado compartido): se puede
// correr una por proyecto en paralelo.

import { startApp } from "./src/app.ts";
import { parseArgs } from "./src/cli/args.ts";
import { askForPath, printResolveError } from "./src/cli/ask-path.ts";
import { resolveAgentsDir } from "./src/io/paths.ts";
import type { ResolveOk } from "./src/shared/types.ts";

const { once, pathArg } = parseArgs(process.argv.slice(2));

const target = pathArg != null ? resolveFromArg(pathArg) : askForPath();
const { agentsDir, projectName } = target;

startApp({ agentsDir, projectName, once });

/** Ruta pasada por argumento: si no es válida, se informa y se sale con código 1. */
function resolveFromArg(input: string): ResolveOk {
  const result = resolveAgentsDir(input);
  if (result.ok) return result;
  printResolveError(result);
  process.exit(1);
}
