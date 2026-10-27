import { describe, expect, test } from "bun:test";
import { initialProjectsNav, neighborAfterRemove, type ProjectsNavState, projectsReduce, reconcileProjects } from "../../src/cli/projects-nav.ts";

const PATHS = ["/repos/ana", "/repos/gersom", "/repos/luis"];

const at = (selected: string | null, opened: string | null = null): ProjectsNavState => ({ selected, opened });

describe("initialProjectsNav", () => {
  test("elige el primero; sin proyectos, ninguno", () => {
    expect(initialProjectsNav(PATHS)).toEqual(at("/repos/ana"));
    expect(initialProjectsNav([])).toEqual(at(null));
  });

  test("conserva el elegido que se pide si todavía figura", () => {
    expect(initialProjectsNav(PATHS, "/repos/luis")).toEqual(at("/repos/luis"));
    expect(initialProjectsNav(PATHS, "/repos/otro")).toEqual(at("/repos/ana"));
  });
});

describe("projectsReduce", () => {
  test("↓ y ↑ recorren la lista y dan la vuelta", () => {
    expect(projectsReduce(at("/repos/ana"), "down", PATHS)).toEqual(at("/repos/gersom"));
    expect(projectsReduce(at("/repos/luis"), "down", PATHS)).toEqual(at("/repos/ana"));
    expect(projectsReduce(at("/repos/gersom"), "up", PATHS)).toEqual(at("/repos/ana"));
    expect(projectsReduce(at("/repos/ana"), "up", PATHS)).toEqual(at("/repos/luis"));
  });

  test("sin elegido, ↓ va al primero y ↑ al último; sin proyectos no hacen nada", () => {
    expect(projectsReduce(at(null), "down", PATHS)).toEqual(at("/repos/ana"));
    expect(projectsReduce(at(null), "up", PATHS)).toEqual(at("/repos/luis"));
    expect(projectsReduce(at(null), "down", [])).toEqual(at(null));
  });

  test("Enter pide abrir el elegido (la selección se queda); sin elegido o con uno que ya no figura no hace nada", () => {
    expect(projectsReduce(at("/repos/gersom"), "enter", PATHS)).toEqual(at("/repos/gersom", "/repos/gersom"));
    const none = at(null);
    expect(projectsReduce(none, "enter", PATHS)).toBe(none);
    const gone = at("/repos/otro");
    expect(projectsReduce(gone, "enter", PATHS)).toBe(gone);
  });

  test("volver, compactar, flechas del flujo, redibujar y salir no cambian el estado", () => {
    const state = at("/repos/ana");
    for (const key of ["back", "compact", "flow", "redraw", "quit"] as const) expect(projectsReduce(state, key, PATHS)).toBe(state);
  });
});

describe("reconcileProjects", () => {
  test("estado vigente: el mismo objeto", () => {
    const state = at("/repos/ana");
    expect(reconcileProjects(state, PATHS)).toBe(state);
  });

  test("el elegido desapareció: elige el primero; sin proyectos, ninguno", () => {
    expect(reconcileProjects(at("/repos/otro"), PATHS)).toEqual(at("/repos/ana"));
    expect(reconcileProjects(at("/repos/ana"), [])).toEqual(at(null));
  });

  test("sigue siendo el mismo proyecto aunque cambie su posición en la lista", () => {
    expect(reconcileProjects(at("/repos/luis"), ["/repos/luis", ...PATHS.slice(0, 2)])).toEqual(at("/repos/luis"));
  });

  test("lo que se pidió abrir y ya no figura se descarta", () => {
    expect(reconcileProjects(at("/repos/ana", "/repos/otro"), PATHS)).toEqual(at("/repos/ana"));
  });
});

describe("neighborAfterRemove", () => {
  test("elige la siguiente; si era la última, la anterior; si era la única o no figura, null", () => {
    expect(neighborAfterRemove(["a", "b", "c"], "b")).toBe("c");
    expect(neighborAfterRemove(["a", "b", "c"], "c")).toBe("b");
    expect(neighborAfterRemove(["a", "b", "c"], "a")).toBe("b");
    expect(neighborAfterRemove(["a"], "a")).toBeNull();
    expect(neighborAfterRemove(["a"], "z")).toBeNull();
  });
});
