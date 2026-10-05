import { describe, expect, test } from "bun:test";
import { buildModel } from "../src/model.js";
import { plainText, progressBar, render, truncate } from "../src/render.js";
import { fixture } from "./helpers.js";

const meta = {
  projectName: "demo",
  agentsDir: "/demo/docs/agents",
  updatedAt: new Date(2026, 9, 5, 14, 30, 0),
  color: false,
  width: 100,
};
const screen = (name, extra = {}) =>
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

describe("helpers de render", () => {
  test("truncate agrega … y respeta caracteres multibyte", () => {
    expect(truncate("áéíóú-abc", 5)).toBe("áéíó…");
    expect(truncate("corto", 10)).toBe("corto");
  });

  test("plainText quita negritas y backticks", () => {
    expect(plainText("**sin** `package.json`")).toBe("sin package.json");
  });

  test("progressBar", () => {
    expect(progressBar(0, 0, 4)).toBe("[░░░░]");
    expect(progressBar(2, 4, 4)).toBe("[██░░]");
  });
});
