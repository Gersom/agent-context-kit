// Pintado del modelo en la terminal con picocolors. render() devuelve un string (testeable);
// src/app.ts se encarga de limpiar la pantalla y escribirlo.
//
// Debajo del encabezado, un recuadro por tipo de tarea (ver ui/box.ts), con el archivo del que
// sale en el borde superior: completadas (history.md, compacto), en progreso y pausadas
// (handoff.md, en detalle, con los pasos ya hechos del plan tachados) y libres y bloqueadas
// (backlog.md, compacto con `T-N: título`). Todos los recuadros tienen el ancho de la terminal.

import picocolors from "picocolors";
import { formatTime } from "../shared/time.ts";
import type {
  BlockedTask,
  DrawTrigger,
  Model,
  ObserverRenderMeta,
  Plan,
  ProjectRow,
  ProjectsRenderMeta,
  RenderMeta,
  TeamBacklogModel,
  TeamModel,
  TeamRenderMeta,
  TeamRow,
} from "../shared/types.ts";
import type { HistoryEntry, TaskRef } from "../../../_shared/types.ts";
import { BOX_PADDING, boxBottom, boxRow, boxTop, type Paint, type Segment } from "./box.ts";
import { displayProjectName, plainText, progressBar, shortTaskName, truncate, visibleLength } from "./format.ts";

/** Ancho mínimo de la pantalla, aunque la terminal sea más angosta. */
const MIN_WIDTH = 40;
/** Ancho cuando no hay terminal que lo informe (salida redirigida, `--once`) ni `COLUMNS`. */
const DEFAULT_WIDTH = 100;
/** Líneas que se muestran de cada subsección de la tarea en progreso (la primera + estas). */
const DETAIL_EXTRA_LINES = 2;
/** Colores de la paleta de 256 colores que no están en picocolors. */
/** Tareas completadas (nombre y fecha). Los bordes usan el gris de picocolors. */
const COMPLETED_GRAY_256 = 245;
/** Textos secundarios (rutas, campos, "Ninguna", pie…). */
const SECONDARY_GRAY_256 = 250;
/** Título de "tareas completadas" y prefijo `T-N` de cada una: #6DB07B (elegido por el operador). */
const COMPLETED_GREEN_RGB = [0x6d, 0xb0, 0x7b] as const;
/** Título y viñeta de "sin dueño": un azul pálido, #8FB3D9 (elegido por el operador). */
const UNOWNED_BLUE_RGB = [0x8f, 0xb3, 0xd9] as const;

type Colors = ReturnType<typeof picocolors.createColors>;
/** Agrega una fila al recuadro abierto: sangría + tramos con estilo. */
type Row = (indent: number, ...segments: Segment[]) => void;
/** Lo que el lienzo necesita de los metadatos: la lista de proyectos no tiene repo en el encabezado. */
type CanvasMeta = Omit<RenderMeta, "projectName" | "projectDir"> & Partial<Pick<RenderMeta, "projectName" | "projectDir">>;

/**
 * Lienzo de una pantalla: las líneas, los recuadros y el encabezado ya escrito. `subtitle` es lo
 * que va después del nombre del proyecto (el operador en su panel, "equipo" en la vista de equipo).
 */
function createCanvas(meta: CanvasMeta, subtitle?: string) {
  const pc: Colors = meta.color === undefined ? picocolors : picocolors.createColors(meta.color);
  const width = screenWidth(meta.width);
  const out: string[] = [];
  const line = (indent: number, text: string, color: Paint = (s) => s) =>
    out.push(" ".repeat(indent) + color(truncate(plainText(text), width - indent)));
  const blank = () => out.push("");

  const { secondary, completed, completedGreen, unownedBlue } = tones(pc);

  /** Recuadro completo: borde superior con título y archivo, filas y borde inferior. */
  const box = (title: string, file: string, color: Paint, fill: (row: Row) => void, border: Paint = pc.gray) => {
    out.push(boxTop(title, file, width, { border, file: secondary, title: (s) => pc.bold(color(s)) }));
    fill((indent, ...segments) => {
      const text = segments.map((s) => ({ ...s, text: plainText(s.text) }));
      out.push(boxRow([{ text: " ".repeat(indent) }, ...text], width, border));
    });
    out.push(boxBottom(width, border));
  };

  // Encabezado
  const heading = [meta.projectName ? displayProjectName(meta.projectName) : "", subtitle ?? ""].filter(Boolean).join(" · ");
  line(0, `▣ ${heading}`, (s) => pc.bold(pc.magenta(s)));
  if (meta.projectDir) line(2, meta.projectDir, secondary);
  line(2, `Última actualización ${formatTime(meta.updatedAt)} · ${triggerText(meta.trigger)}`, secondary);
  blank();

  return { pc, width, out, line, blank, box, secondary, completed, completedGreen, unownedBlue };
}

