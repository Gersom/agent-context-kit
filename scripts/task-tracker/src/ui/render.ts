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
  Plan,
  RenderMeta,
  TeamBacklogModel,
  TeamModel,
  TeamRenderMeta,
  TeamRow,
} from "../shared/types.ts";
import type { HistoryEntry, TaskRef } from "../../../_shared/types.ts";
import { boxBottom, boxRow, boxTop, type Paint, type Segment } from "./box.ts";
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

type Colors = ReturnType<typeof picocolors.createColors>;
/** Agrega una fila al recuadro abierto: sangría + tramos con estilo. */
type Row = (indent: number, ...segments: Segment[]) => void;

/**
 * Lienzo de una pantalla: las líneas, los recuadros y el encabezado ya escrito. `subtitle` es lo
 * que va después del nombre del proyecto (el operador en su panel, "equipo" en la vista de equipo).
 */
function createCanvas(meta: RenderMeta, subtitle?: string) {
  const pc: Colors = meta.color === undefined ? picocolors : picocolors.createColors(meta.color);
  const width = screenWidth(meta.width);
  const out: string[] = [];
  const line = (indent: number, text: string, color: Paint = (s) => s) =>
    out.push(" ".repeat(indent) + color(truncate(plainText(text), width - indent)));
  const blank = () => out.push("");

  const { secondary, completed, completedGreen } = tones(pc);

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
  line(0, `▣ ${displayProjectName(meta.projectName)}${subtitle ? ` · ${subtitle}` : ""}`, (s) => pc.bold(pc.magenta(s)));
  line(2, meta.projectDir, secondary);
  line(2, `Última actualización ${formatTime(meta.updatedAt)} · ${triggerText(meta.trigger)}`, secondary);
  blank();

  return { pc, width, out, line, blank, box, secondary, completed, completedGreen };
}

type Canvas = ReturnType<typeof createCanvas>;

/** Avisos, notas y pie con las teclas; cierra la pantalla y la devuelve como texto. */
function finishCanvas({ out, line, blank, secondary, pc }: Canvas, meta: RenderMeta, model: { notes?: string[]; warnings: string[] }): string {
  const notes = model.notes ?? [];
  if (notes.length || model.warnings.length) blank();
  for (const note of notes) line(0, `ℹ ${note}`, secondary);
  for (const warning of model.warnings) line(0, `! ${warning}`, pc.yellow);

  const footer = footerText(meta.controls ?? "ctrl-c", meta.multiView);
  if (footer) {
    blank();
    line(0, footer, secondary);
  }
  return out.join("\n") + "\n";
}

/** Etapas por las que pasa una tarea, de arriba abajo en la pantalla (ver `arrowText`). */
export type Stage = "unowned" | "blocked" | "free" | "current" | "paused" | "completed";

