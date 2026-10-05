import { describe, expect, test } from "bun:test";
import { buildModel } from "../../src/model/model.ts";
import { render } from "../../src/ui/render.ts";
import { fixture } from "../helpers.ts";
import type { RenderMeta } from "../../src/shared/types.ts";

const meta = {
  projectName: "demo",
  agentsDir: "/demo/docs/agents",
  updatedAt: new Date(2026, 9, 5, 14, 30, 0),
  color: false,
  width: 100,
};
const screen = (name: string, extra: Partial<RenderMeta> = {}) =>
  render(buildModel({ handoffText: fixture(name, "handoff.md"), backlogText: fixture(name, "backlog.md") }), { ...meta, ...extra });

describe("render", () => {
  test("pinta todas las secciones sin códigos ANSI con color: false", () => {
    const out = screen("es-anchors");
    expect(out).not.toMatch(/\x1b\[/);
    expect(out).toContain("Tarea 12 — Implementar el parser de anclas");
    expect(out).toContain("Plan [█████░░░░░░░] 2/5");
    expect(out).toContain("▸ Paso 3 — Escribir el modelo");
    expect(out).toContain("⏸ PAUSADAS (1)");
    expect(out).toContain("◇ Grupo: Documentar los planes (T14, T15)");
    expect(out).toContain("• Tarea 4 — Deploy en skills.sh [dependencia]");
    expect(out).toContain("Actualizado 14:30:00 · inicio");
  });

  test("estados vacíos y set mínimo", () => {
    const out = screen("minimal", { changedFile: "handoff.md" });
    expect(out).toContain("Sin tarea en curso");
    expect(out).toContain("Ninguna");
    expect(out).not.toContain("LIBRES");
    expect(out).toContain("Sin backlog.md");
    expect(out).toContain("cambió handoff.md");
  });

  test("ninguna línea supera el ancho de la terminal", () => {
    const out = screen("es-anchors", { width: 40 });
    for (const line of out.split("\n")) expect([...line].length).toBeLessThanOrEqual(40);
  });
});