type Canvas = ReturnType<typeof createCanvas>;

/** Avisos, notas y pie con las teclas; cierra la pantalla y la devuelve como texto. */
function finishCanvas({ out, line, blank, secondary, pc, width }: Canvas, meta: CanvasMeta, model: { notes?: string[]; warnings: string[] }): string {
  const notes = model.notes ?? [];
  if (notes.length || meta.observer || model.warnings.length) blank();
  for (const note of notes) line(0, `ℹ ${note}`, secondary);
  if (meta.observer) {
    // El estado fijo se parte en palabras si no entra, para no perder el final («o /board»).
    wrapWords(OBSERVER_STATUS, width - 2).forEach((text, i) => line(0, `${i === 0 ? "ℹ" : " "} ${text}`, pc.cyan));
    if (meta.observer.notice) line(0, `! ${meta.observer.notice}`, pc.yellow);
  }
  for (const warning of model.warnings) line(0, `! ${warning}`, pc.yellow);

  const footer = footerLines(meta, width);
  if (footer.length) {
    blank();
    for (const text of footer) line(0, text, secondary);
  }
  return out.join("\n") + "\n";
}

/** Línea de estado del modo observador (ver `RenderMeta.observer`). */
const OBSERVER_STATUS = "Observando: esperando que marques un proyecto con el mod de Claude (botón «Marcar este proyecto» o /board)";

/** Lo que dice la vista de espera del modo observador (ver `renderObserver`). */
const OBSERVER_WAITING = "Esperando que marques un proyecto con el mod de Claude (botón «Marcar este proyecto» o /board).";