/** Lo que dice la flecha entre una etapa y la siguiente que se muestra. */
const ARROWS: Partial<Record<`${Stage}>${Stage}`, string>> = {
  "unowned>blocked": "↓ se toma",
  "unowned>free": "↓ se toma",
  "unowned>current": "↓ se toma",
  "blocked>free": "↑ bloquea · ↓ desbloquea",
  "free>current": "↓ empieza",
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
 * de una tarea, de arriba abajo: sin dueño → bloqueadas ⇅ libres → en progreso ⇅ pausadas →
 * completadas, con una línea de flecha entre los que se muestran. Ver `RenderMeta`.
 */
export function render(model: Model, meta: RenderMeta): string {
  const canvas = createCanvas(meta, meta.operator);
  const { pc, width, box, line, secondary, completedGreen } = canvas;

  const stages: { id: Stage; shown: boolean; draw: () => void }[] = [
    // team-backlog.md (modo multi-operador): las tareas sin dueño
    { id: "unowned", shown: Boolean(meta.teamBacklog?.present), draw: () => meta.teamBacklog && teamBacklogBox(canvas, meta.teamBacklog) },

    // backlog.md (compacto): bloqueadas solo si hay alguna
    {
      id: "blocked",
      shown: model.hasBacklog && model.blocked.length > 0,
      draw: () =>
        box(`BLOQUEADAS (${model.counts.blocked})`, "backlog.md", pc.red, (row) => {
          for (const task of model.blocked) blockedRows(task, row, pc);
        }),
    },
    {
      id: "free",
      shown: model.hasBacklog,
      draw: () =>
        box(`LIBRES (${model.counts.free})`, "backlog.md", pc.cyan, (row) => {
          if (!model.free.tasks.length && !model.free.groups.length) row(0, { paint: secondary, text: "Ninguna" });
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
          for (const entry of model.completed) row(0, ...completedSegments(entry, width, pc));
        }),
    },
  ];

  let previous: Stage | null = null;
  for (const stage of stages) {
    if (!stage.shown) continue;
    if (previous) line(3, arrowText(previous, stage.id), secondary);
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

  if (team.teamBacklog.present) teamBacklogBox(canvas, team.teamBacklog);
  return finishCanvas(canvas, meta, { warnings: team.warnings });
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

/**
 * Recuadro "SIN DUEÑO": las tareas del team-backlog.md, libres primero y después las bloqueadas.
 * Usa la paleta de "tareas completadas" (título y viñeta en su verde, texto en su gris); solo el
 * tag de bloqueo va en rojo, para no perder esa señal.
 */
function teamBacklogBox({ box, pc, secondary, completed, completedGreen }: Canvas, backlog: TeamBacklogModel): void {
  if (!backlog.present) return;
  const total = backlog.free.length + backlog.blocked.length;
  box(`SIN DUEÑO (${total})`, "team-backlog.md", completedGreen, (row) => {
    if (!total) row(0, { paint: secondary, text: "Ninguna" });
    for (const task of [...backlog.free, ...backlog.blocked]) {
      row(0, { paint: completedGreen, text: "• " }, { paint: completed, text: task.title }, ...(task.block.tag ? [{ paint: pc.red, text: ` [${task.block.tag}]` }] : []));
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

function footerText(controls: NonNullable<RenderMeta["controls"]>, multiView: RenderMeta["multiView"]): string | null {
  if (controls === "keys") {
    if (multiView === "team") return "↑/↓ elegir · Enter abrir · q o Ctrl+C salir · r redibujar";
    if (multiView === "operator") return "b o Esc volver al equipo · q o Ctrl+C salir · r redibujar";
    return "q o Ctrl+C para salir · r para redibujar";
  }
  if (controls === "ctrl-c") return "Ctrl+C para salir";
  return null;
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
function tones(pc: Colors): { completed: Paint; completedGreen: Paint; secondary: Paint } {
  const ansi256 = (code: number): Paint => (s) => (pc.isColorSupported ? `\x1b[38;5;${code}m${s}\x1b[39m` : s);
  const rgb = ([r, g, b]: readonly [number, number, number]): Paint => (s) =>
    pc.isColorSupported ? `\x1b[38;2;${r};${g};${b}m${s}\x1b[39m` : s;
  return {
    completed: ansi256(COMPLETED_GRAY_256),
    completedGreen: rgb(COMPLETED_GREEN_RGB),
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
function completedSegments(entry: HistoryEntry, width: number, pc: Colors): Segment[] {
  const { completed, completedGreen } = tones(pc);
  // El prefijo `T-N` va en el verde del título; el resto del nombre, en el gris de las completadas.
  const prefix = entry.number == null ? "" : `T-${entry.number}`;
  const rest = plainText(entry.number == null ? entry.title : shortTaskName(entry.number, entry.title).slice(prefix.length));
  const discarded = entry.status === "discarded" ? " ✖ (descartada)" : "";
  const date = entry.date ? ` · ${entry.date}` : "";
  const room = width - 4 - visibleLength(prefix + discarded + date);
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

/** `→ espera T-3: título`, con la pista de la Regla 7 si esa tarea ya se cerró. */
export function dependencyText(ref: TaskRef): string {
  const base = `→ espera ${shortTaskName(ref.number, ref.title)}`;
  return ref.closed ? `${base} (cerrada ✔ — ¿moverla a libres?)` : base;
}
