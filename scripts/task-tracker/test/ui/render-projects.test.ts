import { describe, expect, test } from "bun:test";
import type { ProjectRow, ProjectsRenderMeta } from "../../src/shared/types.ts";
import { render, renderProjects } from "../../src/ui/render.ts";
import { buildModel } from "../../src/model/model.ts";
import { fixture } from "../../../_shared/test/helpers.ts";

const meta: ProjectsRenderMeta = {
  updatedAt: new Date(2026, 9, 6, 12, 0, 0),
  trigger: { kind: "start" },
  color: false,
  width: 100,
  selected: "/repos/demo-app",
};

const rows: ProjectRow[] = [
  {
    name: "demo-app",
    path: "/repos/demo-app",
    operator: "ana",
    work: { current: { label: "Tarea", number: 12, title: "Implementar el parser", }, counts: { free: 2, blocked: 1 } },
    warning: null,
  },
  { name: "plano", path: "/repos/plano", operator: null, work: { current: null, counts: { free: 0, blocked: 0 } }, warning: null },
  { name: "ajeno", path: "/repos/ajeno", operator: null, work: null, warning: null },
  { name: "roto", path: "/repos/roto", operator: null, work: null, warning: "No existe la carpeta: /repos/roto" },
];

describe("renderProjects", () => {
  const out = renderProjects(rows, meta);
  const lines = out.split("\n");

  test("encabezado sin repo y recuadro PROYECTOS con la cantidad", () => {
    expect(lines[0]).toBe("▣ proyectos");
    expect(lines[1]).toContain("Última actualización");
    expect(out).toMatch(/╭─ PROYECTOS \(4\) ─+ docs\/agents ─╮/);
  });

  test("encabezado de columnas: nombre, ruta, operador, en curso, libres y bloqueadas", () => {
    const head = lines.find((line) => line.includes("nombre"));
    expect(head).toMatch(/nombre +ruta +operador +en curso +libres +bloqueadas/);
  });

  test("fila con operador: tarea en curso y conteos; el elegido lleva «›»", () => {
    const line = lines.find((l) => l.includes("demo-app"));
    expect(line).toMatch(/^│ › demo-app +\/repos\/demo-app +ana +T-12: Implementar el parser +2 +1 │$/);
  });

  test("sin tarea en curso lo dice; operador no identificado: «—» en operador, tarea y conteos", () => {
    expect(lines.find((l) => l.includes("plano"))).toMatch(/^│ {3}plano +\/repos\/plano +— +Sin tarea en curso +0 +0 │$/);
    expect(lines.find((l) => l.includes("ajeno"))).toMatch(/^│ {3}ajeno +\/repos\/ajeno +— +— +— +— │$/);
  });

  test("repo ilegible: su aviso en lugar de los datos, sin romper la lista", () => {
    expect(lines.find((l) => l.includes("roto"))).toMatch(/^│ {3}roto +\/repos\/roto +! No existe la carpeta: \/repos\/roto +│$/);
  });

  test("las columnas quedan alineadas entre filas", () => {
    const cols = ["/repos/demo-app", "/repos/plano", "/repos/ajeno", "/repos/roto"].map((p) => lines.find((l) => l.includes(p))!.indexOf(p));
    expect(new Set(cols).size).toBe(1);
  });

  test("sin colores no hay códigos ANSI y todo cabe en el ancho, también con ancho chico", () => {
    expect(out).not.toMatch(/\x1b\[/);
    for (const width of [100, 60, 40]) {
      for (const line of renderProjects(rows, { ...meta, width }).split("\n")) expect([...line].length).toBeLessThanOrEqual(width);
    }
  });

  test("pie: sin controles nada; con teclas, las de la lista; con Ctrl+C, solo salir", () => {
    expect(renderProjects(rows, { ...meta, controls: "none" })).not.toContain("[");
    expect(renderProjects(rows, { ...meta, controls: "keys", multiView: "projects" })).toContain("[↑/↓] elegir - [Enter] abrir - [a] agregar repo - [r] releer - [Ctrl+C o q] salir");
    expect(renderProjects(rows, { ...meta, controls: "keys", multiView: "projects" })).not.toContain("compactar");
    expect(renderProjects(rows, { ...meta, controls: "ctrl-c" })).toContain("[Ctrl+C] salir");
  });

  test("agregando un repo: la línea de la ruta con el cursor y el pie de la entrada", () => {
    const out = renderProjects(rows, { ...meta, controls: "keys", multiView: "projects", input: "/repos/nuevo" });
    expect(out).toContain("Ruta del repo: /repos/nuevo█");
    expect(out).toContain("[Enter] agregar - [Esc] cancelar - [Ctrl+C] salir");
    expect(out).not.toContain("[a] agregar repo");
    expect(renderProjects(rows, meta)).not.toContain("Ruta del repo");
    expect(renderProjects([], { ...meta, input: "x" })).toContain("Ruta del repo: x█");
  });

  test("una ruta más larga que el ancho se muestra por el final, con el cursor", () => {
    const long = `/repos/${"carpeta/".repeat(20)}final`;
    const out = renderProjects(rows, { ...meta, input: long });
    expect(out).toContain("Ruta del repo: …");
    expect(out).toContain("final█");
    expect(out).not.toContain("/repos/carpeta");
  });

  test("sin teclas no se sugiere [a] en el estado vacío", () => {
    expect(renderProjects([], { ...meta, controls: "keys" })).toContain("[a]");
    expect(renderProjects([], { ...meta, controls: "ctrl-c" })).not.toContain("[a]");
  });

  test("avisos de la vista", () => {
    expect(renderProjects(rows, meta, ["No se pudo abrir /repos/roto."])).toContain("! No se pudo abrir /repos/roto.");
  });

  test("con color: el elegido va en verde y los conteos en cian y rojo", () => {
    const colored = renderProjects(rows, { ...meta, color: true });
    expect(colored).toContain("\x1b[32m");
    expect(colored).toContain("\x1b[36m");
    expect(colored).toContain("\x1b[31m");
  });
});

describe("renderProjects sin proyectos", () => {
  const out = renderProjects([], meta);

  test("recuadro vacío con un mensaje claro de cómo abrir uno", () => {
    expect(out).toMatch(/╭─ PROYECTOS \(0\) ─+ docs\/agents ─╮/);
    expect(out).toContain("No hay proyectos para mostrar.");
    expect(out).toContain("Abre uno con: acsuite board <ruta>");
    expect(out).not.toContain("nombre");
  });
});

describe("pie de un repo abierto desde la lista", () => {
  const model = buildModel({
    handoffText: fixture("es-anchors", "handoff.md"),
    backlogText: fixture("es-anchors", "backlog.md"),
    historyText: fixture("es-anchors", "history.md"),
  });
  const repo = { projectName: "demo-app", projectDir: "/repos/demo-app", updatedAt: meta.updatedAt, trigger: meta.trigger, color: false, width: 120, controls: "keys" as const };

  test("el panel plano indica cómo volver a la lista; sin ella, no", () => {
    expect(render(model, { ...repo, backToProjects: true })).toContain("[Esc o b] volver a proyectos - [p] proyectos - [c] compactar");
    expect(render(model, repo)).not.toContain("volver a proyectos");
  });

  test("todas las vistas de un repo ofrecen [p] proyectos; la lista no", () => {
    expect(render(model, repo)).toContain("[p] proyectos");
    expect(render(model, { ...repo, multiView: "operator" })).toContain("[p] proyectos");
    expect(render(model, { ...repo, backToProjects: true })).toContain("[p] proyectos");
  });

  test("en el panel de un operador `b` vuelve al equipo, no a la lista", () => {
    const out = render(model, { ...repo, backToProjects: true, multiView: "operator" });
    expect(out).toContain("[Esc o b] volver al equipo");
    expect(out).not.toContain("volver a proyectos");
  });
});
