import { describe, expect, test } from "bun:test";
import { checkGroups } from "../../src/checks/groups.ts";
import { ANCHOR, BACKLOG_WITH_GROUP, lineOf, TEMPLATE_BACKLOG } from "../fixtures.ts";
import { brief, makeCtx, PATHS } from "../helpers.ts";

const BACKLOG_FILE = `${PATHS.flat}/backlog.md`;

const REFERENCE = "### Grupo — Mejorar el parseo (Tareas 11, 12)\n\n- **Resumen:** dos arreglos del mismo parser.\n\n";
const CONTAINER_HEADER = "### Grupo — Mejorar el parseo\n\n#### Tarea 11";
const TASK_12 = /#### Tarea 12 — Ignorar ejemplos de código\n\n(- .*\n)+/;

/** BACKLOG_WITH_GROUP con la sección «Tareas agrupadas» reemplazada por `grouped`. */
const withGrouped = (grouped: string) => `${BACKLOG_WITH_GROUP.slice(0, BACKLOG_WITH_GROUP.indexOf(ANCHOR("grouped")))}${ANCHOR("grouped")}\n## Tareas agrupadas\n\n${grouped}`;

const run = (backlog: string) => checkGroups(makeCtx({ backlog }));
const codes = (backlog: string) => run(backlog).map((f) => f.code);

describe("groups: casos sanos", () => {
  test("sin grupos: sin hallazgos", () => {
    expect(checkGroups(makeCtx())).toEqual([]);
    expect(checkGroups(makeCtx({ backlog: TEMPLATE_BACKLOG }))).toEqual([]);
  });

  test("un grupo sano: sin hallazgos", () => {
    expect(checkGroups(makeCtx({ backlog: BACKLOG_WITH_GROUP }))).toEqual([]);
  });

  test("dos grupos con los contenedores en otro orden que las referencias; una capitalización distinta del título se avisa", () => {
    const second = "### Grupo — Revisar Mensajes (Tareas 21, 22)\n\n- **Resumen:** unificar el tono.\n\n";
    const containers = [
      "### Grupo — revisar mensajes\n\n#### Tarea 21 — Uno\n\n- **Descripción:** x.\n\n#### Tarea 22 — Dos\n\n- **Descripción:** y.\n\n",
      "### Grupo — Mejorar el parseo\n\n#### Tarea 11 — Aceptar guiones largos\n\n- **Descripción:** x.\n\n#### Tarea 12 — Ignorar ejemplos\n\n- **Descripción:** y.\n",
    ].join("");
    const backlog = withGrouped(containers).replace(REFERENCE, REFERENCE + second);
    expect(codes(backlog)).toEqual(["group-title-mismatch"]); // solo `revisar mensajes` ≠ `Revisar Mensajes`
    expect(codes(backlog.replace("### Grupo — revisar mensajes", "### Grupo — Revisar Mensajes"))).toEqual([]);
  });

  test("un grupo en inglés: sin hallazgos", () => {
    const backlog = BACKLOG_WITH_GROUP.replace("Grupo — Mejorar el parseo (Tareas", "Group — Mejorar el parseo (Tasks").replace("**Resumen:**", "**Summary:**").replace("### Grupo — Mejorar", "### Group — Mejorar");
    expect(run(backlog)).toEqual([]);
  });

  test("un header de grupo dentro de un comentario o una tarea `###` en «Tareas agrupadas» no son contenedores", () => {
    expect(codes(BACKLOG_WITH_GROUP.replace("## Tareas agrupadas\n", "## Tareas agrupadas\n\n<!--\n### Grupo — Viejo\n-->\n"))).toEqual([]);
    expect(codes(BACKLOG_WITH_GROUP + "\n### Tarea 30 — Suelta\n\n- **Descripción:** x.\n")).toEqual([]);
  });

  test("backlog ausente: sin hallazgos", () => {
    expect(checkGroups(makeCtx({ backlog: null }))).toEqual([]);
  });
});

