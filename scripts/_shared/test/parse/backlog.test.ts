import { describe, expect, test } from "bun:test";
import { parseBacklog } from "../../parse/backlog.ts";
import { normalizeEol } from "../../parse/positions.ts";
import { lineNumbersMatch, requireFixture, sliceRange } from "../helpers.ts";

describe("parseBacklog", () => {
  test("separa libres, grupos, bloqueadas y agrupadas", () => {
    const backlog = parseBacklog(requireFixture("es-anchors", "backlog.md"));
    expect(backlog.free.tasks.map((t) => t.number)).toEqual([1, 3]);
    expect(backlog.free.groups).toHaveLength(1);
    expect(backlog.free.groups[0].title).toBe("Documentar los planes");
    expect(backlog.free.groups[0].taskNumbers).toEqual([14, 15]);
    expect(backlog.blocked.map((t) => t.number)).toEqual([4, 5]);
    expect(backlog.grouped[0].tasks.map((t) => [t.number, t.level])).toEqual([[14, 4], [15, 4]]);
  });

  test("ignora las tareas de ejemplo dentro de comentarios", () => {
    const backlog = parseBacklog(requireFixture("es-anchors", "backlog.md"));
    const all = [...backlog.free.tasks, ...backlog.blocked].map((t) => t.number);
    expect(all).not.toContain(66);
  });

  test("CRLF se comporta igual que LF una vez normalizado", () => {
    const lf = requireFixture("es-anchors", "backlog.md");
    const crlf = lf.replace(/\n/g, "\r\n").replace(/\r\n?/g, "\n");
    expect(parseBacklog(crlf)).toEqual(parseBacklog(lf));
  });
});

describe("parseBacklog: posiciones en el texto original", () => {
  const text = requireFixture("es-anchors", "backlog.md");

  test("tareas libres, bloqueadas y agrupadas: cada rango empieza en su header y no incluye el comentario de ejemplo", () => {
    const backlog = parseBacklog(text);
    const tasks = [...backlog.free.tasks, ...backlog.blocked, ...backlog.grouped.flatMap((g) => g.tasks)];
    expect(tasks.map((t) => t.number)).toEqual([1, 3, 4, 5, 14, 15]);
    for (const t of tasks) {
      expect(sliceRange(text, t.range!)).toStartWith(`${"#".repeat(t.level)} ${t.label} ${t.number} — ${t.title}`);
      expect(lineNumbersMatch(text, t.range!)).toBe(true);
    }
    expect(sliceRange(text, backlog.free.tasks[0].range!)).toBe(
      "### Tarea 1 — Probar el flujo completo\n\n- **Descripción:** validar en la práctica.\n- **Bloqueos:** Ninguno.\n\n",
    );
  });

  test("la última tarea de una sección termina antes del ancla de la siguiente", () => {
    const { free, blocked, grouped, sections } = parseBacklog(text);
    expect(free.tasks[1].range!.end).toBe(sections.blocked.anchorRange!.start);
    expect(blocked[1].range!.end).toBe(sections.grouped.anchorRange!.start);
    expect(grouped[0].range!.end).toBe(text.length);
  });

  test("grupos: la referencia de libres y el contenedor de agrupadas incluyen su contenido", () => {
    const { free, grouped } = parseBacklog(text);
    expect(sliceRange(text, free.groups[0].range!)).toStartWith("### Grupo — Documentar los planes (Tareas 14, 15)\n");
    expect(sliceRange(text, free.groups[0].range!)).toEndWith("más abajo.\n\n");
    expect(sliceRange(text, grouped[0].range!)).toStartWith("### Grupo — Documentar los planes\n");
    expect(sliceRange(text, grouped[0].range!)).toContain("#### Tarea 15 — Redactar `limits.md`");
  });

  test("campos: cada uno con su línea y sus continuaciones", () => {
    const { blocked } = parseBacklog(text);
    expect(blocked[0].fields.map((f) => sliceRange(text, f.range!))).toEqual([
      "- **Descripción:** publicar el skill.\n",
      "- **Bloqueos:** `[dependencia]` depende de la Tarea 3.\n",
      "- **Detalles:** ver [el diseño](../desing.md).\n",
    ]);
    expect(sliceRange(text, blocked[1].fields[0].range!)).toEndWith("\n  - Sublista de detalle del bloqueo.\n");
  });

  test("secciones: anclas, headers y cuerpos del archivo real", () => {
    const { sections } = parseBacklog(text);
    expect(sliceRange(text, sections.free.anchorRange!)).toBe("<!-- agent-context-kit:section=free -->");
    expect(sliceRange(text, sections.free.headerRange)).toBe("## Tareas libres");
    expect(sliceRange(text, sections.grouped.bodyRange)).toStartWith("\n### Grupo — Documentar los planes");
  });

  test("plan B (sin anclas): tareas y secciones ubicadas, sin anclas", () => {
    const b = requireFixture("en-no-anchors", "backlog.md");
    const { free, sections, usedFallback } = parseBacklog(b);
    expect(usedFallback).toBe(true);
    expect(sections.free.anchorRange).toBeNull();
    expect(sections.blocked.anchorRange).toBeNull();
    for (const t of free.tasks) expect(sliceRange(b, t.range!)).toStartWith("### Task");
  });

  test("CRLF: mismas posiciones sobre el texto normalizado, traducibles al crudo", () => {
    const crlf = text.replace(/\n/g, "\r\n");
    const info = normalizeEol(crlf);
    const parsed = parseBacklog(info.text);
    expect(parsed).toEqual(parseBacklog(text));
    const [s, e] = info.rawSpan(parsed.blocked[0].range!);
    expect(crlf.slice(s, e)).toBe(sliceRange(text, parseBacklog(text).blocked[0].range!).replace(/\n/g, "\r\n"));
  });

  test("archivo vacío: sin tareas ni secciones", () => {
    const parsed = parseBacklog("");
    expect(parsed).toMatchObject({ free: { tasks: [], groups: [] }, blocked: [], grouped: [], sections: {} });
  });
});
