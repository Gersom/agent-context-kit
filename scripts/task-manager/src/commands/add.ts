// `add`: agrega una tarea al `backlog.md` propio (con el número de «Próximo número de tarea», que
// pasa a N+1 en la misma edición) o, con `--team`, al `team-backlog.md` compartido (sin número, con
// un título único y `Agregada: <fecha> por <operador>`). Va a «libres» o a «bloqueadas» según su
// bloqueo, al final de la sección y con el espaciado del archivo; si la sección solo tenía el texto
// de vacío o un placeholder, la tarea lo reemplaza. Sin `--apply` solo muestra el diff.

import { blockInfo } from "../../../_shared/tasks/block-info.ts";
import { CliError, UsageError } from "../cli/errors.ts";
import type { Command, CommandContext } from "../cli/types.ts";
import { blockSeparator, insertBlock } from "../edit/layout.ts";
import { normalizeTitle } from "../query/find.ts";
import { relFile } from "../query/format.ts";
import { requireDoc } from "../workspace/docs.ts";
import { requireOwnFolder } from "../workspace/ownership.ts";
import { BLOCKING_TAGS } from "../write/blocking.ts";
import { requiredFlag, singleLine, textFlag } from "../write/flags.ts";
import { detectLanguage, NONE_RE, STRINGS } from "../write/language.ts";
import { reserveNextNumber } from "../write/numbering.ts";
import { formatLocalDate, renderTaskBlock } from "../write/render.ts";
import { backlogTasks, headerLabels, labelResolver } from "../write/samples.ts";

/** ¿El texto de `--bloqueo` bloquea la tarea? Si dice algo pero sin el tag esperado, avisa en vez de adivinar. */
export function classifyBlocker(value: string): { blocked: boolean; warning: string | null } {
  if (!value.trim() || NONE_RE.test(value.trim())) return { blocked: false, warning: null };
  const { tag } = blockInfo({ fields: [{ label: "Bloqueos", value }] });
  if (tag && BLOCKING_TAGS.test(tag)) return { blocked: true, warning: null };
  return {
    blocked: false,
    warning: "--bloqueo no empieza con `[dependencia]` ni `[postergada]`: la tarea va a «libres» (si debe quedar bloqueada, empieza el texto con uno de los dos tags).",
  };
}

export const add: Command = {
  name: "add",
  summary: "Agrega una tarea a tu backlog.md (o al team-backlog.md con --team); escribe con --apply",
  usage:
    "add --titulo <título> --descripcion <texto> [--decisiones <texto>] [--bloqueo <texto>] [--disparador <texto>] [--detalles <texto>] [--team] [--apply]",
  writes: true,
  flags: {
    titulo: { type: "string", valueName: "título", stdin: true, description: "Título de la tarea (una línea). Obligatorio." },
    descripcion: { type: "string", valueName: "texto", stdin: true, description: "De qué trata (1–3 líneas). Obligatorio." },
    decisiones: {
      type: "string",
      valueName: "texto",
      stdin: true,
      description: "Decisiones/temas a definir antes de empezar. Por defecto «Ninguno.».",
    },
    bloqueo: {
      type: "string",
      valueName: "texto",
      stdin: true,
      description: "Bloqueo: «Ninguno.» (por defecto) o un texto que empiece con `[dependencia]` o `[postergada]` (va a «bloqueadas»).",
    },
    disparador: {
      type: "string",
      valueName: "texto",
      stdin: true,
      description: "Cuándo corresponde tomarla. Por defecto, el genérico de la plantilla. No aplica con --team.",
    },
    detalles: { type: "string", valueName: "texto", stdin: true, description: "Contexto extendido. Opcional: si no se pasa, el campo se omite." },
    team: {
      type: "boolean",
      description: "Agregarla al team-backlog.md compartido (sin número; título único) en vez de a tu backlog.md. Sirve también al operador «solo team-backlog».",
    },
  },
  run(ctx) {
    const { flags } = ctx;
    const title = singleLine("titulo", requiredFlag(flags, "titulo"));
    const input = {
      title,
      description: requiredFlag(flags, "descripcion"),
      decisions: textFlag(flags, "decisiones"),
      blocker: textFlag(flags, "bloqueo"),
      trigger: textFlag(flags, "disparador"),
      details: textFlag(flags, "detalles"),
    };
    return flags.team === true ? addToTeam(ctx, input) : addToBacklog(ctx, input);
  },
};

interface AddInput {
  title: string;
  description: string;
  decisions?: string;
  blocker?: string;
  trigger?: string;
  details?: string;
}

