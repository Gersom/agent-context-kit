import { describe, expect, test } from "bun:test";
import { parseHandoff } from "../../src/parse/handoff.ts";
import { requireFixture } from "../helpers.ts";

describe("parseHandoff", () => {
  test("detecta la tarea en curso, el plan y las subsecciones", () => {
    const { inProgress, paused, usedFallback } = parseHandoff(requireFixture("es-anchors", "handoff.md"));
    expect(usedFallback).toBe(false);
    expect(inProgress.task).toEqual({ label: "Tarea", number: 12, title: "Implementar el parser de anclas" });
    expect(inProgress.steps.map((s) => s.done)).toEqual([true, true, false, false, false]);
    expect(inProgress.subsections.map((s) => s.title)).toEqual(["Plan", "Qué falta", "Próximo paso concreto"]);
    expect(paused.map((t) => t.number)).toEqual([8]);
    expect(paused[0].fields.map((f) => f.label)).toEqual(["Qué falta", "Por qué se pausó", "Qué espera para retomarse"]);
  });

  test("sin tarea en curso devuelve null", () => {
    const { inProgress, paused } = parseHandoff(requireFixture("minimal", "handoff.md"));
    expect(inProgress.task).toBeNull();
    expect(paused).toEqual([]);
  });

  test("no toma un paso de una subsección como tarea en curso", () => {
    const text = "<!-- agent-context-kit:section=in-progress -->\n## En progreso\n\nSin tarea.\n\n### Próximo\n\nPaso 4 — algo\n";
    expect(parseHandoff(text).inProgress.task).toBeNull();
  });

  test("funciona en inglés sin anclas", () => {
    const { inProgress, usedFallback } = parseHandoff(requireFixture("en-no-anchors", "handoff.md"));
    expect(usedFallback).toBe(true);
    expect(inProgress.task).toEqual({ label: "Task", number: 21, title: "Add the English onboarding" });
    expect(inProgress.steps).toHaveLength(2);
  });
});
