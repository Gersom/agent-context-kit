// Tipos del dominio compartidos por los scripts: lo que produce el parseo de handoff.md,
// backlog.md y history.md (tareas, secciones, campos, entradas de historial).

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

/**
 * Tarea pausada: sus campos (sin el que solo contiene los checkboxes del plan, que se muestra
 * aparte) y los pasos del plan que traía al pausarse.
 */
export interface ParsedPausedTask extends Task {
  steps: PlanStep[];
}

export interface ParsedHandoff extends ParsedFile {
  inProgress: InProgress;
  paused: ParsedPausedTask[];
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

/** Tarea mencionada en el motivo de un bloqueo (ej. "depende de la Tarea 3"). */
export interface TaskRef {
  number: number;
  /** Título si se encontró en backlog, handoff o history; `null` si no. */
  title: string | null;
  /** `true` si la tarea ya figura cerrada en history.md (pista para la Regla 7). */
  closed: boolean;
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
