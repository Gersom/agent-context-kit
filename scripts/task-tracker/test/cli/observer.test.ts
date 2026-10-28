import { describe, expect, test } from "bun:test";
import type { NavKey } from "../../src/cli/keys.ts";
import { ignoredWithObserver, observerStep, startObserver } from "../../src/cli/observer.ts";

describe("ignoredWithObserver", () => {
  test("ir a proyectos y volver se ignoran", () => {
    expect(ignoredWithObserver("projects")).toBe(true);
    expect(ignoredWithObserver("back")).toBe(true);
  });

  test("el resto de las teclas del tablero siguen valiendo", () => {
    const rest: NavKey[] = ["quit", "redraw", "up", "down", "enter", "compact", "flow", "observe"];
    for (const key of rest) expect(ignoredWithObserver(key)).toBe(false);
  });
});

describe("startObserver", () => {
  test("arranca en el instante dado", () => {
    expect(startObserver(1000)).toEqual({ since: 1000, lastAt: 1000 });
  });
});

describe("observerStep", () => {
  test("sin lectura: el estado no cambia y no abre nada", () => {
    const state = startObserver(1000);
    expect(observerStep(state, null)).toEqual({ state, open: null });
  });

  test("marca anterior al arranque: no abre", () => {
    const state = startObserver(1000);
    expect(observerStep(state, { path: "/a", at: 500 })).toEqual({ state, open: null });
  });

  test("marca igual a la última atendida: no abre", () => {
    const state = startObserver(1000);
    expect(observerStep(state, { path: "/a", at: 1000 })).toEqual({ state, open: null });
  });

  test("marca nueva: abre la ruta y sube lastAt (since no cambia)", () => {
    const step = observerStep(startObserver(1000), { path: "/a", at: 2000 });
    expect(step).toEqual({ state: { since: 1000, lastAt: 2000 }, open: "/a" });
  });

  test("la misma marca leída otra vez no vuelve a abrir", () => {
    const first = observerStep(startObserver(1000), { path: "/a", at: 2000 });
    expect(observerStep(first.state, { path: "/a", at: 2000 })).toEqual({ state: first.state, open: null });
  });

  test("dos clics seguidos: abre uno y luego el otro", () => {
    const first = observerStep(startObserver(1000), { path: "/a", at: 2000 });
    const second = observerStep(first.state, { path: "/b", at: 3000 });
    expect(first.open).toBe("/a");
    expect(second).toEqual({ state: { since: 1000, lastAt: 3000 }, open: "/b" });
  });

  test("no modifica el estado recibido", () => {
    const state = startObserver(1000);
    observerStep(state, { path: "/a", at: 2000 });
    expect(state).toEqual({ since: 1000, lastAt: 1000 });
  });
});