function addToBacklog(ctx: CommandContext, input: AddInput): void {
  const { io } = ctx;
  const ws = ctx.workspace();
  requireOwnFolder(ws);
  const docs = ctx.docs();
  const backlog = requireDoc(docs.backlog, "backlog.md");
  const reserved = reserveNextNumber(docs);

  const kind = classifyBlocker(input.blocker ?? "");
  const sectionId = kind.blocked ? "blocked" : "free";
  const section = backlog.parsed.sections[sectionId];
  if (!section) {
    throw new CliError(`backlog.md no tiene la sección «${sectionId}» (${kind.blocked ? "tareas bloqueadas / pospuestas" : "tareas libres"}): no sé dónde agregar la tarea. No se escribió nada.`);
  }

  // Idioma y etiquetas: las de las tareas que el archivo ya tiene; si no hay, la tabla mínima.
  const labels = headerLabels(docs);
  const { lang, notice } = detectLanguage(labels);
  const S = STRINGS[lang];
  const tasks = backlogTasks(docs);
  const sectionTasks = kind.blocked ? backlog.parsed.blocked : backlog.parsed.free.tasks;
  const label = labelResolver([...sectionTasks, ...tasks].map((task) => task.fields), S);
  const header = `### ${labels[0] ?? S.task} ${reserved.number} — ${input.title}`;

  const fields: Array<[string, string]> = [
    [label("description"), input.description],
    [label("decisions"), input.decisions ?? S.none],
    [label("blockers"), input.blocker ?? S.none],
    [label("trigger"), input.trigger ?? S.defaultTrigger],
  ];
  if (input.details) fields.push([label("details"), input.details]);
  fields.push([label("added"), `${formatLocalDate(ctx.now())}.`]);
  const block = renderTaskBlock(header, fields);

  const blocks = kind.blocked ? backlog.parsed.blocked : [...backlog.parsed.free.tasks, ...backlog.parsed.free.groups];
  const insert = insertBlock(backlog.text, section.bodyRange, block, {
    hasBlocks: blocks.length > 0,
    separator: blockSeparator(backlog.text, blocks.flatMap((b) => (b.range ? [b.range] : []))),
  });

  const result = ctx.commit([{ doc: backlog, edits: [insert, reserved.edit] }]);
  if (result.files.some((file) => file.written)) {
    io.out(`Tarea ${reserved.number} agregada a «${kind.blocked ? "Tareas bloqueadas / pospuestas" : "Tareas libres"}» de ${relFile(ws, backlog.path)} (próximo número: ${reserved.number + 1}).`);
  }
  for (const warning of [kind.warning, notice]) if (warning) io.out(`Aviso: ${warning}`);
}

function addToTeam(ctx: CommandContext, input: AddInput): void {
  const { io } = ctx;
  if (input.trigger) {
    throw new UsageError("--disparador no aplica con --team: las tareas del team-backlog.md no llevan Disparador (lo completa quien la toma).");
  }
  // El operador «solo team-backlog» no tiene carpeta, pero sí puede agregar acá.
  const ws = ctx.workspace({ allowFolderless: true });
  if (ws.mode === "flat" || !ws.operator) {
    throw new CliError("--team no aplica: el repo es plano (no hay operators.md ni team-backlog.md compartido).");
  }
  const operator = ws.operator.folder;
  const docs = ctx.docs({ allowFolderless: true });
  const team = requireDoc(docs.teamBacklog, "team-backlog.md");

  const all = [...team.parsed.free, ...team.parsed.blocked].filter((task) => !task.isPlaceholder);
  const wanted = normalizeTitle(input.title);
  const repeated = all.find((task) => normalizeTitle(task.title) === wanted);
  if (repeated) {
    throw new CliError(`Ya hay una tarea con el título «${repeated.title}» en team-backlog.md: el título identifica la tarea y debe ser único. No se escribió nada.`);
  }

  const kind = classifyBlocker(input.blocker ?? "");
  const sectionId = kind.blocked ? "blocked" : "free";
  const section = team.parsed.sections[sectionId];
  if (!section) {
    throw new CliError(`team-backlog.md no tiene la sección «${sectionId}» (${kind.blocked ? "tareas bloqueadas / pospuestas" : "tareas libres"}): no sé dónde agregar la tarea. No se escribió nada.`);
  }

  const fieldLists = [...team.parsed.free, ...team.parsed.blocked].map((task) => task.fields);
  const detected = detectLanguage([
    ...fieldLists.flat().map((field) => field.label),
    ...headerLabels(docs),
  ]);
  const S = STRINGS[detected.lang];
  const label = labelResolver(fieldLists, S);

  const fields: Array<[string, string]> = [
    [label("description"), input.description],
    [label("decisions"), input.decisions ?? S.none],
    [label("blockers"), input.blocker ?? S.none],
  ];
  if (input.details) fields.push([label("details"), input.details]);
  fields.push([label("added"), `${formatLocalDate(ctx.now())} ${S.by} ${operator}`]);
  const block = renderTaskBlock(`### ${input.title}`, fields);

  const sectionTasks = (kind.blocked ? team.parsed.blocked : team.parsed.free).filter((task) => !task.isPlaceholder);
  const insert = insertBlock(team.text, section.bodyRange, block, {
    hasBlocks: sectionTasks.length > 0,
    separator: blockSeparator(team.text, sectionTasks.flatMap((task) => (task.range ? [task.range] : []))),
  });

  const result = ctx.commit([{ doc: team, edits: [insert] }]);
  if (result.files.some((file) => file.written)) {
    io.out(`Tarea «${input.title}» agregada a «${kind.blocked ? "Tareas bloqueadas / pospuestas" : "Tareas libres"}» de ${relFile(ws, team.path)} (por ${operator}).`);
  }
  for (const warning of [kind.warning, detected.notice]) if (warning) io.out(`Aviso: ${warning}`);
}
