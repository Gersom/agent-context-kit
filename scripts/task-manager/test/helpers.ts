// Ayudas de los tests: proyectos temporales con docs/agents/ (nunca se tocan los docs reales) y
// una salida capturada para el despachador.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireFixture } from "../../_shared/test/helpers.ts";
import type { Io } from "../src/cli/types.ts";
import { type Docs, readDocs } from "../src/workspace/docs.ts";

export const OPERATORS_MD = `# Operadores

---

<!-- agent-context-kit:section=operators -->
## Lista

- gersom: Gersom@Mail.com, g@work.com
- ana: ana@mail.com
- luis (solo team-backlog): luis@mail.com
- fantasma: fantasma@mail.com
`;

export const TEAM_BACKLOG_MD = `# Backlog del equipo

<!-- agent-context-kit:section=free -->
## Tareas libres

### Revisar el copy del onboarding

- **Descripción:** ajustar textos

<!-- agent-context-kit:section=blocked -->
## Tareas bloqueadas / pospuestas

Ninguna.
`;

/** Salida capturada: `out`/`err` acumulan las líneas, `text()` las junta. */
export function captureIo(): { io: Io; out: string[]; err: string[]; text: () => string } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    io: { out: (line = "") => void out.push(line), err: (line = "") => void err.push(line) },
    out,
    err,
    text: () => out.join("\n"),
  };
}

export interface Project {
  /** Raíz del proyecto temporal. */
  root: string;
  /** `docs/agents`. */
  agents: string;
  cleanup(): void;
}

export interface ProjectOptions {
  /** Operadores con carpeta (con handoff, backlog e history del fixture `es-anchors`). */
  folders?: string[];
  /** Contenido de operators.md; `null` = no crearlo. */
  operators?: string | null;
  /** Crear team-backlog.md. */
  teamBacklog?: boolean;
  /** Archivos que NO se crean en cada carpeta (ej. `["history.md"]`). */
  omit?: string[];
  /** Repo plano: los tres archivos van directo en docs/agents/. */
  flat?: boolean;
  /** Contenido a usar en lugar del fixture, en todas las carpetas (y en el plano). */
  contents?: Contents;
  /** Lo mismo, solo para la carpeta de un operador (gana sobre `contents`). */
  folderContents?: Record<string, Contents>;
  /** Contenido de team-backlog.md (implica crearlo); por defecto, `TEAM_BACKLOG_MD`. */
  teamBacklogText?: string;
}

/** Archivos con contenido propio. */
export type Contents = Partial<Record<"handoff.md" | "backlog.md" | "history.md", string>>;

/** Crea un proyecto temporal con docs/agents/. Llamar a `cleanup()` al terminar. */
export function makeProject(options: ProjectOptions = {}): Project {
  const root = mkdtempSync(join(tmpdir(), "task-manager-"));
  const agents = join(root, "docs", "agents");
  mkdirSync(agents, { recursive: true });
  const omit = options.omit ?? [];
  const fill = (dir: string, own: Contents = {}) => {
    for (const file of ["handoff.md", "backlog.md", "history.md"] as const) {
      if (!omit.includes(file)) writeFileSync(join(dir, file), own[file] ?? options.contents?.[file] ?? requireFixture("es-anchors", file));
    }
  };

  if (options.flat) fill(agents);
  const operators = options.operators === undefined && !options.flat ? OPERATORS_MD : options.operators;
  if (operators) writeFileSync(join(agents, "operators.md"), operators);
  for (const folder of options.folders ?? []) {
    mkdirSync(join(agents, folder), { recursive: true });
    fill(join(agents, folder), options.folderContents?.[folder]);
  }
  if (options.teamBacklog || options.teamBacklogText !== undefined) {
    writeFileSync(join(agents, "team-backlog.md"), options.teamBacklogText ?? TEAM_BACKLOG_MD);
  }
  return { root, agents, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/** Los archivos de una carpeta del proyecto temporal ya leídos y parseados (la propia de un operador o el repo plano). */
export function loadDocs(p: Project, folder?: string, teamBacklog = false): Docs {
  const dir = folder ? join(p.agents, folder) : p.agents;
  return readDocs({
    files: {
      handoff: join(dir, "handoff.md"),
      backlog: join(dir, "backlog.md"),
      history: join(dir, "history.md"),
      teamBacklog: teamBacklog ? join(p.agents, "team-backlog.md") : null,
    },
  });
}
