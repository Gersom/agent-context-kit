import { describe, expect, test } from "bun:test";
import { parseBacklog } from "../../src/parse/backlog.js";
import { fixture } from "../helpers.js";

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
