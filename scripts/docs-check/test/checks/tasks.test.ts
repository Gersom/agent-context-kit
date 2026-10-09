import { describe, expect, test } from "bun:test";
import {
  checkBlockTags,
  checkDuplicateNumbers,
  checkNextNumber,
  checkTaskFields,
  checkTaskHeadings,
} from "../../src/checks/tasks.ts";
import {
  ANCHOR,
  BACKLOG,
  BACKLOG_WITH_GROUP,
  emptyBacklog,
  HANDOFF,
  HANDOFF_IDLE,
  HISTORY,
  HISTORY_EMPTY,
  lineOf,
  PAUSED_NONE,
  TEMPLATE_BACKLOG,
} from "../fixtures.ts";
import { brief, makeCtx, PATHS } from "../helpers.ts";

const BACKLOG_FILE = `${PATHS.flat}/backlog.md`;
const HANDOFF_FILE = `${PATHS.flat}/handoff.md`;
const HISTORY_FILE = `${PATHS.flat}/history.md`;

/** Contexto sin ninguna tarea salvo las que cada test agregue. */
const bare = (options: Parameters<typeof makeCtx>[0] = {}) =>
  makeCtx({ handoff: HANDOFF_IDLE, backlog: emptyBacklog(1), history: HISTORY_EMPTY, ...options });

describe("next-number", () => {
  test("mayor que cualquier número existente: sin hallazgos", () => {
    expect(checkNextNumber(makeCtx())).toEqual([]);
    expect(checkNextNumber(bare())).toEqual([]);
  });

  test("la línea falta: error sobre el archivo", () => {
    const backlog = BACKLOG.replace(/\*\*Próximo número de tarea:\*\* \d+\n/, "");
    const findings = checkNextNumber(makeCtx({ backlog }));
    expect(findings.map(brief)).toEqual([{ severity: "error", code: "next-number", file: BACKLOG_FILE, line: null }]);
    expect(findings[0].message).toContain("Falta la línea «Próximo número de tarea»");
  });

  test("la línea está después de la primera sección: no cuenta", () => {
    const backlog = BACKLOG.replace(/\*\*Próximo número de tarea:\*\* \d+\n/, "").replace("Ninguna.\n", "**Próximo número de tarea:** 10\n");
    expect(checkNextNumber(makeCtx({ backlog })).map((f) => f.code)).toEqual(["next-number"]);
  });

  test("N igual al máximo existente: error en la línea del campo, con el valor sugerido", () => {
    // El máximo del fixture es la Tarea 9 (libre).
    const backlog = BACKLOG.replace("**Próximo número de tarea:** 10", "**Próximo número de tarea:** 9");
    const findings = checkNextNumber(makeCtx({ backlog }));
    expect(findings.map(brief)).toEqual([
      { severity: "error", code: "next-number", file: BACKLOG_FILE, line: lineOf(backlog, "**Próximo número de tarea:**") },
    ]);
    expect(findings[0].message).toContain("(9)");
    expect(findings[0].message).toContain("la 9");
    expect(findings[0].message).toContain("a 10 como mínimo");
  });

  test("N menor que el máximo existente: error", () => {
    const backlog = BACKLOG.replace("**Próximo número de tarea:** 10", "**Próximo número de tarea:** 2");
    expect(checkNextNumber(makeCtx({ backlog })).map((f) => f.code)).toEqual(["next-number"]);
  });

  test("cuenta las tareas cerradas de history.md", () => {
    const history = `${HISTORY_EMPTY}## 2026-10-03 — ✅ Tarea 5 — Algo hecho\n\n- x\n`;
    const findings = checkNextNumber(bare({ backlog: emptyBacklog(5), history }));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("la 5");
    expect(checkNextNumber(bare({ backlog: emptyBacklog(6), history }))).toEqual([]);
  });

  test("cuenta las descartadas de history.md", () => {
    const history = `${HISTORY_EMPTY}## 2026-10-03 — ❌ Tarea 8 — Algo descartado\n\n- x\n`;
    expect(checkNextNumber(bare({ backlog: emptyBacklog(8), history }))).toHaveLength(1);
  });

  test("las entradas de history.md sin número no cuentan", () => {
    const history = `${HISTORY_EMPTY}## 2026-10-03 — ✅ Algo sin número\n\n- x\n`;
    expect(checkNextNumber(bare({ history }))).toEqual([]);
  });

  test("cuenta la tarea en curso", () => {
    const findings = checkNextNumber(bare({ handoff: HANDOFF, backlog: emptyBacklog(7) }));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("la 7");
    expect(checkNextNumber(bare({ handoff: HANDOFF, backlog: emptyBacklog(8) }))).toEqual([]);
  });

  test("cuenta las tareas pausadas", () => {
    const handoff = HANDOFF_IDLE.replace(PAUSED_NONE, `${ANCHOR("paused")}\n## Tareas pausadas\n\n### Tarea 12 — Algo pausado\n\n- **Qué falta:** todo.\n`);
    expect(checkNextNumber(bare({ handoff, backlog: emptyBacklog(12) }))).toHaveLength(1);
    expect(checkNextNumber(bare({ handoff, backlog: emptyBacklog(13) }))).toEqual([]);
  });

  test("cuenta las tareas bloqueadas", () => {
    const backlog = BACKLOG.replace("### Tarea 6 — Publicar", "### Tarea 40 — Publicar");
    const findings = checkNextNumber(makeCtx({ backlog }));
    expect(findings[0].message).toContain("la 40");
  });

  test("cuenta los números de los grupos y de sus tareas agrupadas", () => {
    const backlog = BACKLOG_WITH_GROUP.replace("**Próximo número de tarea:** 13", "**Próximo número de tarea:** 12");
    expect(checkNextNumber(makeCtx({ backlog })).map((f) => f.code)).toEqual(["next-number"]);
  });

  test("backlog.md ausente: sin hallazgos (lo avisa file-missing)", () => {
    expect(checkNextNumber(makeCtx({ backlog: null }))).toEqual([]);
  });
});

