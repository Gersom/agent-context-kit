import { describe, expect, test } from "bun:test";
import { buildModel } from "../../src/model/model.ts";
import type { RenderMeta } from "../../src/shared/types.ts";
import { dependencyText, render, triggerText } from "../../src/ui/render.ts";
import { fixture } from "../helpers.ts";

const meta: RenderMeta = {
  projectName: "demo-app",
  projectDir: "/proyectos/demo-app",
  updatedAt: new Date(2026, 9, 5, 14, 30, 0),
  trigger: { kind: "start" },
  color: false,
  width: 100,
};
const modelOf = (name: string) =>
  buildModel({
    handoffText: fixture(name, "handoff.md"),
    backlogText: fixture(name, "backlog.md"),
    historyText: fixture(name, "history.md"),
  });
const screen = (name: string, extra: Partial<RenderMeta> = {}) => render(modelOf(name), { ...meta, ...extra });

describe("render", () => {
  test("encabezado: nombre del repo en mayúsculas, ruta del repo y última actualización", () => {
    const lines = screen("es-anchors").split("\n");
    expect(lines.slice(0, 3)).toEqual([
      "▣ DEMO APP",
      "  /proyectos/demo-app",
      "  Última actualización 14:30:00 · al iniciar",
    ]);
  });

  test("bloques por archivo en orden: history, handoff, backlog", () => {
    const out = screen("es-anchors");
    expect(out).not.toMatch(/\x1b\[/);
    const positions = ["━━ history.md ━", "━━ handoff.md ━", "━━ backlog.md ━"].map((s) => out.indexOf(s));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  test("completadas: las últimas 5, compactas, con la descartada marcada y la fecha", () => {
    const out = screen("es-anchors");
    expect(out).toContain("✔ TAREAS COMPLETADAS (últimas 5)");
    expect(out).toContain("  T-11: Escribir el parser de secciones · 2026-10-05");
    expect(out).toContain("  T-10: Usar YAML para las tareas ✖ (descartada) · 2026-10-04");
    expect(out).toContain('  Agregar la sección "Qué es este proyecto" · 2026-10-03');
    expect(out).not.toContain("Sexta entrada");
  });

  test("completadas tachadas: el código SGR 9 envuelve el nombre, no la fecha", () => {
    const out = screen("es-anchors", { color: true });
    const line = out.split("\n").find((l) => l.includes("T-11:"));
    if (!line) throw new Error("no se encontró la línea de T-11");
    expect(line).toContain("\x1b[9mT-11: Escribir el parser de secciones\x1b[29m");
    const date = line.slice(line.indexOf("\x1b[29m"));
    expect(date).toContain("2026-10-05");
    expect(date).not.toContain("\x1b[9m");
  });

  test("handoff en detalle: plan, subsecciones (sin la del plan) y campos de pausadas", () => {
    const out = screen("es-anchors");
    expect(out).toContain("  Tarea 12 — Implementar el parser de anclas");
    expect(out).toContain("  Plan [█████░░░░░░░] 2/5");
    expect(out).toContain("    ▸ Paso 3 — Escribir el modelo");
    expect(out).toContain("  Qué falta: Pasos 3 y 4.");
    expect(out).toContain("  Próximo paso concreto: Paso 3 — escribir model.js.");
    expect(out).toContain("    Segunda línea del próximo paso.");
    expect(out).not.toContain("Modo de ejecución");
    expect(out).toContain("  • Tarea 8 — Migrar la documentación vieja");
    expect(out).toContain("      Por qué se pausó: surgió una prioridad mayor.");
  });

  test("backlog compacto con T-N, grupos y dependencias de las bloqueadas", () => {
    const out = screen("es-anchors");
    expect(out).toContain("  T-1: Probar el flujo completo");
    expect(out).toContain("  ◇ Grupo: Documentar los planes (T-14, T-15)");
    expect(out).toContain("    · T-14: Redactar costs.md");
    expect(out).toContain("  T-4: Deploy en skills.sh [dependencia]");
    expect(out).toContain("       → espera T-3: Exportar como skill");
    expect(out).toContain("  T-5: Rehacer el README [postergada]");
    expect(out).toContain("       → espera T-4: Deploy en skills.sh");
    expect(out).not.toContain("Tarea 4 —");
  });

  test("estados vacíos y set mínimo (sin backlog ni history)", () => {
    const out = screen("minimal", { trigger: { kind: "change", file: "handoff.md" } });
    expect(out).toContain("Sin tarea en curso");
    expect(out).toContain("Ninguna");
    expect(out).not.toContain("LIBRES");
    expect(out).not.toContain("history.md");
    expect(out).toContain("Sin backlog.md");
    expect(out).toContain("· se modificó handoff.md");
  });

  test("pie según los controles disponibles", () => {
    expect(screen("minimal", { controls: "keys" })).toContain("q o Ctrl+C para salir · r para redibujar");
    expect(screen("minimal")).toContain("Ctrl+C para salir");
    expect(screen("minimal", { controls: "none" })).not.toContain("Ctrl+C");
  });

  test("ninguna línea supera el ancho de la terminal", () => {
    const out = screen("es-anchors", { width: 40 });
    for (const line of out.split("\n")) expect([...line].length).toBeLessThanOrEqual(40);
  });
});

describe("helpers del render", () => {
  test("triggerText", () => {
    expect(triggerText({ kind: "start" })).toBe("al iniciar");
    expect(triggerText({ kind: "change", file: "backlog.md" })).toBe("se modificó backlog.md");
    expect(triggerText({ kind: "change", file: null })).toBe("cambio detectado");
    expect(triggerText({ kind: "redraw" })).toBe("redibujado");
  });

  test("dependencyText con la pista de la Regla 7 si ya está cerrada", () => {
    expect(dependencyText({ number: 3, title: "Exportar", closed: false })).toBe("→ espera T-3: Exportar");
    expect(dependencyText({ number: 9, title: null, closed: true })).toBe("→ espera T-9 (cerrada ✔ — ¿moverla a libres?)");
  });
});