/** Parte `text` en líneas de a lo sumo `width` caracteres, cortando en los espacios. */
function wrapWords(text: string, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    const joined = current ? `${current} ${word}` : word;
    if (current && visibleLength(joined) > width) {
      lines.push(current);
      current = word;
    } else {
      current = joined;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Etapas por las que pasa una tarea, de arriba abajo en la pantalla (ver `arrowText`). */
export type Stage = "unowned" | "blocked" | "free" | "current" | "paused" | "completed";

/** Lo que dice la flecha entre una etapa y la siguiente que se muestra. */
const ARROWS: Partial<Record<`${Stage}>${Stage}`, string>> = {
  "unowned>free": "↓ se toma",
  "unowned>current": "↓ se toma",
  "free>blocked": "↓ bloquea · ↑ desbloquea",
  "free>current": "↓ empieza",
  // Una bloqueada no empieza directo: primero se desbloquea y pasa a libres, de donde empieza.
  "blocked>current": "↓ empieza (desde libres)",
  "current>paused": "↑ retoma · ↓ pausa",
  "current>completed": "↓ se cierra",
  "paused>completed": "↓ se cierra",
};

/** Texto de la flecha de `from` a `to`; sin una transición conocida entre esas etapas, solo `↓`. */
export function arrowText(from: Stage, to: Stage): string {
  return ARROWS[`${from}>${to}`] ?? "↓";
}

/**
 * Panel de un operador (o del proyecto, en modo plano). Los recuadros van en el orden del flujo
 * de una tarea, de arriba abajo: sin dueño → libres ⇅ bloqueadas → en progreso ⇅ pausadas →
 * completadas, con una línea de flecha entre los que se muestran. Ver `RenderMeta`.
 */
export function render(model: Model, meta: RenderMeta): string {
  const canvas = createCanvas(meta, meta.operator);
  const { pc, width, box, line, secondary, completedGreen } = canvas;

  const stages: { id: Stage; shown: boolean; draw: () => void }[] = [
    // team-backlog.md (modo multi-operador): las tareas sin dueño
    { id: "unowned", shown: Boolean(meta.teamBacklog?.present), draw: () => meta.teamBacklog && teamBacklogBox(canvas, meta.teamBacklog, meta.compact) },

    // backlog.md (compacto): libres y, debajo, bloqueadas (solo si hay alguna)
    {
      id: "free",
      shown: model.hasBacklog,
      draw: () =>
        box(`LIBRES (${model.counts.free})`, "backlog.md", pc.cyan, (row) => {
          if (!model.free.tasks.length && !model.free.groups.length) row(0, { paint: secondary, text: "Ninguna" });
          if (meta.compact && (model.free.tasks.length || model.free.groups.length)) {
            // Solo la última: la última tarea suelta o, si no hay, el último grupo.
            const lastTask = model.free.tasks[model.free.tasks.length - 1];
            const lastGroup = model.free.groups[model.free.groups.length - 1];
            const text = lastTask
              ? shortTaskName(lastTask.number, lastTask.title)
              : `◇ Grupo: ${lastGroup.title} (${lastGroup.taskNumbers.map((n) => `T-${n}`).join(", ")})`;
            // Lo que se muestra cuenta como 1 tarea suelta o como las de su grupo; el resto, como en el título.
            const shown = lastTask ? 1 : lastGroup.taskNumbers.length;
            compactRow(row, text, pc.cyan, model.counts.free - shown, width, secondary);
            return;
          }
          for (const task of model.free.tasks) row(0, { paint: pc.cyan, text: shortTaskName(task.number, task.title) });
          for (const group of model.free.groups) {
            const refs = group.taskNumbers.map((n) => `T-${n}`).join(", ");
            row(0, { paint: pc.cyan, text: `◇ Grupo: ${group.title} (${refs})` });
            for (const task of group.tasks) {
              if (task.title) row(2, { paint: secondary, text: `· ${shortTaskName(task.number, task.title)}` });
            }
          }
        }),
    },
    {
      id: "blocked",
      shown: model.hasBacklog && model.blocked.length > 0,
      draw: () =>
        box(`BLOQUEADAS (${model.counts.blocked})`, "backlog.md", pc.red, (row) => {
          if (meta.compact) {
            // Solo la última (la más reciente de la lista), sin las tareas de las que depende.
            const last = model.blocked[model.blocked.length - 1];
            const tag = last.block.tag ? ` [${last.block.tag}]` : "";
            compactRow(row, `${shortTaskName(last.number, last.title)}${tag}`, pc.red, model.blocked.length - 1, width, secondary);
            return;
          }
          for (const task of model.blocked) blockedRows(task, row, pc);
        }),
    },

    // handoff.md (detallado): en progreso siempre; pausadas solo si hay alguna
    {
      id: "current",
      shown: true,
      draw: () =>
        box("EN PROGRESO", "handoff.md", pc.green, (row) => {
          const current = model.current;
          if (!current) {
            row(0, { paint: secondary, text: "Sin tarea en curso" });
            return;
          }
          row(0, { paint: (s) => pc.bold(pc.green(s)), text: fullTaskName(current) });
          planRows(current.plan, 0, row, pc);
          for (const sub of current.details) {
            const lines = sub.body.split("\n").map((l) => l.trim()).filter(Boolean);
            const [first, ...rest] = lines;
            if (first === undefined) continue;
            row(0, { text: `${sub.title}: ${first}` });
            for (const text of rest.slice(0, DETAIL_EXTRA_LINES)) row(2, { paint: secondary, text });
            if (rest.length > DETAIL_EXTRA_LINES) row(2, { paint: secondary, text: "…" });
          }
        }, pc.green),
    },
    {
      id: "paused",
      shown: model.paused.length > 0,
      draw: () =>
        box(`PAUSADAS (${model.counts.paused})`, "handoff.md", pc.yellow, (row) => {
          for (const task of model.paused) {
            row(0, { paint: pc.yellow, text: `• ${fullTaskName(task)}` });
            planRows(task.plan, 4, row, pc);
            for (const field of task.fields) row(4, { paint: secondary, text: `${field.label}: ${field.value}` });
          }
        }),
    },

    // history.md (compacto)
    {
      id: "completed",
      shown: model.hasHistory,
      draw: () =>
        box(`TAREAS COMPLETADAS (últimas ${model.completed.length})`, "history.md", completedGreen, (row) => {
          if (!model.completed.length) row(0, { paint: secondary, text: "Ninguna" });
          if (meta.compact && model.completed.length) {
            // Solo la última cerrada (las más nuevas van primero).
            const more = model.completed.length - 1;
            const suffix = more > 0 ? ` · +${more} más` : "";
            row(0, ...completedSegments(model.completed[0], width, pc, visibleLength(suffix)), ...(suffix ? [{ paint: secondary, text: suffix }] : []));
            return;
          }
          for (const entry of model.completed) row(0, ...completedSegments(entry, width, pc));
        }),
    },
  ];

  let previous: Stage | null = null;
  for (const stage of stages) {
    if (!stage.shown) continue;
    if (previous && meta.arrows !== false) line(3, arrowText(previous, stage.id), secondary);
    stage.draw();
    previous = stage.id;
  }

  return finishCanvas(canvas, meta, { notes: model.notes, warnings: [...model.warnings, ...(meta.teamBacklog?.warnings ?? [])] });
}

/**
 * Vista de equipo (modo multi-operador): el recuadro EQUIPO, que es el selector (una fila por
 * operador, con el elegido marcado con `›` y el del correo de git con `(tú)`), y las tareas sin dueño.
 */
export function renderTeam(team: TeamModel, meta: TeamRenderMeta): string {
  const canvas = createCanvas(meta, "equipo");
  const { pc, box, secondary } = canvas;

  box(`EQUIPO (${team.rows.length})`, "operators.md", pc.green, (row) => {
    if (!team.rows.length) row(0, { paint: secondary, text: "Ningún operador registrado en operators.md" });
    // Nombres alineados en columna: la carpeta y, si es el operador del correo de git, "(tú)".
    const label = (op: TeamRow) => op.folder + (op.folder === meta.preferred ? " (tú)" : "");
    const nameWidth = Math.max(0, ...team.rows.map((op) => visibleLength(label(op))));
    for (const op of team.rows) {
      const chosen = op.folder === meta.selected && !op.folderless;
      const mark = chosen ? "› " : "  ";
      const padded = label(op) + " ".repeat(nameWidth - visibleLength(label(op)));
      const name = { paint: (s: string) => (chosen ? pc.bold(pc.green(s)) : pc.bold(s)), text: `${mark}${padded}` };
      if (op.folderless) {
        row(0, name, { paint: secondary, text: "  (solo team-backlog)" });
      } else if (op.missing) {
        row(0, name, { paint: pc.yellow, text: "  (sin handoff.md)" });
      } else if (op.current) {
        const plan = op.current.total ? ` · plan ${op.current.done}/${op.current.total}` : "";
        row(0, name, { text: `  ${op.current.label} ${op.current.number} — ${op.current.title}${plan}` });
      } else {
        row(0, name, { paint: secondary, text: "  Sin tarea en curso" });
      }
      if (!op.folderless && !op.missing) row(4, { paint: secondary, text: summaryLine(op) });
    }
  });

  if (team.teamBacklog.present) teamBacklogBox(canvas, team.teamBacklog, meta.compact);
  return finishCanvas(canvas, meta, { warnings: team.warnings });
}

/**
 * Vista de espera del modo observador: mientras ninguna marca abre un repo, la pantalla es solo
 * esta (sin tareas): qué se espera, el aviso del observador si hay (`observer.notice`) y el pie.
 */
export function renderObserver(meta: ObserverRenderMeta): string {
  const canvas = createCanvas(meta, "Modo observador");
  const { pc, width, line } = canvas;
  // El texto se parte en palabras si no entra, para no perder el final («o /board»).
  for (const text of wrapWords(OBSERVER_WAITING, width)) line(0, text, pc.cyan);
  // Sin la línea de estado de `finishCanvas` (que ya dice lo mismo): el aviso va como los demás avisos.
  const notice = meta.observer?.notice;
  return finishCanvas(canvas, { ...meta, observer: undefined, multiView: "observer" }, { warnings: notice ? [notice] : [] });
}

/** Segunda línea de la fila de un operador: conteos y su última tarea completada. */
function summaryLine(op: TeamRow): string {
  const parts = [`libres ${op.counts.free}`, `bloqueadas ${op.counts.blocked}`];
  const done = op.lastCompleted;
  if (done) {
    const name = done.number == null ? done.title : shortTaskName(done.number, done.title);
    parts.push(`último cierre: ${name}${done.date ? ` (${done.date})` : ""}`);
  }
  return parts.join(" · ");
}

/** Separación entre las columnas de la lista de proyectos. */
const PROJECT_GAP = "  ";

/**
 * Lista de proyectos: el recuadro PROYECTOS, que es el selector (una fila por repo, con el elegido
 * marcado con `›`): nombre, ruta, operador del correo de git de ese repo, tarea en curso y cuántas
 * tareas libres y bloqueadas tiene ese operador. Lo que no se sabe sale como `—`; un repo que no
 * se pudo leer muestra su aviso en lugar de los datos. `warnings`: avisos de la vista (ej. no se
 * pudo abrir un proyecto).
 */
export function renderProjects(rows: ProjectRow[], meta: ProjectsRenderMeta, warnings: string[] = []): string {
  const canvas = createCanvas(meta, "proyectos");
  const { pc, box, secondary, width } = canvas;
  // La ruta que se escribe se muestra por el final (donde está el cursor), no por el principio.
  const inputLine = (text: string): string => {
    const label = "Ruta del repo: ";
    const room = Math.max(1, width - BOX_PADDING - 2 - label.length - 1);
    const chars = Array.from(text);
    return `${label}${chars.length > room ? `…${chars.slice(Math.max(0, chars.length - (room - 1))).join("")}` : text}█`;
  };
  // La confirmación de quitar lleva el nombre y la ruta; si no cabe, la ruta se corta por el principio.
  const confirmLine = ({ name, path }: { name: string; path: string }): string => {
    const head = `¿Quitar ${name} (`;
    const tail = ") de la lista? [Enter] sí · [Esc] no";
    const room = Math.max(1, width - BOX_PADDING - 2 - visibleLength(head + tail));
    const chars = Array.from(path);
    return `${head}${chars.length > room ? `…${chars.slice(Math.max(0, chars.length - (room - 1))).join("")}` : path}${tail}`;
  };

  box(`PROYECTOS (${rows.length})`, "docs/agents", pc.green, (row) => {
    if (!rows.length) {
      row(0, { paint: secondary, text: "No hay proyectos para mostrar." });
      row(0, { paint: secondary, text: `Abre uno con: acsuite board <ruta>${meta.controls === "keys" ? ", o agrégalo con [a]" : ""}` });
      if (meta.input != null) row(0, { text: inputLine(meta.input) });
      return;
    }
    const currentText = (r: ProjectRow) => (r.work?.current ? shortTaskName(r.work.current.number, r.work.current.title) : r.work ? "Sin tarea en curso" : "—");
    const widest = (header: string, texts: string[]) => Math.max(visibleLength(header), ...texts.map(visibleLength));

    // Columnas de ancho fijo según su contenido; la ruta y la tarea en curso se reparten el resto.
    const nameW = Math.min(24, widest("nombre", rows.map((r) => r.name)));
    const operatorW = Math.min(16, widest("operador", rows.map((r) => r.operator ?? "—")));
    const freeW = widest("libres", rows.map((r) => String(r.work?.counts.free ?? "—")));
    const blockedW = widest("bloqueadas", rows.map((r) => String(r.work?.counts.blocked ?? "—")));
    const room = width - BOX_PADDING - 2 - nameW - operatorW - freeW - blockedW - PROJECT_GAP.length * 5;
    const pathMax = widest("ruta", rows.map((r) => r.path));
    const pathW = Math.max(1, Math.min(pathMax, Math.floor(room * 0.45)));
    const currentW = Math.max(1, room - pathW);

    const fit = (text: string, w: number, alignRight = false): string => {
      const shown = truncate(plainText(text), w);
      const pad = " ".repeat(Math.max(0, w - visibleLength(shown)));
      return alignRight ? pad + shown : shown + pad;
    };

    const headers = [fit("nombre", nameW), fit("ruta", pathW), fit("operador", operatorW), fit("en curso", currentW), fit("libres", freeW, true), fit("bloqueadas", blockedW, true)];
    row(0, { paint: secondary, text: `  ${headers.join(PROJECT_GAP)}` });

    for (const project of rows) {
      const chosen = project.path === meta.selected;
      const name = { paint: (s: string) => (chosen ? pc.bold(pc.green(s)) : pc.bold(s)), text: `${chosen ? "› " : "  "}${fit(project.name, nameW)}${PROJECT_GAP}` };
      const path = { paint: secondary, text: fit(project.path, pathW) + PROJECT_GAP };
      if (project.warning != null) {
        row(0, name, path, { paint: pc.yellow, text: `! ${project.warning}` });
        continue;
      }
      const { work } = project;
      row(
        0,
        name,
        path,
        { paint: project.operator ? undefined : secondary, text: fit(project.operator ?? "—", operatorW) + PROJECT_GAP },
        { paint: work?.current ? undefined : secondary, text: fit(currentText(project), currentW) + PROJECT_GAP },
        { paint: work?.counts.free ? pc.cyan : secondary, text: fit(String(work?.counts.free ?? "—"), freeW, true) + PROJECT_GAP },
        { paint: work?.counts.blocked ? pc.red : secondary, text: fit(String(work?.counts.blocked ?? "—"), blockedW, true) },
      );
    }
    if (meta.input != null) row(0, { text: inputLine(meta.input) });
    if (meta.confirmRemove != null) row(0, { paint: pc.yellow, text: confirmLine(meta.confirmRemove) });
  });

  return finishCanvas(canvas, { ...meta, hasRows: rows.length > 0 }, { warnings });
}

/**
 * Recuadro "SIN DUEÑO": las tareas del team-backlog.md, libres primero y después las bloqueadas.
 * Título y viñeta en un azul pálido, texto de las tareas en el gris de las completadas; solo el
 * tag de bloqueo va en rojo, para no perder esa señal.
 */
function teamBacklogBox({ box, pc, width, secondary, completed, unownedBlue }: Canvas, backlog: TeamBacklogModel, compact = false): void {
  if (!backlog.present) return;
  const total = backlog.free.length + backlog.blocked.length;
  box(`SIN DUEÑO (${total})`, "team-backlog.md", unownedBlue, (row) => {
    if (!total) row(0, { paint: secondary, text: "Ninguna" });
    if (compact && total) {
      // Solo la última (la más reciente de la lista), sin el motivo del bloqueo.
      const last = [...backlog.free, ...backlog.blocked][total - 1];
      const tag = last.block.tag ? ` [${last.block.tag}]` : "";
      const suffix = total > 1 ? ` · +${total - 1} más` : "";
      const room = Math.max(1, width - BOX_PADDING - visibleLength(`• ${tag}${suffix}`));
      row(
        0,
        { paint: unownedBlue, text: "• " },
        { paint: completed, text: truncate(plainText(last.title), room) },
        ...(tag ? [{ paint: pc.red, text: tag }] : []),
        ...(suffix ? [{ paint: secondary, text: suffix }] : []),
      );
      return;
    }
    for (const task of [...backlog.free, ...backlog.blocked]) {
      row(0, { paint: unownedBlue, text: "• " }, { paint: completed, text: task.title }, ...(task.block.tag ? [{ paint: pc.red, text: ` [${task.block.tag}]` }] : []));
      if (task.block.reason) row(4, { paint: secondary, text: `→ ${task.block.reason}` });
    }
  });
}

/**
 * Ancho de la pantalla: el que se pide (tests), el de la terminal, o `COLUMNS` cuando la salida
 * no va a una terminal (ej. `--once` redirigido); si no hay ninguno, `DEFAULT_WIDTH`.
 */
export function screenWidth(requested?: number): number {
  const fromEnv = Number(process.env.COLUMNS);
  const width = requested ?? process.stdout.columns ?? (fromEnv > 0 ? fromEnv : DEFAULT_WIDTH);
  return Math.max(MIN_WIDTH, width);
}

/** Texto de la línea de actualización según qué provocó el redibujo. */
export function triggerText(trigger: DrawTrigger): string {
  if (trigger.kind === "start") return "al iniciar";
  if (trigger.kind === "redraw") return "redibujado";
  return trigger.file ? `se modificó ${trigger.file}` : "cambio detectado";
}

/**
 * Pie con las teclas que valen en esta vista, como `[tecla] acción` separadas por ` - `; `c` y `f`
 * dicen lo que harán según el estado actual. Si no entra en el ancho se parte en más líneas (así
 * "salir", lo último, nunca queda recortado).
 */
function footerLines(meta: CanvasMeta, width: number): string[] {
  const controls = meta.controls ?? "ctrl-c";
  if (controls === "ctrl-c") return ["[Ctrl+C] salir"];
  if (controls !== "keys") return [];
  const parts: string[] = [];
  const observe = meta.observer ? "[o] salir del modo observador" : "[o] observar";
  if (meta.multiView === "observer") {
    // La vista de espera del observador no tiene más teclas: `r` redibuja pero no se ofrece.
    parts.push("[o] salir del modo observador", "[Ctrl+C o q] salir");
  } else if (meta.multiView === "projects") {
    // La lista de proyectos no se compacta ni tiene flechas de flujo, y `r` la vuelve a leer.
    // Agregando o confirmando una salida de la lista, solo valen las teclas de ese paso.
    if (meta.input != null) parts.push("[Enter] agregar", "[Esc] cancelar", "[Ctrl+C] salir");
    else if (meta.confirmRemove != null) parts.push("[Enter] quitar", "[Esc] cancelar", "[Ctrl+C] salir");
    else parts.push("[↑/↓] elegir", "[Enter] abrir", "[a] agregar repo", ...(meta.hasRows ? ["[x] quitar"] : []), "[r] releer", observe, "[Ctrl+C o q] salir");
  } else {
    if (meta.multiView === "team") parts.push("[↑/↓] elegir", "[Enter] abrir");
    if (meta.multiView === "operator") parts.push("[Esc o b] volver al equipo");
    // Desde la raíz de un repo abierto desde la lista, `b`/Esc también vuelven a ella, pero el pie solo ofrece `[p]`.
    parts.push("[p] proyectos");
    // La vista de equipo no ofrece compactar (la tecla `c` no hace nada ahí) ni tiene flechas de flujo.
    if (meta.multiView !== "team") {
      parts.push(meta.compact ? "[c] expandir" : "[c] compactar");
      parts.push(meta.arrows === false ? "[f] mostrar flechas" : "[f] ocultar flechas");
    }
    parts.push("[r] redibujar", observe, "[Ctrl+C o q] salir");
  }

  const lines: string[] = [];
  let current = "";
  for (const part of parts) {
    const joined = current ? `${current} - ${part}` : part;
    if (current && visibleLength(joined) > width) {
      lines.push(current);
      current = part;
    } else {
      current = joined;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Fila de un recuadro compacto: una sola tarea y, aparte, cuántas más hay (`· +3 más`). El texto
 * de la tarea se recorta antes que el contador.
 */
function compactRow(row: Row, text: string, paint: Paint, more: number, width: number, secondary: Paint): void {
  const suffix = more > 0 ? ` · +${more} más` : "";
  const room = Math.max(1, width - BOX_PADDING - visibleLength(suffix));
  row(0, { paint, text: truncate(plainText(text), room) }, ...(suffix ? [{ paint: secondary, text: suffix }] : []));
}

/** `Tarea 9 — título`, con la etiqueta tal como está escrita en el documento. */
function fullTaskName(task: { label: string; number: number; title: string }): string {
  return `${task.label} ${task.number} — ${task.title}`;
}

/**
 * Tonos de la paleta de 256 colores que no están en picocolors (los bordes van en el gris de
 * picocolors, salvo el de "en progreso", que conserva el color de su tipo). Sin color, el texto
 * queda tal cual.
 */
function tones(pc: Colors): { completed: Paint; completedGreen: Paint; unownedBlue: Paint; secondary: Paint } {
  const ansi256 = (code: number): Paint => (s) => (pc.isColorSupported ? `\x1b[38;5;${code}m${s}\x1b[39m` : s);
  const rgb = ([r, g, b]: readonly [number, number, number]): Paint => (s) =>
    pc.isColorSupported ? `\x1b[38;2;${r};${g};${b}m${s}\x1b[39m` : s;
  return {
    completed: ansi256(COMPLETED_GRAY_256),
    completedGreen: rgb(COMPLETED_GREEN_RGB),
    unownedBlue: rgb(UNOWNED_BLUE_RGB),
    secondary: ansi256(SECONDARY_GRAY_256),
  };
}

/**
 * Barra de avance y pasos de un plan (de la tarea en progreso o de una pausada): los hechos con
 * el texto tachado, el actual resaltado y el resto normales. Sin plan, no agrega nada.
 */
function planRows(plan: Plan, indent: number, row: Row, pc: Colors): void {
  if (!plan.total) return;
  const { secondary } = tones(pc);
  row(indent, { paint: pc.green, text: `Plan ${progressBar(plan.done, plan.total)} ${plan.done}/${plan.total}` });
  for (const step of plan.steps) {
    if (step.done) row(indent + 2, { paint: secondary, text: "✔ " }, { paint: (s) => secondary(pc.strikethrough(s)), text: step.text });
    else if (step === plan.currentStep) row(indent + 2, { paint: (s) => pc.bold(pc.green(s)), text: `▸ ${step.text}` });
    else row(indent + 2, { text: `○ ${step.text}` });
  }
}

/**
 * Tramos de una tarea completada: el nombre y la fecha (los dos en el mismo gris) y, aparte, la
 * marca de descartada. Si no entra en el ancho del recuadro, se recorta el nombre (no la fecha).
 */
function completedSegments(entry: HistoryEntry, width: number, pc: Colors, reserve = 0): Segment[] {
  const { completed, completedGreen } = tones(pc);
  // El prefijo `T-N` va en el verde del título; el resto del nombre, en el gris de las completadas.
  const prefix = entry.number == null ? "" : `T-${entry.number}`;
  const rest = plainText(entry.number == null ? entry.title : shortTaskName(entry.number, entry.title).slice(prefix.length));
  const discarded = entry.status === "discarded" ? " ✖ (descartada)" : "";
  const date = entry.date ? ` · ${entry.date}` : "";
  const room = width - 4 - visibleLength(prefix + discarded + date) - reserve;
  const segments: Segment[] = [];
  if (prefix) segments.push({ paint: completedGreen, text: prefix });
  segments.push({ paint: completed, text: truncate(rest, Math.max(1, room)) });
  if (discarded) segments.push({ paint: pc.red, text: discarded });
  if (date) segments.push({ paint: completed, text: date });
  return segments;
}

/** Una tarea bloqueada y, debajo, las tareas de las que depende. */
function blockedRows(task: BlockedTask, row: Row, pc: Colors): void {
  const { secondary } = tones(pc);
  const tag = task.block.tag ? ` [${task.block.tag}]` : "";
  row(0, { paint: pc.red, text: `${shortTaskName(task.number, task.title)}${tag}` });
  for (const ref of task.dependsOn) row(5, { paint: ref.closed ? pc.yellow : secondary, text: dependencyText(ref) });
}

/** `→ espera T-3: título`, con la pista de la Regla 8 si esa tarea ya se cerró. */
export function dependencyText(ref: TaskRef): string {
  const base = `→ espera ${shortTaskName(ref.number, ref.title)}`;
  return ref.closed ? `${base} (cerrada ✔ — ¿moverla a libres?)` : base;
}
