// Tipos compartidos del task-tracker: lo que produce el parseo de handoff.md, backlog.md y
// history.md, el modelo que se pinta en pantalla y los resultados de leer archivos y resolver rutas.

/** Campo `- **Etiqueta:** valor` de una tarea; la etiqueta queda tal cual (está traducida). */
export interface Field {
  label: string;
  value: string;
  isPlaceholder: boolean;
}

/** Tarea con header `### Tarea N — título` (`####` dentro de un grupo). */
export interface Task {
  number: number;
  /** Palabra del header tal como está escrita (ej. "Tarea", "Task"). */
  label: string;
  title: string;
  level: number;
  fields: Field[];
  body: string;
  isPlaceholder: boolean;
}

/** Grupo de tareas: referencia en "Tareas libres" o contenedor en "Tareas agrupadas". */
export interface Group {
  label: string;
  title: string;
  taskNumbers: number[];
  tasks: Task[];
  body: string;
}

export interface ParsedBlocks {
  tasks: Task[];
  groups: Group[];
}

/** Sección `## ` ubicada por su ancla (o por posición, en el plan B). */
export interface Section {
  header: string;
  body: string;
}

export interface SectionsResult {
  sections: Record<string, Section>;
  usedFallback: boolean;
  missing: string[];
}

/** Línea de la tarea en progreso (`**Tarea:** Tarea 9 — título`). */
export interface CurrentTaskLine {
  label: string;
  number: number;
  title: string;
}

export interface PlanStep {
  text: string;
  done: boolean;
}

export interface Subsection {
  title: string;
  body: string;
}

export interface InProgress {
  task: CurrentTaskLine | null;
  steps: PlanStep[];
  subsections: Subsection[];
}

/** Lo que tienen en común handoff.md y backlog.md ya interpretados. */
export interface ParsedFile {
  usedFallback: boolean;
  missing: string[];
  placeholders: boolean;
}

export interface ParsedHandoff extends ParsedFile {
  inProgress: InProgress;
  paused: Task[];
}

export interface ParsedBacklog extends ParsedFile {
  free: ParsedBlocks;
  blocked: Task[];
  grouped: Group[];
}

export interface BlockInfo {
  tag: string | null;
  reason: string | null;
}

/** Tarea referenciada por un grupo pero sin detalle en "Tareas agrupadas". */
export interface MissingTaskRef {
  number: number;
  label: null;
  title: null;
}

/** Grupo de "Tareas libres" con sus tareas enlazadas desde "Tareas agrupadas". */
export type FreeGroup = Omit<Group, "tasks"> & { tasks: Array<Task | MissingTaskRef> };

/** Tarea mencionada en el motivo de un bloqueo (ej. "depende de la Tarea 3"). */
export interface TaskRef {
  number: number;
  /** Título si se encontró en backlog, handoff o history; `null` si no. */
  title: string | null;
  /** `true` si la tarea ya figura cerrada en history.md (pista para la Regla 7). */
  closed: boolean;
}

export interface BlockedTask extends Task {
  block: BlockInfo;
  /** Tareas de las que depende, según lo que menciona el motivo del bloqueo. */
  dependsOn: TaskRef[];
}

export interface Plan {
  steps: PlanStep[];
  done: number;
  total: number;
  currentStep: PlanStep | null;
}

export interface CurrentTask extends CurrentTaskLine {
  plan: Plan;
  /** Subsecciones de la tarea salvo la que contiene los checkboxes del plan. */
  details: Subsection[];
  subsections: Subsection[];
}

/** Entrada de history.md: `## <fecha> — ✅|❌ [Tarea N —] título`. */
export interface HistoryEntry {
  date: string;
  status: "done" | "discarded";
  /** `null` si la entrada no tiene número de tarea (ej. tareas anteriores a la numeración). */
  number: number | null;
  label: string | null;
  title: string;
}

export interface ParsedHistory {
  entries: HistoryEntry[];
}

/** Modelo completo para la pantalla. */
export interface Model {
  hasBacklog: boolean;
  hasHistory: boolean;
  /** Últimas entradas de history.md (las más nuevas primero). */
  completed: HistoryEntry[];
  current: CurrentTask | null;
  paused: Task[];
  free: { tasks: Task[]; groups: FreeGroup[] };
  blocked: BlockedTask[];
  grouped: Group[];
  counts: { paused: number; free: number; blocked: number };
  warnings: string[];
  notes: string[];
}

/** Resultado de leer un archivo sin cortar el programa. */
export interface ReadResult {
  /** `null` si no existe o no se pudo leer. */
  text: string | null;
  error: string | null;
  /** Código del error de lectura (ej. `EBUSY`), si lo hubo. */
  code: string | null;
}

export type ReadFile = (path: string) => ReadResult;

export interface SnapshotRead {
  handoffText: string | null;
  backlogText: string | null;
  historyText: string | null;
  warnings: string[];
  needsRetry: boolean;
}

export type ResolveOk = { ok: true; agentsDir: string; projectName: string; projectDir: string };
export type ResolveError = { ok: false; error: string; tried: string[] };
export type ResolveResult = ResolveOk | ResolveError;

/**
 * Qué provocó el redibujo, para el encabezado: el primer pintado, un cambio en un archivo
 * (`file: null` si el SO no informó cuál) o un redibujo sin cambio de archivos (atajo `r`,
 * cambio de tamaño de la terminal, error del watcher).
 */
export type DrawTrigger = { kind: "start" } | { kind: "change"; file: string | null } | { kind: "redraw" };

/** Qué atajos se muestran al pie: los de teclado, solo Ctrl+C, o ninguno (`--once`). */
export type Controls = "keys" | "ctrl-c" | "none";

export interface RenderMeta {
  /** Nombre de la carpeta del repo, tal cual (se formatea al pintar). */
  projectName: string;
  /** Ruta del repo (o la carpeta vigilada, si no sigue la estructura `docs/agents`). */
  projectDir: string;
  updatedAt: Date;
  trigger: DrawTrigger;
  /** Por defecto `"ctrl-c"`. */
  controls?: Controls;
  width?: number;
  /** `false` para salida sin códigos ANSI (tests); por defecto, lo que detecte picocolors. */
  color?: boolean;
}
