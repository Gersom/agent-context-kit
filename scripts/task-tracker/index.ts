// Seguimiento de tareas: vigila docs/agents/ de un proyecto y muestra en la terminal la tarea
// en progreso, las pausadas, las pendientes y las últimas completadas (handoff.md, backlog.md y
// history.md), redibujando en cada cambio. Pensado para correr en una terminal aparte mientras
// un agente trabaja en otra.
//
// Atajos (terminal interactiva): `q` o Ctrl+C salen, `r` redibuja. En modo multi-operador, ↑/↓
// eligen operador en la vista de equipo, Enter abre su panel y `b` o Esc vuelven al equipo.
//
// Uso (desde la raíz de agent-context-kit):
//   bun run tasks                 → pregunta la ruta a vigilar
//   bun run tasks <ruta>          → raíz del proyecto (busca docs/agents/ o agent-context/agents/)
//                                   o la carpeta que contiene handoff.md
//   bun run tasks <ruta> --once   → pinta una sola vez y sale (útil para probar o en CI)
//   bun run tasks <ruta> <operador>
//                                 → en modo multi-operador, abre de frente el panel de ese
//                                   operador (también `--operator <carpeta>`); sin él, la vista
//                                   de equipo con el operador de `git config user.email` elegido
//
// Cada instancia es independiente (sin lockfiles, puertos ni estado compartido): se puede
// correr una por proyecto en paralelo.

import { startApp } from "./src/app.ts";
import { parseArgs } from "./src/cli/args.ts";
import { askForPath, printResolveError } from "./src/cli/ask-path.ts";
import { resolveAgentsDir } from "./src/io/paths.ts";
import type { ResolveOk } from "./src/shared/types.ts";

const { once, pathArg, operator } = parseArgs(process.argv.slice(2));

const target = pathArg != null ? resolveFromArg(pathArg, operator) : askForPath(operator);
const { agentsDir, projectName, projectDir, multi } = target;

startApp({ agentsDir, projectName, projectDir, multi, once });

/** Ruta pasada por argumento: si no es válida, se informa y se sale con código 1. */
function resolveFromArg(input: string, operatorArg: string | undefined): ResolveOk {
  const result = resolveAgentsDir(input, undefined, { operator: operatorArg });
  if (result.ok) return result;
  printResolveError(result);
  process.exit(1);
}