describe("group-too-small", () => {
  test("contenedor con una sola tarea: error en el contenedor que sugiere group-eject", () => {
    const backlog = BACKLOG_WITH_GROUP.replace("(Tareas 11, 12)", "(Tareas 11)").replace(TASK_12, "");
    const findings = run(backlog);
    expect(findings.map(brief)).toEqual([{ severity: "error", code: "group-too-small", file: BACKLOG_FILE, line: lineOf(backlog, CONTAINER_HEADER) }]);
    expect(findings[0].message).toContain("`acsuite task group-eject 11`");
    expect(findings[0].message).toContain("«Mejorar el parseo»");
  });

  test("el contenedor vacío de un grupo con referencia: también falla los números, con mensajes sin huecos", () => {
    const backlog = withGrouped("### Grupo — Mejorar el parseo\n");
    const findings = run(backlog);
    expect(findings.map((f) => f.code).sort()).toEqual(["group-numbers-mismatch", "group-too-small"]);
    expect(findings.find((f) => f.code === "group-too-small")?.message).toContain("no tiene ninguna tarea");
    const mismatch = findings.find((f) => f.code === "group-numbers-mismatch")!.message;
    expect(mismatch).toContain("el contenedor no tiene tareas");
    expect(mismatch).toContain("Quítalas de la lista a mano.");
    expect(mismatch).not.toContain("()");
    expect(mismatch).not.toContain("group-add");
    expect(mismatch).not.toContain("si no, quítalas");
  });

  test("referencia con una sola tarea y sin contenedor: un solo hallazgo, sin group-create ni aviso de resumen", () => {
    const backlog = withGrouped("No aplica todavía — ningún grupo formado.\n").replace("(Tareas 11, 12)", "(Tareas 11)").replace("- **Resumen:** dos arreglos del mismo parser.\n", "");
    const findings = run(backlog);
    expect(findings.map(brief)).toEqual([{ severity: "error", code: "group-too-small", file: BACKLOG_FILE, line: lineOf(backlog, "### Grupo — Mejorar el parseo (Tareas 11)") }]);
    expect(findings[0].message).toContain("la 11");
    expect(findings[0].message).toContain("### Tarea 11");
    expect(findings[0].message).not.toContain("group-create");
  });

  test("contenedor huérfano vacío: falta la referencia y es chico", () => {
    const backlog = withGrouped("### Grupo — Vacío\n").replace(REFERENCE, "");
    const findings = run(backlog);
    expect(findings.map((f) => f.code).sort()).toEqual(["group-missing-reference", "group-too-small"]);
    expect(findings.every((f) => f.line === lineOf(backlog, "### Grupo — Vacío") && f.severity === "error")).toBe(true);
  });
});

describe("group-missing-container / group-missing-reference", () => {
  test("referencia sin contenedor: error en la referencia", () => {
    const backlog = withGrouped("No aplica todavía — ningún grupo formado.\n");
    const findings = run(backlog);
    expect(findings.map(brief)).toEqual([{ severity: "error", code: "group-missing-container", file: BACKLOG_FILE, line: lineOf(backlog, "### Grupo — Mejorar el parseo (Tareas") }]);
    expect(findings[0].message).toContain("«Mejorar el parseo»");
    expect(findings[0].message).toContain("acsuite task group-create");
  });

  test("contenedor sin referencia: error en el contenedor, con la referencia que habría que escribir", () => {
    const backlog = BACKLOG_WITH_GROUP.replace(REFERENCE, "");
    const findings = run(backlog);
    expect(findings.map(brief)).toEqual([{ severity: "error", code: "group-missing-reference", file: BACKLOG_FILE, line: lineOf(backlog, CONTAINER_HEADER) }]);
    expect(findings[0].message).toContain("tareas 11, 12");
    expect(findings[0].message).toContain("### Grupo — Mejorar el parseo (Tareas 11, 12)");
  });

  test("dos mitades sin nada en común: faltan las dos parejas, ninguna se empareja", () => {
    const backlog = BACKLOG_WITH_GROUP.replace("### Grupo — Mejorar el parseo\n", "### Grupo — Otro tema\n").replace("(Tareas 11, 12)", "(Tareas 31, 32)");
    expect(codes(backlog).sort()).toEqual(["group-missing-container", "group-missing-reference"]);
  });
});

