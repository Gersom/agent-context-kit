// Ciclo del tracker: leer los archivos → armar el modelo → pintar, y redibujar cuando cambian
// (watcher), cuando cambia el tamaño de la terminal, con el atajo `r`, o terminar con `q`/Ctrl+C.

import { keyAction } from "./cli/keys.ts";
import { createSnapshotReader, RETRY_MS } from "./io/snapshot.ts";
import { watchDir } from "./io/watch.ts";
import { buildModel } from "./model/model.ts";
import type { Controls, DrawTrigger } from "./shared/types.ts";
import { displayProjectName } from "./ui/format.ts";
import { render } from "./ui/render.ts";

/**
 * Arranca el tracker sobre una carpeta de agentes ya resuelta.
 * `once`: pinta una sola vez y no vigila (sin atajos de teclado).
 */
export function startApp({
  agentsDir,
  projectName,
  projectDir,
  operator,
  once,
}: {
  agentsDir: string;
  projectName: string;
  projectDir: string;
  /** Carpeta del operador vigilado (modo multi-operador). */
  operator?: string;
  once: boolean;
}): void {
  const watcherErrors: string[] = [];
  const snapshot = createSnapshotReader(agentsDir);
  // Atajos solo con una terminal interactiva de verdad (no con salida o entrada redirigida).
  const interactive = !once && Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY);
  const controls: Controls = once ? "none" : interactive ? "keys" : "ctrl-c";

  /**
   * Lee los archivos, arma el modelo y redibuja la pantalla. Si un archivo que se venía leyendo
   * bien falla (un agente puede estar reescribiéndolo justo ahora), se reintenta una vez antes de
   * pintar; si sigue fallando, se muestra su última versión buena con un aviso (ver snapshot.ts).
   */
  function draw(trigger: DrawTrigger, { isRetry = false }: { isRetry?: boolean } = {}): void {
    const snap = snapshot.read({ allowRetry: !once && !isRetry });
    if (snap.needsRetry) {
      setTimeout(() => draw(trigger, { isRetry: true }), RETRY_MS);
      return;
    }

    const readErrors = [...snap.warnings, ...watcherErrors];
    const model = buildModel({
      handoffText: snap.handoffText,
      backlogText: snap.backlogText,
      historyText: snap.historyText,
      readErrors,
    });
    const screen = render(model, { projectName, projectDir, operator, updatedAt: new Date(), trigger, controls });

    if (!once && process.stdout.isTTY) process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
    process.stdout.write(screen);
  }

  if (process.stdout.isTTY) process.stdout.write(`\x1b]0;tareas · ${displayProjectName(projectName)}${operator ? ` · ${operator}` : ""}\x07`);

  draw({ kind: "start" });
  if (once) return;

  const stop = watchDir(
    agentsDir,
    (file) => draw({ kind: "change", file }),
    (message) => {
      watcherErrors.splice(0, watcherErrors.length, message);
      draw({ kind: "redraw" });
    },
  );

  const quit = () => {
    stop();
    if (interactive) process.stdin.setRawMode(false);
    process.stdout.write("\n");
    process.exit(0);
  };

  process.stdout.on("resize", () => draw({ kind: "redraw" }));
  process.on("SIGINT", quit);

  if (interactive) {
    // En modo raw Ctrl+C no genera SIGINT: llega como el carácter \u0003 (ver keys.ts).
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      for (const key of chunk) {
        const action = keyAction(key);
        if (action === "quit") return quit();
        if (action === "redraw") draw({ kind: "redraw" });
      }
    });
    process.stdin.resume();
  }
}
