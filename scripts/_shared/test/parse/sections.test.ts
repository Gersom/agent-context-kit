import { describe, expect, test } from "bun:test";
import { BACKLOG_SECTIONS, findSections } from "../../parse/sections.ts";
import { lineNumbersMatch, requireFixture, sliceRange } from "../helpers.ts";
import { normalizeEol } from "../../parse/positions.ts";

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

describe("findSections: posiciones en el texto original", () => {
  const TEXT = [
    "# Backlog", // 1
    "", // 2
    "<!--", // 3
    "## Falso dentro de un comentario", // 4
    "-->", // 5
    "", // 6
    "<!-- agent-context-kit:section=free -->", // 7
    "## Tareas libres", // 8
    "", // 9
    "### Tarea 1 — a", // 10
    "```md", // 11
    "## Falso en un bloque de código", // 12
    "```", // 13
    "", // 14
    "<!-- agent-context-kit:section=blocked -->", // 15
    "## Tareas bloqueadas", // 16
    "", // 17
    "### Tarea 2 — b", // 18
    "", // 19
  ].join("\n");

  test("header, cuerpo y ancla apuntan al texto original (con comentarios y fences antes y dentro)", () => {
    const { sections } = findSections(TEXT, ["free", "blocked"]);
    const { free, blocked } = sections;
    expect(sliceRange(TEXT, free.headerRange)).toBe("## Tareas libres");
    expect(free.headerRange).toMatchObject({ startLine: 8, endLine: 8 });
    expect(sliceRange(TEXT, free.anchorRange!)).toBe("<!-- agent-context-kit:section=free -->");
    expect(free.anchorRange).toMatchObject({ startLine: 7, endLine: 7 });
    expect(sliceRange(TEXT, blocked.headerRange)).toBe("## Tareas bloqueadas");
    expect(sliceRange(TEXT, blocked.anchorRange!)).toBe("<!-- agent-context-kit:section=blocked -->");
  });

  test("el cuerpo llega hasta antes del ancla de la sección siguiente, o hasta el fin del texto", () => {
    const { free, blocked } = findSections(TEXT, ["free", "blocked"]).sections;
    expect(free.bodyRange).toMatchObject({ startLine: 9, endLine: 14 });
    expect(sliceRange(TEXT, free.bodyRange)).toBe("\n### Tarea 1 — a\n```md\n## Falso en un bloque de código\n```\n\n");
    expect(blocked.bodyRange).toMatchObject({ startLine: 17, endLine: 18, end: TEXT.length });
    expect(sliceRange(TEXT, blocked.bodyRange)).toBe("\n### Tarea 2 — b\n");
    expect(lineNumbersMatch(TEXT, free.bodyRange)).toBe(true);
    expect(lineNumbersMatch(TEXT, blocked.bodyRange)).toBe(true);
  });

  test("body (texto) y bodyRange (posición) describen lo mismo", () => {
    const { free } = findSections(TEXT, ["free", "blocked"]).sections;
    // `body` llega hasta el header siguiente: contiene al fragmento de `bodyRange` más el ancla.
    expect(free.body.startsWith(sliceRange(TEXT, free.bodyRange).replace(/\n$/, ""))).toBe(true);
  });

  test("plan B (sin anclas): header y cuerpo ubicados, anchorRange null (no se inventa)", () => {
    const text = "# Doc\n\n## Libres\n\n### Tarea 1 — a\n\n## Bloqueadas\n\ntexto\n";
    const { sections, usedFallback } = findSections(text, ["free", "blocked"]);
    expect(usedFallback).toBe(true);
    expect(sections.free.anchorRange).toBeNull();
    expect(sections.blocked.anchorRange).toBeNull();
    expect(sliceRange(text, sections.free.headerRange)).toBe("## Libres");
    expect(sliceRange(text, sections.free.bodyRange)).toBe("\n### Tarea 1 — a\n\n");
    expect(sliceRange(text, sections.blocked.bodyRange)).toBe("\ntexto\n");
  });

  test("un header sin ancla en un documento con anclas no es sección; ids desconocidos se descartan", () => {
    const text = "<!-- agent-context-kit:section=free -->\n## Libres\n\n## Otra\ntexto\n";
    const { sections } = findSections(text, ["free", "blocked"]);
    expect(Object.keys(sections)).toEqual(["free"]);
    // Sin ancla en la siguiente, el cuerpo llega hasta su header.
    expect(sliceRange(text, sections.free.bodyRange)).toBe("\n");
  });

  test("sección vacía: el cuerpo es un rango vacío pegado al header siguiente", () => {
    const text = "## Libres\n## Bloqueadas\nx";
    const { sections } = findSections(text, ["free", "blocked"]);
    expect(sections.free.bodyRange).toEqual({ startLine: 2, endLine: 1, start: 10, end: 10 });
    expect(sections.blocked.bodyRange).toMatchObject({ start: text.length - 1, end: text.length });
  });

  test("header en la última línea, sin salto de línea final", () => {
    const text = "## Libres";
    const { sections } = findSections(text, ["free"]);
    expect(sliceRange(text, sections.free.headerRange)).toBe("## Libres");
    expect(sections.free.bodyRange).toMatchObject({ start: text.length, end: text.length });
  });

  test("archivo vacío: sin secciones, todas faltan", () => {
    const { sections, missing } = findSections("", ["free", "blocked"]);
    expect(sections).toEqual({});
    expect(missing).toEqual(["free", "blocked"]);
  });

  test("CRLF: con el texto normalizado, los rangos se traducen al crudo sin tocar los finales de línea", () => {
    const crlf = TEXT.replace(/\n/g, "\r\n");
    const info = normalizeEol(crlf);
    const { free } = findSections(info.text, ["free", "blocked"]).sections;
    const [s, e] = info.rawSpan(free.headerRange);
    expect(crlf.slice(s, e)).toBe("## Tareas libres");
    expect(crlf.slice(...info.rawSpan(free.bodyRange)).startsWith("\r\n### Tarea 1")).toBe(true);
    expect(free.headerRange).toEqual(findSections(TEXT, ["free", "blocked"]).sections.free.headerRange);
  });
});