describe("group-numbers-mismatch", () => {
  test("la referencia lista una tarea que no está en el contenedor: error en la referencia, sugiere group-add", () => {
    const backlog = BACKLOG_WITH_GROUP.replace("(Tareas 11, 12)", "(Tareas 11, 12, 13)");
    const findings = run(backlog);
    expect(findings.map(brief)).toEqual([{ severity: "error", code: "group-numbers-mismatch", file: BACKLOG_FILE, line: lineOf(backlog, "### Grupo — Mejorar el parseo (Tareas") }]);
    expect(findings[0].message).toContain("lista 13, que no está en el contenedor");
    expect(findings[0].message).toContain("`acsuite task group-add 11 13`");
  });

  test("el contenedor tiene una tarea que la referencia no lista: sugiere group-eject", () => {
    const backlog = BACKLOG_WITH_GROUP.replace("(Tareas 11, 12)", "(Tareas 11)");
    const findings = run(backlog);
    expect(findings.map((f) => f.code)).toEqual(["group-numbers-mismatch"]);
    expect(findings[0].message).toContain("tiene 12, que no figura en la referencia");
    expect(findings[0].message).toContain("`acsuite task group-eject 12`");
  });

  test("números distintos en los dos sentidos: un solo hallazgo que nombra ambos", () => {
    const findings = run(BACKLOG_WITH_GROUP.replace("(Tareas 11, 12)", "(Tareas 11, 40)"));
    expect(findings.map((f) => f.code)).toEqual(["group-numbers-mismatch"]);
    expect(findings[0].message).toContain("lista 40");
    expect(findings[0].message).toContain("tiene 12");
  });

  test("los mismos números en otro orden: sin hallazgos", () => {
    expect(run(BACKLOG_WITH_GROUP.replace("(Tareas 11, 12)", "(Tareas 12, 11)"))).toEqual([]);
  });
});

describe("group-title-mismatch", () => {
  test("títulos distintos con las mismas tareas: error que sugiere group-edit --title", () => {
    const backlog = BACKLOG_WITH_GROUP.replace(CONTAINER_HEADER, "### Grupo — Mejorar el lector\n\n#### Tarea 11");
    const findings = run(backlog);
    expect(findings.map(brief)).toEqual([{ severity: "error", code: "group-title-mismatch", file: BACKLOG_FILE, line: lineOf(backlog, "### Grupo — Mejorar el parseo (Tareas") }]);
    expect(findings[0].message).toContain("«Mejorar el parseo»");
    expect(findings[0].message).toContain("«Mejorar el lector»");
    expect(findings[0].message).toContain("`acsuite task group-edit 11 --title");
  });

  test("solo difiere la capitalización: también es un desajuste", () => {
    const backlog = BACKLOG_WITH_GROUP.replace(CONTAINER_HEADER, "### Grupo — mejorar el PARSEO\n\n#### Tarea 11");
    expect(codes(backlog)).toEqual(["group-title-mismatch"]);
  });

  test("un comentario HTML en el header del contenedor no es parte del título", () => {
    const backlog = BACKLOG_WITH_GROUP.replace(CONTAINER_HEADER, "### Grupo — Mejorar el parseo <!-- nota -->\n\n#### Tarea 11");
    expect(codes(backlog)).toEqual(["group-header-comment"]);
  });

  test("títulos distintos y números parcialmente distintos: se emparejan por las tareas compartidas", () => {
    const backlog = BACKLOG_WITH_GROUP.replace(CONTAINER_HEADER, "### Grupo — Mejorar el lector\n\n#### Tarea 11").replace("(Tareas 11, 12)", "(Tareas 11, 12, 13)");
    expect(codes(backlog).sort()).toEqual(["group-numbers-mismatch", "group-title-mismatch"]);
  });
});