describe("task-duplicate", () => {
  test("sin números repetidos: sin hallazgos", () => {
    expect(checkDuplicateNumbers(makeCtx())).toEqual([]);
    expect(checkDuplicateNumbers(makeCtx({ backlog: BACKLOG_WITH_GROUP }))).toEqual([]);
  });

  test("el mismo número en libres y bloqueadas: error en la segunda, con las dos ubicaciones", () => {
    const backlog = BACKLOG.replace("### Tarea 6 — Publicar", "### Tarea 8 — Publicar");
    const findings = checkDuplicateNumbers(makeCtx({ backlog }));
    const first = lineOf(backlog, "### Tarea 8 — Agregar");
    const second = lineOf(backlog, "### Tarea 8 — Publicar");
    expect(findings.map(brief)).toEqual([{ severity: "error", code: "task-duplicate", file: BACKLOG_FILE, line: second }]);
    expect(findings[0].message).toContain("La Tarea 8 está repetida");
    expect(findings[0].message).toContain(`${BACKLOG_FILE}:${first} (tareas libres)`);
    expect(findings[0].message).toContain(`${BACKLOG_FILE}:${second} (tareas bloqueadas)`);
  });

  test("tres veces el mismo número: un error por cada repetición", () => {
    const backlog = BACKLOG.replace("### Tarea 6 — Publicar", "### Tarea 8 — Publicar").replace("### Tarea 9 — Revisar", "### Tarea 8 — Revisar");
    const findings = checkDuplicateNumbers(makeCtx({ backlog }));
    expect(findings.map((f) => f.line)).toEqual([lineOf(backlog, "### Tarea 8 — Revisar"), lineOf(backlog, "### Tarea 8 — Publicar")].sort((a, b) => (a ?? 0) - (b ?? 0)));
  });

  test("la tarea en curso repetida en el backlog: error en el backlog, con ambos archivos", () => {
    const backlog = BACKLOG.replace("### Tarea 8 — Agregar", "### Tarea 7 — Agregar");
    const findings = checkDuplicateNumbers(makeCtx({ backlog }));
    expect(findings.map(brief)).toEqual([
      { severity: "error", code: "task-duplicate", file: BACKLOG_FILE, line: lineOf(backlog, "### Tarea 7 — Agregar") },
    ]);
    expect(findings[0].message).toContain(`${HANDOFF_FILE}:${lineOf(HANDOFF, "Tarea 7 — Escribir")} (tarea en curso)`);
    expect(findings[0].message).toContain("(tareas libres)");
  });

  test("una pausada repetida con una libre", () => {
    const backlog = BACKLOG.replace("### Tarea 8 — Agregar", "### Tarea 5 — Agregar");
    const findings = checkDuplicateNumbers(makeCtx({ backlog }));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("(tareas pausadas)");
  });

  test("una tarea agrupada repetida con una libre", () => {
    const backlog = BACKLOG_WITH_GROUP.replace("### Grupo — Mejorar el parseo (Tareas 11, 12)", "### Tarea 11 — Otra\n\n- **Descripción:** x.\n- **Bloqueos:** Ninguno.");
    const findings = checkDuplicateNumbers(makeCtx({ backlog }));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("(tareas agrupadas)");
  });

  test("una tarea viva que figura en history.md: error en la tarea, que apunta a la entrada", () => {
    const backlog = BACKLOG.replace("### Tarea 8 — Agregar", "### Tarea 4 — Agregar");
    const findings = checkDuplicateNumbers(makeCtx({ backlog }));
    expect(findings.map(brief)).toEqual([
      { severity: "error", code: "task-duplicate", file: BACKLOG_FILE, line: lineOf(backlog, "### Tarea 4 — Agregar") },
    ]);
    expect(findings[0].message).toContain(`ya figura cerrada en ${HISTORY_FILE}:${lineOf(HISTORY, "## 2026-10-03 — ✅ Tarea 4")}`);
    expect(findings[0].message).toContain("(tareas libres)");
  });

  test("la tarea en curso que figura en history.md", () => {
    const history = `${HISTORY_EMPTY}## 2026-10-03 — ✅ Tarea 7 — Ya hecha\n\n- x\n`;
    const findings = checkDuplicateNumbers(makeCtx({ history }));
    expect(findings.map(brief)).toEqual([
      { severity: "error", code: "task-duplicate", file: HANDOFF_FILE, line: lineOf(HANDOFF, "Tarea 7 — Escribir") },
    ]);
    expect(findings[0].message).toContain("(tarea en curso)");
  });

  test("la misma tarea repetida en live y en history genera ambos tipos de error", () => {
    const backlog = BACKLOG.replace("### Tarea 6 — Publicar", "### Tarea 4 — Publicar").replace("### Tarea 8 — Agregar", "### Tarea 4 — Agregar");
    const findings = checkDuplicateNumbers(makeCtx({ backlog }));
    // 1 por repetirse entre vivas + 2 por figurar en history.md
    expect(findings).toHaveLength(3);
  });

  test("history.md ausente o backlog ausente: no falla", () => {
    expect(checkDuplicateNumbers(makeCtx({ history: null }))).toEqual([]);
    expect(checkDuplicateNumbers(makeCtx({ backlog: null }))).toEqual([]);
  });
});

