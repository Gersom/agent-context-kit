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

import { join } from "node:path";
import { buildModel } from "./src/model.js";
import { readFileSafe, resolveAgentsDir, watchDir } from "./src/reader.js";
import { render } from "./src/render.js";

const args = process.argv.slice(2);
const once = args.includes("--once");
const pathArg = args.find((arg) => !arg.startsWith("--"));

const target = pathArg != null ? resolveFromArg(pathArg) : askForPath();
const { agentsDir, projectName } = target;

const watcherErrors = [];
let retriedEmptyRead = false;

/** Lee los archivos, arma el modelo y redibuja la pantalla. */
function draw(changedFile) {
  const handoff = readFileSafe(join(agentsDir, "handoff.md"));
  const backlog = readFileSafe(join(agentsDir, "backlog.md"));

  // Un agente puede estar reescribiendo el archivo justo ahora: se reintenta una vez antes de
  // mostrarlo como vacío o ausente.
  if (!once && !retriedEmptyRead && !handoff.text?.trim()) {
    retriedEmptyRead = true;
    setTimeout(() => draw(changedFile), 300);
    return;
  }
  retriedEmptyRead = false;

  const readErrors = [handoff.error, backlog.error, ...watcherErrors].filter(Boolean);
  const model = buildModel({ handoffText: handoff.text, backlogText: backlog.text, readErrors });
  const screen = render(model, { projectName, agentsDir, updatedAt: new Date(), changedFile });

  if (!once && process.stdout.isTTY) process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
  process.stdout.write(screen);
}

if (process.stdout.isTTY) process.stdout.write(`\x1b]0;tareas · ${projectName}\x07`);

draw(undefined);
if (!once) {
  const stop = watchDir(
    agentsDir,
    (file) => draw(file),
    (message) => {
      watcherErrors.splice(0, watcherErrors.length, message);
      draw(undefined);
    },
  );
  process.stdout.on("resize", () => draw(undefined));
  process.on("SIGINT", () => {
    stop();
    process.stdout.write("\n");
    process.exit(0);
  });
}

/** Ruta pasada por argumento: si no es válida, se informa y se sale con código 1. */
function resolveFromArg(input) {
  const result = resolveAgentsDir(input);
  if (result.ok) return result;
  printResolveError(result);
  process.exit(1);
}

/**
 * Pregunta la ruta hasta que sea válida. El `prompt()` de Bun devuelve null tanto para una
 * línea vacía como para el fin de la entrada: en una terminal se vuelve a preguntar (se sale
 * con Ctrl+C); con entrada redirigida, varias respuestas null seguidas se toman como EOF.
 */
function askForPath() {
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

function printResolveError({ error, tried }) {
  console.error(error);
  for (const dir of tried) console.error(`  - ${dir}`);
}
