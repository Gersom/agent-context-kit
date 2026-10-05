// Ciclo del tracker: leer los archivos → armar el modelo → pintar, y redibujar cuando cambian
// (watcher), cuando cambia el tamaño de la terminal o terminar con Ctrl+C.

import { createSnapshotReader, RETRY_MS } from "./io/snapshot.ts";
import { watchDir } from "./io/watch.ts";
import { buildModel } from "./model/model.ts";
import { render } from "./ui/render.ts";

/**
 * Arranca el tracker sobre una carpeta de agentes ya resuelta.
 * `once`: pinta una sola vez y no vigila.
 */
export function startApp({ agentsDir, projectName, once }: { agentsDir: string; projectName: string; once: boolean }): void {
  const watcherErrors: string[] = [];
  const snapshot = createSnapshotReader(agentsDir);

  /**
   * Lee los archivos, arma el modelo y redibuja la pantalla. Si un archivo que se venía leyendo
   * bien falla (un agente puede estar reescribiéndolo justo ahora), se reintenta una vez antes de
   * pintar; si sigue fallando, se muestra su última versión buena con un aviso (ver snapshot.ts).
   */
  function draw(changedFile: string | null | undefined, { isRetry = false }: { isRetry?: boolean } = {}): void {
    const snap = snapshot.read({ allowRetry: !once && !isRetry });
    if (snap.needsRetry) {
      setTimeout(() => draw(changedFile, { isRetry: true }), RETRY_MS);
      return;
    }

    const readErrors = [...snap.warnings, ...watcherErrors];
    const model = buildModel({ handoffText: snap.handoffText, backlogText: snap.backlogText, readErrors });
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
}
