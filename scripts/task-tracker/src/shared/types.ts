// Tipos propios del task-tracker: el modelo que se pinta en pantalla y los resultados de leer
// archivos y resolver rutas. Los tipos del dominio (tareas, secciones, historial) viven en
// `scripts/_shared/types.ts`.

import type {
  BlockInfo,
  CurrentTaskLine,
  Group,
  HistoryEntry,
  OperatorEntry,
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

/**
 * Modo multi-operador: `agentsDir` es la raíz de agentes (con `operators.md`) y `multi` dice qué
 * abrir. `operator`: panel que se abre de frente (segundo argumento); `preferred`: carpeta del
 * operador del correo de git, o `null` si no figura con carpeta.
 */
export interface MultiInfo {
  operator?: string;
  preferred: string | null;
}
export type ResolveOk = { ok: true; agentsDir: string; projectName: string; projectDir: string; multi?: MultiInfo };
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
  /** Carpeta del operador vigilado (modo multi-operador); se muestra en el encabezado. */
  operator?: string;
  /** Tareas sin dueño (modo multi-operador): se pintan en el recuadro "SIN DUEÑO" debajo de las bloqueadas. */
  teamBacklog?: TeamBacklogModel;
  /** En modo multi-operador, qué vista es (cambia las teclas que indica el pie). */
  multiView?: "team" | "operator";
  /**
   * `true`: los recuadros de tareas, salvo en progreso y pausadas, muestran una sola tarea (la más
   * reciente) y cuántas más hay, para ocupar menos pantalla.
   */
  compact?: boolean;
  /** `false`: sin las líneas de flecha entre recuadros. Por defecto `true`. */
  arrows?: boolean;
  updatedAt: Date;
  trigger: DrawTrigger;
  /** Por defecto `"ctrl-c"`. */
  controls?: Controls;
  width?: number;
  /** `false` para salida sin códigos ANSI (tests); por defecto, lo que detecte picocolors. */
  color?: boolean;
}

/** Lo leído de un operador en la vista de equipo; `snapshot: null` si no tiene carpeta (`solo team-backlog`). */
export interface TeamOperatorRead {
  entry: OperatorEntry;
  snapshot: SnapshotRead | null;
}

/** Lo leído para la vista de equipo: cada operador, el `team-backlog.md` y los avisos de lectura. */
export interface TeamRead {
  operators: TeamOperatorRead[];
  teamBacklogText: string | null;
  warnings: string[];
  needsRetry: boolean;
}

/** Fila del recuadro EQUIPO: un operador, lo que está haciendo y sus conteos. */
export interface TeamRow {
  folder: string;
  /** `(solo team-backlog)`: no tiene carpeta propia, así que no se puede abrir. */
  folderless: boolean;
  /** `true` si su carpeta no tiene `handoff.md` legible (la fila lo indica). */
  missing: boolean;
  current: { label: string; number: number; title: string; done: number; total: number } | null;
  counts: { free: number; blocked: number };
  /** Última entrada de su `history.md` (las más nuevas van primero). */
  lastCompleted: HistoryEntry | null;
}

/** Tarea del `team-backlog.md` lista para pintar (sin número). */
export interface TeamBacklogTask {
  title: string;
  /** Tag y motivo del bloqueo vigente; `tag: null` si no está bloqueada. */
  block: BlockInfo;
}

/** Tareas sin dueño: libres primero, después las bloqueadas. */
export interface TeamBacklogModel {
  /** `false` si no existe `team-backlog.md` (no se pinta el recuadro). */
  present: boolean;
  free: TeamBacklogTask[];
  blocked: TeamBacklogTask[];
  warnings: string[];
}

/** Modelo de la vista de equipo. */
export interface TeamModel {
  rows: TeamRow[];
  teamBacklog: TeamBacklogModel;
  warnings: string[];
}

/** Metadatos de la vista de equipo: los de siempre más qué fila está elegida y cuál es "tú". */
export interface TeamRenderMeta extends RenderMeta {
  /** Carpeta del operador elegido en el selector. */
  selected: string | null;
  /** Carpeta del operador del correo de git (se marca con `(tú)`). */
  preferred: string | null;
}
