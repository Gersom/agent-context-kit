// Arranque del seguimiento de tareas: interpreta los argumentos, resuelve el proyecto a vigilar
// y lanza la aplicación. Lo llaman `index.ts` y el despachador `acsuite`.

import { gitToplevel } from "../../_shared/git.ts";
import { startApp } from "./app.ts";
import { parseArgs } from "./cli/args.ts";
import { printResolveError } from "./cli/resolve-error.ts";
import { invocationDir, resolveAgentsDir } from "./io/paths.ts";
import type { ResolveOk } from "./shared/types.ts";

/** Ayuda de `acsuite board`. */
export const HELP: string[] = [
  "Seguimiento de tareas en la terminal: vigila docs/agents/ de un proyecto y se redibuja al cambiar.",
  "",
  "Uso: acsuite board [ruta] [operador] [--operator <carpeta>] [--once] [--compact] [--no-arrows]",
  "",
  "  [ruta]                Raíz del proyecto, carpeta de agentes (docs/agents) o carpeta de un operador.",
  "                        Por defecto, el proyecto de la carpeta actual.",
  "  [operador]            Con ruta, abre de frente el panel de ese operador (modo multi-operador).",
  "  --operator <carpeta>  Lo mismo, con o sin ruta.",
  "  --once                Pinta una sola vez y sale.",
  "  --compact             Arranca con un solo recuadro por tarea.",
  "  --no-arrows           Arranca sin las flechas del flujo.",
  "  -h, --help            Muestra esta ayuda.",
];

export function main(argv: string[]): void {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(HELP.join("\n"));
    return;
  }
  const { once, pathArg, operator, compact, arrows } = parseArgs(argv);

  const target = pathArg != null ? resolveFromArg(pathArg, operator) : resolveFromCwd(operator);
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

/**
 * Sin ruta: el proyecto de la carpeta desde la que se lanzó el comando (la raíz de su repo git,
 * o la carpeta misma si no está en uno). Si no tiene documentación de la skill, se informa qué
 * falta y cómo indicar otra ruta, y se sale con código 1.
 */
function resolveFromCwd(operatorArg: string | undefined): ResolveOk {
  const dir = gitToplevel(invocationDir());
  const result = resolveAgentsDir(dir, undefined, { operator: operatorArg });
  if (result.ok) return result;
  console.error(`No se pudo abrir el proyecto de la carpeta actual (${dir}):`);
  printResolveError(result);
  console.error("Si el proyecto está en otra carpeta, indícala: acsuite board <ruta>");
  process.exit(1);
}
