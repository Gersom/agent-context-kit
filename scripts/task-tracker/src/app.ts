// Ciclo del tracker: leer los archivos → armar el modelo → pintar, y redibujar cuando cambian
// (watcher), cuando cambia el tamaño de la terminal, con el atajo `r`, o terminar con `q`/Ctrl+C.
// En modo multi-operador hay además dos vistas (el equipo y el panel de un operador) y una
// navegación con ↑/↓, Enter y `b`/Esc (ver cli/nav.ts).

import { parseKeys } from "./cli/keys.ts";
import { initialNav, type NavRow, navReduce, type NavState, reconcileNav } from "./cli/nav.ts";
import { createSnapshotReader, RETRY_MS } from "./io/snapshot.ts";
import { createTeamReader, ROOT_WATCHED_FILES } from "./io/team.ts";
import { watchDir } from "./io/watch.ts";
import { buildModel } from "./model/model.ts";
import { buildTeamModel } from "./model/team.ts";
import type { Controls, DrawTrigger, MultiInfo, RenderMeta } from "./shared/types.ts";
import { displayProjectName } from "./ui/format.ts";
import { render, renderTeam } from "./ui/render.ts";

/**
 * Arranca el tracker sobre una carpeta de agentes ya resuelta.
 * `multi`: modo multi-operador (`agentsDir` es la raíz con `operators.md`).
 * `once`: pinta una sola vez y no vigila (sin atajos de teclado).
 */
export function startApp({
  agentsDir,
  projectName,
  projectDir,
  multi,
  compact = false,
  arrows = true,
  once,
}: {
  agentsDir: string;
  projectName: string;
  projectDir: string;
  multi?: MultiInfo;
  /** Arranca con los recuadros compactos (una sola tarea por recuadro); la tecla `c` lo alterna. */
  compact?: boolean;
  /** Arranca con las flechas del flujo; la tecla `f` las alterna. */
  arrows?: boolean;
  once: boolean;
}): void {
  const ui = { compact, arrows };
  const watcherErrors: string[] = [];
  const snapshot = multi ? null : createSnapshotReader(agentsDir);
  const teamReader = multi ? createTeamReader(agentsDir) : null;
  let nav: NavState | null = null;
  let navRows: NavRow[] = [];
  // Atajos solo con una terminal interactiva de verdad (no con salida o entrada redirigida).
  const interactive = !once && Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY);
  const controls: Controls = once ? "none" : interactive ? "keys" : "ctrl-c";

  /**
   * Lee los archivos, arma el modelo y redibuja la pantalla. Si un archivo que se venía leyendo
   * bien falla (un agente puede estar reescribiéndolo justo ahora), se reintenta una vez antes de
   * pintar; si sigue fallando, se muestra su última versión buena con un aviso (ver snapshot.ts).
   */
  function draw(trigger: DrawTrigger, { isRetry = false }: { isRetry?: boolean } = {}): void {
    const allowRetry = !once && !isRetry;
    const meta: RenderMeta = { projectName, projectDir, updatedAt: new Date(), trigger, controls, compact: ui.compact, arrows: ui.arrows };
    let screen: string;

    if (teamReader && multi) {
      const read = teamReader.read({ allowRetry });
      if (read.needsRetry) {
        setTimeout(() => draw(trigger, { isRetry: true }), RETRY_MS);
        return;
      }
      const team = buildTeamModel({ ...read, warnings: [...read.warnings, ...watcherErrors] });
      navRows = team.rows.map((row) => ({ folder: row.folder, folderless: row.folderless }));
      const reconciled = reconcileNav(nav ?? initialNav(multi, navRows), navRows);
      nav = reconciled.state;
      const lost = reconciled.lost ? [`El operador «${reconciled.lost}» ya no figura con carpeta en operators.md: se vuelve a la vista de equipo.`] : [];
      const view = nav.view;
      const opened = view.kind === "operator" ? read.operators.find((o) => o.entry.folder === view.folder) : null;

      if (opened?.snapshot) {
        const model = buildModel({
          handoffText: opened.snapshot.handoffText,
          backlogText: opened.snapshot.backlogText,
          historyText: opened.snapshot.historyText,
          readErrors: [...opened.snapshot.warnings, ...watcherErrors, ...lost],
        });
        screen = render(model, { ...meta, operator: opened.entry.folder, teamBacklog: team.teamBacklog, multiView: "operator" });
      } else {
        screen = renderTeam(
          { ...team, warnings: [...team.warnings, ...lost] },
          { ...meta, selected: nav.selected, preferred: multi.preferred, multiView: "team" },
        );
      }
      if (process.stdout.isTTY) setTitle(nav.view.kind === "operator" ? nav.view.folder : "equipo");
      syncWatchers();
    } else if (snapshot) {
      const snap = snapshot.read({ allowRetry });
      if (snap.needsRetry) {
        setTimeout(() => draw(trigger, { isRetry: true }), RETRY_MS);
        return;
      }
      const model = buildModel({
        handoffText: snap.handoffText,
        backlogText: snap.backlogText,
        historyText: snap.historyText,
        readErrors: [...snap.warnings, ...watcherErrors],
      });
      screen = render(model, meta);
    } else {
      return;
    }

    if (!once && process.stdout.isTTY) process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
    process.stdout.write(screen);
  }

  function setTitle(suffix?: string): void {
    process.stdout.write(`\x1b]0;tareas · ${displayProjectName(projectName)}${suffix ? ` · ${suffix}` : ""}\x07`);
  }

  // Una instancia de watcher por carpeta vigilada: la de agentes (modo plano) o la raíz y la de
  // cada operador con carpeta (modo multi-operador; se agregan al aparecer en operators.md).
  const stops = new Map<string, () => void>();
  const onChange = (file: string | null) => draw({ kind: "change", file });
  const onError = (message: string) => {
    watcherErrors.splice(0, watcherErrors.length, message);
    draw({ kind: "redraw" });
  };
  function syncWatchers(): void {
    if (once) return;
    if (!stops.has(agentsDir)) stops.set(agentsDir, watchDir(agentsDir, onChange, onError, undefined, multi ? ROOT_WATCHED_FILES : undefined));
    if (!multi) return;
    for (const row of navRows) {
      if (row.folderless) continue;
      const dir = `${agentsDir}/${row.folder}`;
      if (!stops.has(dir)) stops.set(dir, watchDir(dir, onChange, onError));
    }
  }

  if (process.stdout.isTTY && !multi) setTitle();

  draw({ kind: "start" });
  if (once) return;
  syncWatchers();

  const quit = () => {
    for (const stop of stops.values()) stop();
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
      for (const key of parseKeys(chunk)) {
        if (key === "quit") return quit();
        if (key === "redraw") {
          draw({ kind: "redraw" });
        } else if (key === "compact" || key === "flow") {
          if (key === "compact") ui.compact = !ui.compact;
          else ui.arrows = !ui.arrows;
          draw({ kind: "redraw" });
        } else if (multi && nav) {
          const next = navReduce(nav, key, navRows);
          if (next !== nav) {
            nav = next;
            draw({ kind: "redraw" });
          }
        }
      }
    });
    process.stdin.resume();
  }
}
