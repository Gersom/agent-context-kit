// Arranque del seguimiento de tareas: interpreta los argumentos, resuelve el proyecto a vigilar
// y lanza la aplicación. Lo llaman `index.ts` y el despachador `acsuite`.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { gitToplevel } from "../../_shared/git.ts";
import { startApp } from "./app.ts";
import { parseArgs } from "./cli/args.ts";
import { printResolveError } from "./cli/resolve-error.ts";
import { invocationDir, resolveAgentsDir } from "./io/paths.ts";
import type { ResolveOk } from "./shared/types.ts";

/** Ayuda de `acsuite board`. */
export const HELP: string[] = [
  "Seguimiento de tareas en la terminal: vigila docs/agents/ de un proyecto y se redibuja al cambiar.",
  "Sin ruta y fuera de un proyecto con documentación de la skill, abre la lista de proyectos.",
  "",
  "Uso: acsuite board [ruta] [operador] [--operator <carpeta>] [--once] [--compact] [--no-arrows]",
  "",
  "  [ruta]                Raíz del proyecto, carpeta de agentes (docs/agents) o carpeta de un operador.",
  "                        Por defecto, el proyecto de la carpeta actual; si no tiene documentación,",
  "                        la lista de proyectos (↑/↓ eligen, Enter abre, Esc o b vuelven a la lista).",
  "                        Con un proyecto abierto, la tecla p lleva a la lista de proyectos.",
  "  [operador]            Con ruta, abre de frente el panel de ese operador (modo multi-operador).",
  "  --operator <carpeta>  Lo mismo, con o sin ruta.",
  "  --once                Pinta una sola vez y sale.",
  "  --compact             Arranca con un solo recuadro por tarea.",
  "  --no-arrows           Arranca sin las flechas del flujo.",
  "  --follow              Modo observador: espera a que marques un proyecto con el mod de Claude (acsuite-active-project) y lo abre.",
  "  -h, --help            Muestra esta ayuda.",
  "",
  "La lista de proyectos se guarda en projects.json dentro de ~/.acsuite (o de la carpeta de la variable",
  "ACSUITE_HOME): los repos abiertos de frente (sin --once) y los agregados con la tecla a. Con la tecla x",
  "se quita de la lista el proyecto elegido, tras confirmar con Enter (no se borra nada del repo).",
];

export function main(argv: string[]): void {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(HELP.join("\n"));
    return;
  }
  const { once, pathArg, operator, compact, arrows } = parseArgs(argv);

  // `null`: sin proyecto al que abrir de frente, se muestra la lista de proyectos.
  const target = pathArg != null ? resolveFromArg(pathArg, operator) : resolveFromCwd(operator);

  startApp({ target, compact, arrows, once });
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
 * o la carpeta misma si no está en uno). Si no tiene documentación de la skill, devuelve `null`
 * (se abre la lista de proyectos). Con un operador pedido sí es un error: se informa qué falta y
 * cómo indicar otra ruta, y se sale con código 1.
 */
function resolveFromCwd(operatorArg: string | undefined): ResolveOk | null {
  const dir = gitToplevel(invocationDir());
  const result = resolveAgentsDir(dir, undefined, { operator: operatorArg });
  if (result.ok) return result;
  // Sin operador pedido, que la carpeta no tenga docs de la skill no es un error: se mira la lista
  // de proyectos. Si la carpeta de agentes existe pero está mal (ej. falta operators.md), sí lo es.
  const hasAgentsDir = ["docs/agents", "agent-context/agents"].some((sub) => existsSync(join(dir, sub)));
  if (!operatorArg && !hasAgentsDir) return null;
  console.error(`No se pudo abrir el proyecto de la carpeta actual (${dir}):`);
  printResolveError(result);
  console.error("Si el proyecto está en otra carpeta, indícala: acsuite board <ruta>");
  process.exit(1);
}