describe("group-no-summary", () => {
  test("referencia sin línea de Resumen: aviso en la referencia que sugiere group-edit --summary", () => {
    const backlog = BACKLOG_WITH_GROUP.replace("- **Resumen:** dos arreglos del mismo parser.\n", "");
    const findings = run(backlog);
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "group-no-summary", file: BACKLOG_FILE, line: lineOf(backlog, "### Grupo — Mejorar el parseo (Tareas") }]);
    expect(findings[0].message).toContain("`acsuite task group-edit 11 --summary");
  });

  test("un campo que no es el resumen no cuenta, y un resumen vacío tampoco", () => {
    expect(codes(BACKLOG_WITH_GROUP.replace("**Resumen:**", "**Nota:**"))).toEqual(["group-no-summary"]);
    expect(codes(BACKLOG_WITH_GROUP.replace("**Resumen:** dos arreglos del mismo parser.", "**Resumen:**"))).toEqual(["group-no-summary"]);
  });

  test("referencia sin resumen y sin contenedor: el aviso no sugiere un comando que no aplica", () => {
    const backlog = withGrouped("No aplica todavía.\n").replace("- **Resumen:** dos arreglos del mismo parser.\n", "");
    const findings = run(backlog).filter((f) => f.code === "group-no-summary");
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("agrégala a mano");
  });
});

describe("group-header-comment", () => {
  test("comentario HTML en el header de la referencia: aviso que pide quitarlo a mano", () => {
    const backlog = BACKLOG_WITH_GROUP.replace("(Tareas 11, 12)", "(Tareas 11, 12) <!-- nota -->");
    const findings = run(backlog);
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "group-header-comment", file: BACKLOG_FILE, line: lineOf(backlog, "### Grupo — Mejorar el parseo (Tareas") }]);
    expect(findings[0].message).toContain("la referencia");
    expect(findings[0].message).toContain("no pueden editar ese header");
    expect(findings[0].message).toContain("quita el comentario a mano");
  });

  test("comentario HTML en el header del contenedor: aviso en el contenedor", () => {
    const backlog = BACKLOG_WITH_GROUP.replace(CONTAINER_HEADER, "### Grupo — Mejorar el parseo <!-- nota -->\n\n#### Tarea 11");
    const findings = run(backlog);
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "group-header-comment", file: BACKLOG_FILE, line: lineOf(backlog, "### Grupo — Mejorar el parseo <!--") }]);
    expect(findings[0].message).toContain("el contenedor");
  });

  test("comentarios en los dos headers: un aviso por header", () => {
    const backlog = BACKLOG_WITH_GROUP.replace("(Tareas 11, 12)", "(Tareas 11, 12) <!-- a -->").replace(CONTAINER_HEADER, "### Grupo — Mejorar el parseo <!-- b -->\n\n#### Tarea 11");
    expect(codes(backlog)).toEqual(["group-header-comment", "group-header-comment"]);
  });
});

describe("referencia sin lista de tareas", () => {
  test("el header de «Tareas libres» sin `(Tareas N, M)`: el mensaje pide agregar la lista a ese header, sin crear otro", () => {
    const backlog = BACKLOG_WITH_GROUP.replace("### Grupo — Mejorar el parseo (Tareas 11, 12)", "### Grupo — Mejorar el parseo");
    const findings = run(backlog);
    expect(findings.map(brief)).toEqual([{ severity: "error", code: "group-missing-reference", file: BACKLOG_FILE, line: lineOf(backlog, CONTAINER_HEADER) }]);
    const message = findings[0].message;
    expect(message).toContain("no trae la lista `(Tareas N, M)`");
    expect(message).toContain("### Grupo — Mejorar el parseo (Tareas 11, 12)");
    expect(message).toContain("sin crear otro");
    expect(message).not.toContain("no tiene referencia");
  });
});
