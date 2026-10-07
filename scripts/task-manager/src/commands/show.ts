// `show <N>`: el bloque completo de una tarea del operador, viva donde esté (en curso, pausada,
// libre, bloqueada, agrupada o su entrada de history), leyendo solo ese fragmento del archivo y
// diciendo de dónde salió. También acepta `T-N@operador` (solo lectura de la carpeta de otro) y el
// título —o una parte única— de una tarea de `team-backlog.md`.

import type { Command } from "../cli/types.ts";
import { CliError, UsageError } from "../cli/errors.ts";
import {
  describeKnownNumbers,
  findTask,
  findTeamTasks,
  locationText,
  parseTarget,
  readOperatorDocs,
  type Place,
  type TaskLocation,
  type TeamLocation,
  type TeamPlace,
} from "../query/find.ts";
import { emitJson, relFile } from "../query/format.ts";

const PLACE_LABEL: Record<Place | TeamPlace, string> = {
  "in-progress": "en curso (handoff)",
  paused: "pausada (handoff)",
  free: "libre (backlog)",
  blocked: "bloqueada (backlog)",
  grouped: "agrupada (backlog)",
  history: "history",
  "team-free": "libre (team-backlog)",
  "team-blocked": "bloqueada (team-backlog)",
};

export const show: Command = {
  name: "show",
  summary: "Imprime el bloque completo de una tarea y de dónde salió (solo lectura)",
  usage: "show <N | T-N@operador | título de una tarea del team-backlog> [--json]",
  flags: { json: { type: "boolean", description: "Salida estructurada (JSON) en vez de texto." } },
  run({ args, flags, io, workspace, docs }) {
    if (args.length !== 1 || !args[0].trim()) {
      throw new UsageError("Indica la tarea: `show <N>`, `show T-N@operador` o `show <título de una tarea del team-backlog>`.");
    }
    const ws = workspace();
    const target = parseTarget(args[0]);
    const warnings: string[] = [];
    // Cada coincidencia con su operador (null = el propio).
    const matches: Array<(TaskLocation | TeamLocation) & { operator: string | null }> = [];

    if (target.kind === "number") {
      const own = ws.operator?.folder.toLowerCase();
      const other = target.operator && target.operator.toLowerCase() !== own ? readOperatorDocs(ws, target.operator) : null;
      const source = other?.docs ?? docs();
      const operator = other?.folder ?? (target.operator ? (ws.operator?.folder ?? null) : null);
      const found = findTask(source, target.number);
      if (!found.length) {
        const where = other ? `en la carpeta de ${other.folder}` : ws.operator ? `en la carpeta de ${ws.operator.folder}` : "en este proyecto";
        throw new CliError(`No existe la Tarea ${target.number} ${where}. ${describeKnownNumbers(source)}`);
      }
      matches.push(...found.map((location) => ({ ...location, operator })));
      if (found.length > 1) {
        warnings.push(
          `La Tarea ${target.number} aparece en ${found.length} lugares (${found.map((l) => PLACE_LABEL[l.place]).join(", ")}): una tarea vive en un solo lugar, revisa cuál es el correcto.`,
        );
      }
    } else {
      const all = docs();
      if (!all.teamBacklog?.exists) {
        throw new CliError(`«${target.query}» no es un número de tarea y no hay team-backlog.md donde buscar un título${all.teamBacklog ? "" : " (el repo es plano)"}.`);
      }
      const found = findTeamTasks(all, target.query);
      if (!found.length) throw new CliError(`Ninguna tarea del team-backlog.md tiene «${target.query}» en su título.`);
      const titles = [...new Set(found.map((l) => l.title))];
      if (titles.length > 1) {
        throw new CliError(`«${target.query}» coincide con ${titles.length} tareas del team-backlog.md; sé más específico:\n${titles.map((t) => `  - ${t}`).join("\n")}`);
      }
      matches.push(...found.map((location) => ({ ...location, operator: null })));
      if (found.length > 1) warnings.push(`El título «${titles[0]}» aparece ${found.length} veces en el team-backlog.md: deberían ser únicos.`);
    }

    const rows = matches.map((match) => ({
      place: match.place,
      number: "number" in match ? match.number : null,
      title: match.title,
      group: "group" in match ? match.group : null,
      outcome: "outcome" in match ? match.outcome : null,
      operator: match.operator,
      file: relFile(ws, match.doc.path),
      path: match.doc.path,
      startLine: match.range.startLine,
      endLine: match.range.endLine,
      text: locationText(match),
    }));

    if (flags.json === true) {
      emitJson(io, "show", { query: args[0], matches: rows, warnings });
      return;
    }

    rows.forEach((row, i) => {
      if (i > 0) io.out();
      const who = row.operator ? ` · @${row.operator}` : "";
      const group = row.group ? ` · grupo «${row.group}»` : "";
      const outcome = row.outcome ? ` (${row.outcome === "done" ? "hecha" : "descartada"})` : "";
      io.out(`--- ${row.number != null ? `Tarea ${row.number}` : "Team-backlog"} · ${PLACE_LABEL[row.place]}${outcome}${who}${group} · ${row.file} líneas ${row.startLine}-${row.endLine} ---`);
      io.out(row.text);
    });
    for (const warning of warnings) io.out(`Aviso: ${warning}`);
  },
};