describe("task-heading", () => {
  test("headers bien escritos: sin hallazgos", () => {
    expect(checkTaskHeadings(makeCtx())).toEqual([]);
    expect(checkTaskHeadings(makeCtx({ backlog: BACKLOG_WITH_GROUP }))).toEqual([]);
  });

  test("con dos puntos en vez de guion: aviso en su línea", () => {
    const backlog = BACKLOG.replace("### Tarea 8 — Agregar", "### Tarea 8: Agregar");
    const findings = checkTaskHeadings(makeCtx({ backlog }));
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "task-heading", file: BACKLOG_FILE, line: lineOf(backlog, "### Tarea 8: Agregar") }]);
    expect(findings[0].message).toContain("### Tarea N — título");
  });

  test("sin título ni guion, o sin guion", () => {
    const backlog = BACKLOG.replace("### Tarea 8 — Agregar", "### Tarea 8").replace("### Tarea 9 — Revisar", "### Tarea 9 Revisar");
    expect(checkTaskHeadings(makeCtx({ backlog })).map((f) => f.line)).toEqual([lineOf(backlog, "### Tarea 8 el comando"), lineOf(backlog, "### Tarea 9 Revisar")]);
  });

  test("también revisa handoff.md (una pausada mal escrita)", () => {
    const handoff = HANDOFF.replace("### Tarea 5 — Migrar", "### Tarea 5 Migrar");
    const findings = checkTaskHeadings(makeCtx({ handoff }));
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "task-heading", file: HANDOFF_FILE, line: lineOf(handoff, "### Tarea 5 Migrar") }]);
  });

  test("acepta `####` (tareas agrupadas)", () => {
    const backlog = BACKLOG_WITH_GROUP.replace("#### Tarea 11 — Aceptar", "#### Tarea 11 Aceptar");
    expect(checkTaskHeadings(makeCtx({ backlog })).map((f) => f.line)).toEqual([lineOf(backlog, "#### Tarea 11 Aceptar")]);
  });

  test("un header de ejemplo en un bloque de código o en un comentario no cuenta", () => {
    const backlog = BACKLOG.replace(
      "### Tarea 8 — Agregar",
      "```\n### Tarea 3: ejemplo\n```\n\n<!--\n### Tarea 4: otro\n-->\n\n### Tarea 8 — Agregar",
    );
    expect(checkTaskHeadings(makeCtx({ backlog }))).toEqual([]);
  });

  test("los headers de team-backlog.md (sin número) no se revisan", () => {
    expect(checkTaskHeadings(makeCtx({ mode: "multi" }))).toEqual([]);
  });

  test("archivos ausentes: sin hallazgos", () => {
    expect(checkTaskHeadings(makeCtx({ handoff: null, backlog: null }))).toEqual([]);
  });
});

