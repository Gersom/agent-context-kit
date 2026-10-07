// Tipos propios del task-tracker: el modelo que se pinta en pantalla y los resultados de leer
// archivos y resolver rutas. Los tipos del dominio (tareas, secciones, historial) viven en
// `scripts/_shared/types.ts`.

import type {
  BlockInfo,
  CurrentTaskLine,
  Group,
  HistoryEntry,
  ParsedPausedTask,
  PlanStep,
  Subsection,
  Task,
  TaskRef,
} from "../../../_shared/types.ts";

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
  /** Tareas de las que depende, según lo que menciona el motivo del bloqueo. */
  dependsOn: TaskRef[];
}

export interface Plan {
  steps: PlanStep[];
  done: number;
  total: number;
  currentStep: PlanStep | null;
}

/** Tarea pausada con el avance de su plan (vacío si no traía plan). */
export interface PausedTask extends ParsedPausedTask {
  plan: Plan;
}

export interface CurrentTask extends CurrentTaskLine {
  plan: Plan;
  /** Subsecciones de la tarea salvo la que contiene los checkboxes del plan. */
  details: Subsection[];
  subsections: Subsection[];
}

/** Modelo completo para la pantalla. */
export interface Model {
  hasBacklog: boolean;
  hasHistory: boolean;
  /** Últimas entradas de history.md (las más nuevas primero). */
  completed: HistoryEntry[];
  current: CurrentTask | null;
  paused: PausedTask[];
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

/** `operator`: carpeta del operador vigilado, solo en modo multi-operador. */
export type ResolveOk = { ok: true; agentsDir: string; projectName: string; projectDir: string; operator?: string };
/** `operatorChoices`: carpetas entre las que elegir cuando el operador no se pudo resolver solo. */
export type ResolveError = { ok: false; error: string; tried: string[]; operatorChoices?: string[] };
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
  /** Carpeta del operador vigilado (modo multi-operador); se muestra en el encabezado. */
  operator?: string;
  updatedAt: Date;
  trigger: DrawTrigger;
  /** Por defecto `"ctrl-c"`. */
  controls?: Controls;
  width?: number;
  /** `false` para salida sin códigos ANSI (tests); por defecto, lo que detecte picocolors. */
  color?: boolean;
}
