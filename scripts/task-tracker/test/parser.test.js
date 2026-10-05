import { describe, expect, test } from "bun:test";
import {
  BACKLOG_SECTIONS,
  findSections,
  parseBacklog,
  parseBlocks,
  parseFields,
  parseHandoff,
  stripComments,
} from "../src/parser.js";
import { fixture } from "./helpers.js";

describe("stripComments", () => {
  test("quita comentarios inline y multilínea", () => {
    expect(stripComments("a <!-- x --> b\n<!--\nlinea\n-->\nc")).toBe("a  b\n\nc");
  });
  test("descarta un comentario sin cerrar hasta el final", () => {
    expect(stripComments("a\n<!-- abierto\nb")).toBe("a\n");
  });
});

describe("findSections", () => {
  test("ubica secciones por ancla e ignora headers dentro de comentarios", () => {
    const { sections, usedFallback, missing } = findSections(fixture("es-anchors", "backlog.md"), BACKLOG_SECTIONS);
    expect(usedFallback).toBe(false);
    expect(missing).toEqual([]);
    expect(sections.free.header).toBe("Tareas libres");
    expect(sections.blocked.header).toBe("Tareas bloqueadas / pospuestas");
    expect(sections.grouped.header).toBe("Tareas agrupadas");
  });

  test("sin anclas usa el orden de aparición (plan B)", () => {
    const { sections, usedFallback } = findSections(fixture("en-no-anchors", "backlog.md"), BACKLOG_SECTIONS);
    expect(usedFallback).toBe(true);
    expect(sections.free.header).toBe("Free tasks");
    expect(sections.blocked.header).toBe("Blocked / postponed tasks");
  });

  test("ignora headers dentro de bloques de código", () => {
    const text = "```md\n## Falso\n```\n<!-- agent-context-kit:section=free -->\n## Libres\n";
    const { sections } = findSections(text, BACKLOG_SECTIONS);
    expect(sections.free.header).toBe("Libres");
  });

  test("un ancla seguida de otro contenido no se aplica al header siguiente", () => {
    const text = "<!-- agent-context-kit:section=free -->\ntexto\n## Libres\n<!-- agent-context-kit:section=blocked -->\n## Bloqueadas\n";
    const { sections, missing, usedFallback } = findSections(text, BACKLOG_SECTIONS);
    expect(usedFallback).toBe(false);
    expect(sections.free).toBeUndefined();
    expect(sections.blocked.header).toBe("Bloqueadas");
    expect(missing).toContain("free");
  });

  test("reporta las secciones con ancla faltante", () => {
    const text = "<!-- agent-context-kit:section=free -->\n## Libres\n\n## Otra\n";
    expect(findSections(text, BACKLOG_SECTIONS).missing).toEqual(["blocked", "grouped"]);
  });
});

describe("parseFields", () => {
  test("lee etiqueta y valor sin depender del idioma, con continuaciones indentadas", () => {
    const fields = parseFields(["- **Blockers:** `[dependency]` waits.", "  - more detail", "- **Agregada:** 2026-10-05.", "texto suelto"]);
    expect(fields).toEqual([
      { label: "Blockers", value: "`[dependency]` waits.\n- more detail", isPlaceholder: false },
      { label: "Agregada", value: "2026-10-05.", isPlaceholder: false },
    ]);
  });
  test("acepta `**Etiqueta**:` y marca placeholders", () => {
    expect(parseFields(["- **Detalles**: [Placeholder]"])[0]).toEqual({ label: "Detalles", value: "[Placeholder]", isPlaceholder: true });
  });
});

describe("parseBlocks", () => {
  test("acepta —, – y - como separador", () => {
    const { tasks } = parseBlocks("### Tarea 1 — a\n### Task 2 – b\n### Task 3 - c\n### Tarea [N] — placeholder");
    expect(tasks.map((t) => [t.number, t.label, t.title])).toEqual([
      [1, "Tarea", "a"],
      [2, "Task", "b"],
      [3, "Task", "c"],
    ]);
  });
});

describe("parseHandoff", () => {
  test("detecta la tarea en curso, el plan y las subsecciones", () => {
    const { inProgress, paused, usedFallback } = parseHandoff(fixture("es-anchors", "handoff.md"));
    expect(usedFallback).toBe(false);
    expect(inProgress.task).toEqual({ label: "Tarea", number: 12, title: "Implementar el parser de anclas" });
    expect(inProgress.steps.map((s) => s.done)).toEqual([true, true, false, false, false]);
    expect(inProgress.subsections.map((s) => s.title)).toEqual(["Plan", "Qué falta", "Próximo paso concreto"]);
    expect(paused.map((t) => t.number)).toEqual([8]);
    expect(paused[0].fields.map((f) => f.label)).toEqual(["Qué falta", "Por qué se pausó", "Qué espera para retomarse"]);
  });

  test("sin tarea en curso devuelve null", () => {
    const { inProgress, paused } = parseHandoff(fixture("minimal", "handoff.md"));
    expect(inProgress.task).toBeNull();
    expect(paused).toEqual([]);
  });

  test("no toma un paso de una subsección como tarea en curso", () => {
    const text = "<!-- agent-context-kit:section=in-progress -->\n## En progreso\n\nSin tarea.\n\n### Próximo\n\nPaso 4 — algo\n";
    expect(parseHandoff(text).inProgress.task).toBeNull();
  });

  test("funciona en inglés sin anclas", () => {
    const { inProgress, usedFallback } = parseHandoff(fixture("en-no-anchors", "handoff.md"));
    expect(usedFallback).toBe(true);
    expect(inProgress.task).toEqual({ label: "Task", number: 21, title: "Add the English onboarding" });
    expect(inProgress.steps).toHaveLength(2);
  });
});

describe("parseBacklog", () => {
  test("separa libres, grupos, bloqueadas y agrupadas", () => {
    const backlog = parseBacklog(fixture("es-anchors", "backlog.md"));
    expect(backlog.free.tasks.map((t) => t.number)).toEqual([1, 3]);
    expect(backlog.free.groups).toHaveLength(1);
    expect(backlog.free.groups[0].title).toBe("Documentar los planes");
    expect(backlog.free.groups[0].taskNumbers).toEqual([14, 15]);
    expect(backlog.blocked.map((t) => t.number)).toEqual([4, 5]);
    expect(backlog.grouped[0].tasks.map((t) => [t.number, t.level])).toEqual([[14, 4], [15, 4]]);
  });

  test("ignora las tareas de ejemplo dentro de comentarios", () => {
    const backlog = parseBacklog(fixture("es-anchors", "backlog.md"));
    const all = [...backlog.free.tasks, ...backlog.blocked].map((t) => t.number);
    expect(all).not.toContain(66);
  });

  test("CRLF se comporta igual que LF una vez normalizado", () => {
    const lf = fixture("es-anchors", "backlog.md");
    const crlf = lf.replace(/\n/g, "\r\n").replace(/\r\n?/g, "\n");
    expect(parseBacklog(crlf)).toEqual(parseBacklog(lf));
  });
});
