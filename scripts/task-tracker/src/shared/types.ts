// Tipos compartidos del task-tracker: lo que produce el parseo de handoff.md y backlog.md, el
// modelo que se pinta en pantalla y los resultados de leer archivos y resolver rutas.

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

export interface BlockedTask extends Task {
  block: BlockInfo;
}

export interface Plan {
  steps: PlanStep[];
  done: number;
  total: number;
  currentStep: PlanStep | null;
}

export interface CurrentTask extends CurrentTaskLine {
  plan: Plan;
  nextStep: string | null;
  subsections: Subsection[];
}

/** Modelo completo para la pantalla. */
export interface Model {
  hasBacklog: boolean;
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
  warnings: string[];
  needsRetry: boolean;
}

export type ResolveOk = { ok: true; agentsDir: string; projectName: string };
export type ResolveError = { ok: false; error: string; tried: string[] };
export type ResolveResult = ResolveOk | ResolveError;

export interface RenderMeta {
  projectName: string;
  agentsDir: string;
  updatedAt: Date;
  /** `undefined` → primer pintado; `null` → cambio sin nombre de archivo (el SO no lo informó). */
  changedFile?: string | null;
  width?: number;
  /** `false` para salida sin códigos ANSI (tests); por defecto, lo que detecte picocolors. */
  color?: boolean;
}