describe("task-fields", () => {
  test("tareas con campos: sin hallazgos", () => {
    expect(checkTaskFields(makeCtx())).toEqual([]);
    expect(checkTaskFields(makeCtx({ backlog: BACKLOG_WITH_GROUP }))).toEqual([]);
  });

  test("una tarea libre sin campos: aviso en su header", () => {
    const backlog = BACKLOG.replace(/### Tarea 9 — Revisar los mensajes de error\n\n(- .*\n)+/, "### Tarea 9 — Revisar los mensajes de error\n\nSolo texto.\n");
    const findings = checkTaskFields(makeCtx({ backlog }));
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "task-fields", file: BACKLOG_FILE, line: lineOf(backlog, "### Tarea 9") }]);
    expect(findings[0].message).toContain("La Tarea 9 no tiene ningún campo");
  });

  test("una bloqueada sin campos", () => {
    const backlog = BACKLOG.replace(/(### Tarea 6 — Publicar la versión 2\n\n)(- .*\n)+/, "$1Solo texto.\n");
    const findings = checkTaskFields(makeCtx({ backlog }));
    expect(findings.map((f) => f.line)).toEqual([lineOf(backlog, "### Tarea 6")]);
  });

  test("una agrupada sin campos", () => {
    const backlog = BACKLOG_WITH_GROUP.replace(/(#### Tarea 12 — Ignorar ejemplos de código\n\n)(- .*\n)+/, "$1Solo texto.\n");
    const findings = checkTaskFields(makeCtx({ backlog }));
    expect(findings.map((f) => f.line)).toEqual([lineOf(backlog, "#### Tarea 12")]);
  });

  test("una pausada sin campos ni plan: aviso en handoff.md", () => {
    const handoff = HANDOFF.replace(/(### Tarea 5 — Migrar la documentación vieja\n\n)(- .*\n)+/, "$1Solo texto.\n");
    const findings = checkTaskFields(makeCtx({ handoff }));
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "task-fields", file: HANDOFF_FILE, line: lineOf(handoff, "### Tarea 5") }]);
  });

  test("una pausada que solo trae el plan (checkboxes) no avisa", () => {
    const handoff = HANDOFF.replace(/(### Tarea 5 — Migrar la documentación vieja\n\n)(- .*\n)+/, "$1- [x] Paso 1\n- [ ] Paso 2\n");
    expect(checkTaskFields(makeCtx({ handoff }))).toEqual([]);
  });

  test("una tarea que es un placeholder no avisa (lo hace el check de placeholders)", () => {
    const backlog = BACKLOG.replace("### Tarea 9 — Revisar los mensajes de error", "### Tarea 9 — [Placeholder — título]");
    const sinCampos = backlog.replace(/(### Tarea 9 .*\n\n)(- .*\n)+/, "$1");
    expect(checkTaskFields(makeCtx({ backlog: sinCampos }))).toEqual([]);
  });

  test("las tareas de la plantilla sin completar no avisan (lo hace el check de placeholders)", () => {
    expect(checkTaskFields(makeCtx({ backlog: TEMPLATE_BACKLOG }))).toEqual([]);
    expect(checkTaskHeadings(makeCtx({ backlog: TEMPLATE_BACKLOG }))).toEqual([]);
  });

  test("la tarea en curso no se revisa aquí (su contenido es la sección)", () => {
    expect(checkTaskFields(makeCtx({ handoff: HANDOFF.replace(PAUSED_NONE, "") }))).toEqual([]);
  });
});

describe("block-tag", () => {
  test("bloqueada con `[postergada]` y libres sin bloqueo vigente: sin hallazgos", () => {
    expect(checkBlockTags(makeCtx())).toEqual([]);
  });

  test("bloqueada con `[dependencia]`: sin hallazgos", () => {
    const backlog = BACKLOG.replace("`[postergada]` esperar", "`[dependencia]` esperar");
    expect(checkBlockTags(makeCtx({ backlog }))).toEqual([]);
  });

  test("bloqueada sin ningún bloqueo vigente: aviso", () => {
    const backlog = BACKLOG.replace("- **Bloqueos:** `[postergada]` esperar a que cierre la Tarea 7.", "- **Bloqueos:** Ninguno.");
    const findings = checkBlockTags(makeCtx({ backlog }));
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "block-tag", file: BACKLOG_FILE, line: lineOf(backlog, "### Tarea 6") }]);
    expect(findings[0].message).toContain("La Tarea 6");
    expect(findings[0].message).toContain("bloqueadas / pospuestas");
  });

  test("bloqueada cuyo único bloqueo está resuelto: aviso", () => {
    const backlog = BACKLOG.replace("`[postergada]` esperar a que cierre la Tarea 7.", "`[Resuelto el 2026-10-02]` — era `[postergada]` esperar.");
    expect(checkBlockTags(makeCtx({ backlog })).map((f) => f.code)).toEqual(["block-tag"]);
  });

  test("libre con un bloqueo vigente: aviso que cita el tag", () => {
    const backlog = BACKLOG.replace("- **Bloqueos:** Ninguno.\n- **Disparador:**", "- **Bloqueos:** `[dependencia]` falta la API.\n- **Disparador:**");
    const findings = checkBlockTags(makeCtx({ backlog }));
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "block-tag", file: BACKLOG_FILE, line: lineOf(backlog, "### Tarea 8") }]);
    expect(findings[0].message).toContain("[dependencia]");
    expect(findings[0].message).toContain("«libres»");
  });

  test("libre con bloqueo resuelto (y luego un tag en el historial): sin hallazgos", () => {
    // La Tarea 9 del fixture ya es así: `[Resuelto ...]` primero.
    expect(checkBlockTags(makeCtx())).toEqual([]);
  });

  test("un `[algo]` en medio de la descripción no es un bloqueo", () => {
    const backlog = BACKLOG.replace("exportar el estado a JSON.", "exportar el estado a JSON, ver [postergada] en las notas.");
    expect(checkBlockTags(makeCtx({ backlog }))).toEqual([]);
  });

  test("las tareas de la plantilla sin completar (placeholders) no avisan", () => {
    expect(checkBlockTags(makeCtx({ backlog: TEMPLATE_BACKLOG }))).toEqual([]);
  });

  test("backlog ausente: sin hallazgos", () => {
    expect(checkBlockTags(makeCtx({ backlog: null }))).toEqual([]);
  });
});
