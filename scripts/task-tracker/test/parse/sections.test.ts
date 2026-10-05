import { describe, expect, test } from "bun:test";
import { BACKLOG_SECTIONS, findSections } from "../../src/parse/sections.ts";
import { requireFixture } from "../helpers.ts";

describe("findSections", () => {
  test("ubica secciones por ancla e ignora headers dentro de comentarios", () => {
    const { sections, usedFallback, missing } = findSections(requireFixture("es-anchors", "backlog.md"), BACKLOG_SECTIONS);
    expect(usedFallback).toBe(false);
    expect(missing).toEqual([]);
    expect(sections.free.header).toBe("Tareas libres");
    expect(sections.blocked.header).toBe("Tareas bloqueadas / pospuestas");
    expect(sections.grouped.header).toBe("Tareas agrupadas");
  });

  test("sin anclas usa el orden de aparición (plan B)", () => {
    const { sections, usedFallback } = findSections(requireFixture("en-no-anchors", "backlog.md"), BACKLOG_SECTIONS);
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
