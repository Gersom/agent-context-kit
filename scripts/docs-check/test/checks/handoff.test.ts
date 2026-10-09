import { describe, expect, test } from "bun:test";
import { checkCurrentTask } from "../../src/checks/handoff.ts";
import { HANDOFF, HANDOFF_IDLE, lineOf, TEMPLATE_HANDOFF } from "../fixtures.ts";
import { brief, makeCtx, PATHS } from "../helpers.ts";

const FILE = `${PATHS.flat}/handoff.md`;

describe("handoff: tarea en progreso", () => {
  test("tarea reconocida con plan: sin hallazgos", () => {
    expect(checkCurrentTask(makeCtx())).toEqual([]);
  });

  test("«Sin tarea en curso»: sin hallazgos", () => {
    expect(checkCurrentTask(makeCtx({ handoff: HANDOFF_IDLE }))).toEqual([]);
  });

  test("«Sin tarea en curso» en otros idiomas conocidos: sin hallazgos", () => {
    for (const text of ["No task in progress.", "No current task", "No active task right now"]) {
      const handoff = HANDOFF_IDLE.replace("Sin tarea en curso.", text);
      expect(checkCurrentTask(makeCtx({ handoff }))).toEqual([]);
    }
  });

  test("la línea con etiqueta en negrita (`**Tarea:** Tarea 9 — título`) se reconoce", () => {
    const handoff = HANDOFF.replace("Tarea 7 — Escribir el parser", "**Tarea:** Tarea 7 — Escribir el parser");
    expect(checkCurrentTask(makeCtx({ handoff }))).toEqual([]);
  });

  test("la sección vacía: sin hallazgos", () => {
    const handoff = HANDOFF_IDLE.replace("Sin tarea en curso.\n", "");
    expect(checkCurrentTask(makeCtx({ handoff }))).toEqual([]);
  });

  test("la plantilla sin completar no avisa aquí (lo hace el check de placeholders)", () => {
    expect(checkCurrentTask(makeCtx({ handoff: TEMPLATE_HANDOFF }))).toEqual([]);
  });

  test("handoff.md ausente: sin hallazgos", () => {
    expect(checkCurrentTask(makeCtx({ handoff: null }))).toEqual([]);
  });
});

describe("current-task-line", () => {
  test("contenido sin la línea `Tarea N — título`: aviso en el header de la sección", () => {
    const handoff = HANDOFF_IDLE.replace("Sin tarea en curso.", "Estoy trabajando en el parser.");
    const findings = checkCurrentTask(makeCtx({ handoff }));
    expect(findings.map(brief)).toEqual([
      { severity: "warning", code: "current-task-line", file: FILE, line: lineOf(handoff, "## Tarea en progreso") },
    ]);
    expect(findings[0].message).toContain("Tarea N — título");
  });

  test("la línea está después de la primera subsección: no se reconoce", () => {
    const handoff = HANDOFF_IDLE.replace("Sin tarea en curso.", "### Plan\n\nTarea 7 — Escribir el parser");
    const findings = checkCurrentTask(makeCtx({ handoff }));
    expect(findings.map((f) => f.code)).toEqual(["current-task-line"]);
  });

  test("sin guion entre el número y el título: no se reconoce", () => {
    const handoff = HANDOFF.replace("Tarea 7 — Escribir el parser", "Tarea 7: Escribir el parser");
    const findings = checkCurrentTask(makeCtx({ handoff }));
    expect(findings.map((f) => f.code)).toEqual(["current-task-line"]);
  });

  test("guion corto o semicuadratín: se reconoce", () => {
    for (const dash of ["-", "–"]) {
      const handoff = HANDOFF.replace("Tarea 7 — Escribir el parser", `Tarea 7 ${dash} Escribir el parser`);
      expect(checkCurrentTask(makeCtx({ handoff }))).toEqual([]);
    }
  });

  test("un comentario HTML con la tarea no cuenta como contenido", () => {
    const handoff = HANDOFF_IDLE.replace("Sin tarea en curso.", "<!-- Tarea 7 — algo -->");
    expect(checkCurrentTask(makeCtx({ handoff }))).toEqual([]);
  });
});

describe("current-no-plan", () => {
  test("tarea en curso sin checkboxes: aviso en la línea de la tarea", () => {
    const handoff = HANDOFF.replace(/### Plan[\s\S]*?### Qué falta/, "### Qué falta");
    const findings = checkCurrentTask(makeCtx({ handoff }));
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "current-no-plan", file: FILE, line: lineOf(handoff, "Tarea 7 — Escribir") }]);
    expect(findings[0].message).toContain("Tarea 7");
    expect(findings[0].message).toContain("- [ ] Paso");
  });

  test("el plan en una subsección con otro nombre también cuenta (basta un checkbox)", () => {
    const handoff = HANDOFF.replace(/### Plan[\s\S]*?### Qué falta/, "### Pasos\n\n- [ ] Único paso\n\n### Qué falta");
    expect(checkCurrentTask(makeCtx({ handoff }))).toEqual([]);
  });

  test("los checkboxes de las pausadas no cuentan como plan de la tarea en curso", () => {
    const handoff = HANDOFF.replace(/### Plan[\s\S]*?### Qué falta/, "### Qué falta").replace(
      "- **Por qué se pausó:** otra prioridad.",
      "- **Plan:**\n  - [ ] Algo\n- **Por qué se pausó:** otra prioridad.",
    );
    expect(checkCurrentTask(makeCtx({ handoff })).map((f) => f.code)).toEqual(["current-no-plan"]);
  });
});
