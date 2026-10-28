import { describe, expect, test } from "bun:test";
import type { ProjectRow, ProjectsRenderMeta } from "../../src/shared/types.ts";
import { render, renderObserver, renderProjects, renderTeam } from "../../src/ui/render.ts";
import { buildModel } from "../../src/model/model.ts";
import { fixture } from "../../../_shared/test/helpers.ts";

const STATUS = "Observando: el board cambia solo de proyecto cuando pulsas el botón «Marcar este proyecto» del mod de Claude o escribes /board.";

const projectsMeta: ProjectsRenderMeta = {
  updatedAt: new Date(2026, 9, 6, 12, 0, 0),
  trigger: { kind: "start" },
  color: false,
  width: 160,
  selected: "/repos/demo-app",
  controls: "keys",
  multiView: "projects",
};
const rows: ProjectRow[] = [{ name: "demo-app", path: "/repos/demo-app", operator: "ana", work: null, warning: null }];

const model = buildModel({
  handoffText: fixture("es-anchors", "handoff.md"),
  backlogText: fixture("es-anchors", "backlog.md"),
  historyText: fixture("es-anchors", "history.md"),
});
const repoMeta = { projectName: "demo-app", projectDir: "/repos/demo-app", updatedAt: projectsMeta.updatedAt, trigger: projectsMeta.trigger, color: false, width: 160, controls: "keys" as const };

describe("modo observador: pie", () => {
  test("apagado, la lista de proyectos ofrece [o] observar antes de salir", () => {
    expect(renderProjects(rows, projectsMeta)).toContain("[r] releer - [o] observar - [Ctrl+C o q] salir");
  });

  test("activo, la lista de proyectos ofrece salir del modo observador", () => {
    const out = renderProjects(rows, { ...projectsMeta, observer: { notice: null } });
    expect(out).toContain("[r] releer - [o] salir del modo observador - [Ctrl+C o q] salir");
    expect(out).not.toContain("[o] observar");
  });

  test("apagado, el panel de un repo ofrece [o] observar; activo, salir del modo observador", () => {
    expect(render(model, repoMeta)).toContain("[r] redibujar - [o] observar - [Ctrl+C o q] salir");
    const on = render(model, { ...repoMeta, observer: { notice: null } });
    expect(on).toContain("[r] redibujar - [o] salir del modo observador - [Ctrl+C o q] salir");
    expect(on).not.toContain("[o] observar");
  });

  test("la vista de equipo y el panel de un operador también lo ofrecen", () => {
    const team = { rows: [], teamBacklog: { present: false as const, free: [], blocked: [], warnings: [] }, warnings: [] };
    expect(renderTeam(team, { ...repoMeta, multiView: "team", selected: null, preferred: null })).toContain("[o] observar");
    expect(render(model, { ...repoMeta, multiView: "operator", observer: { notice: null } })).toContain("[o] salir del modo observador");
  });

  test("activo, el panel de un repo no ofrece [p] proyectos; apagado, sí", () => {
    expect(render(model, repoMeta)).toContain("[p] proyectos");
    const on = render(model, { ...repoMeta, observer: { notice: null } });
    expect(on).not.toContain("[p] proyectos");
    expect(on).toContain("[c] ");
    expect(on).toContain("[r] redibujar - [o] salir del modo observador");
  });

  test("activo, el panel de un operador no ofrece volver al equipo; apagado, sí", () => {
    expect(render(model, { ...repoMeta, multiView: "operator" })).toContain("[Esc o b] volver al equipo");
    const on = render(model, { ...repoMeta, multiView: "operator", observer: { notice: null } });
    expect(on).not.toContain("volver");
    expect(on).not.toContain("[p] proyectos");
  });

  test("activo, la vista de equipo no ofrece [p] proyectos pero sí elegir y abrir", () => {
    const team = { rows: [], teamBacklog: { present: false as const, free: [], blocked: [], warnings: [] }, warnings: [] };
    const on = renderTeam(team, { ...repoMeta, multiView: "team", selected: null, preferred: null, observer: { notice: null } });
    expect(on).not.toContain("[p] proyectos");
    expect(on).toContain("[↑/↓] elegir - [Enter] abrir");
  });

  test("agregando o confirmando quitar, la lista solo ofrece las teclas de ese paso", () => {
    expect(renderProjects(rows, { ...projectsMeta, input: "/x" })).not.toContain("[o]");
    expect(renderProjects(rows, { ...projectsMeta, confirmRemove: { name: "demo-app", path: "/repos/demo-app" } })).not.toContain("[o]");
  });

  test("sin teclas activas no hay [o] en el pie", () => {
    expect(renderProjects(rows, { ...projectsMeta, controls: "ctrl-c" })).not.toContain("[o]");
    expect(renderProjects(rows, { ...projectsMeta, controls: "none" })).not.toContain("[o]");
  });

  test("el pie con el observador activo sigue cabiendo en el ancho (se parte en más líneas)", () => {
    for (const width of [100, 60, 40]) {
      for (const line of render(model, { ...repoMeta, width, observer: { notice: null } }).split("\n")) expect([...line].length).toBeLessThanOrEqual(width);
    }
  });
});

describe("modo observador: línea de estado", () => {
  test("apagado no cambia nada: ni la línea ni el aviso", () => {
    expect(renderProjects(rows, projectsMeta)).not.toContain("Observando");
    expect(render(model, repoMeta)).not.toContain("Observando");
    // Sin el campo `observer` la pantalla es idéntica a la de siempre.
    expect(render(model, { ...repoMeta, observer: undefined })).toBe(render(model, repoMeta));
  });

  test("activo en la lista de proyectos: la línea de estado, sin aviso", () => {
    const out = renderProjects(rows, { ...projectsMeta, observer: { notice: null } });
    expect(out).toContain(`ℹ ${STATUS}`);
    expect(out).not.toContain("! ");
  });

  test("activo en el panel de un repo: la línea de estado, sin aviso", () => {
    const out = render(model, { ...repoMeta, observer: { notice: null } });
    expect(out).toContain(`ℹ ${STATUS}`);
  });

  test("con aviso: otra línea con ese aviso, después de la de estado", () => {
    const notice = "No se pudo abrir /repos/roto: No existe la carpeta.";
    for (const out of [renderProjects(rows, { ...projectsMeta, observer: { notice } }), render(model, { ...repoMeta, observer: { notice } })]) {
      const lines = out.split("\n");
      const status = lines.findIndex((l) => l.includes("Observando"));
      expect(status).toBeGreaterThan(-1);
      expect(lines[status + 1]).toBe(`! ${notice}`);
    }
  });

  test("va entre el recuadro y el pie, separada por una línea en blanco", () => {
    const lines = renderProjects(rows, { ...projectsMeta, observer: { notice: null } }).split("\n");
    const status = lines.findIndex((l) => l.includes("Observando"));
    expect(lines[status - 1]).toBe("");
    expect(lines[status - 2]).toMatch(/^╰─+╯$/);
    expect(lines[status + 1]).toBe("");
    expect(lines[status + 2]).toContain("[↑/↓] elegir");
  });

  test("si no entra en el ancho se parte en palabras y no se pierde el final", () => {
    for (const width of [100, 60, 40]) {
      const out = renderProjects(rows, { ...projectsMeta, width, observer: { notice: null } });
      const lines = out.split("\n");
      for (const line of lines) expect([...line].length).toBeLessThanOrEqual(width);
      const start = lines.findIndex((l) => l.startsWith("ℹ Observando"));
      const text = [];
      for (let i = start; lines[i] !== ""; i++) text.push(lines[i].slice(2));
      expect(text.join(" ")).toBe(STATUS);
    }
  });

  test("el aviso largo se recorta al ancho como los demás avisos", () => {
    const notice = `No se pudo abrir ${"/carpeta".repeat(30)}`;
    for (const line of render(model, { ...repoMeta, width: 80, observer: { notice } }).split("\n")) expect([...line].length).toBeLessThanOrEqual(80);
  });
});

describe("modo observador: vista de espera", () => {
  const WAITING = "Esperando: el board cambiará solo de proyecto cuando pulses el botón «Marcar este proyecto» del mod de Claude o escribas /board.";
  const waitingMeta = { updatedAt: projectsMeta.updatedAt, trigger: projectsMeta.trigger, color: false, width: 160, controls: "keys" as const, observer: { notice: null } };

  /** El texto de las líneas desde `start` hasta la próxima línea en blanco, unido con espacios. */
  const paragraph = (lines: string[], start: number): string => {
    const text = [];
    for (let i = start; lines[i] !== ""; i++) text.push(lines[i]);
    return text.join(" ");
  };

  test("título, texto de espera y pie, sin recuadros de tareas ni la línea de estado", () => {
    const out = renderObserver(waitingMeta);
    const lines = out.split("\n");
    // El título es MODO OBSERVADOR, sin la línea extra ni línea de nombre/ruta.
    expect(lines.slice(0, 3)).toEqual(["MODO OBSERVADOR", "  Última actualización 12:00:00 · al iniciar", ""]);
    expect(out.match(/MODO OBSERVADOR/g)).toHaveLength(1);
    expect(out).toContain(WAITING);
    expect(out).toContain("[o] salir del modo observador - [Ctrl+C o q] salir");
    expect(out).not.toContain("[o] observar");
    expect(out).not.toContain("Observando");
    expect(out).not.toContain("! ");
    expect(out).not.toMatch(/[╭╰]/);
    for (const word of ["EN PROGRESO", "LIBRES", "PROYECTOS", "[p] proyectos", "[c] "]) expect(out).not.toContain(word);
  });

  test("el pie va después del texto, separado por una línea en blanco", () => {
    const lines = renderObserver(waitingMeta).split("\n");
    const text = lines.findIndex((l) => l.startsWith("Esperando"));
    expect(lines[text - 1]).toBe("");
    expect(lines[text + 1]).toBe("");
    expect(lines[text + 2]).toBe("[o] salir del modo observador - [Ctrl+C o q] salir");
  });

  test("con aviso: una línea `! …` entre el texto y el pie", () => {
    const notice = "No se pudo abrir /repos/roto: No existe la carpeta.";
    const lines = renderObserver({ ...waitingMeta, observer: { notice } }).split("\n");
    const text = lines.findIndex((l) => l.startsWith("Esperando"));
    expect(lines[text + 1]).toBe("");
    expect(lines[text + 2]).toBe(`! ${notice}`);
    expect(lines[text + 3]).toBe("");
    expect(lines[text + 4]).toContain("[o] salir del modo observador");
  });

  test("sin el campo observer tampoco hay aviso", () => {
    expect(renderObserver({ ...waitingMeta, observer: undefined })).not.toContain("! ");
  });

  test("en un ancho estrecho el texto y el pie se parten en palabras y no se pierde el final", () => {
    for (const width of [100, 60, 40]) {
      const lines = renderObserver({ ...waitingMeta, width }).split("\n");
      for (const line of lines) expect([...line].length).toBeLessThanOrEqual(width);
      expect(paragraph(lines, lines.findIndex((l) => l.startsWith("Esperando")))).toBe(WAITING);
      const footer = lines.findIndex((l) => l.startsWith("[o]"));
      expect(paragraph(lines, footer).replace(/ - /g, " ").replace(/\s+/g, " ")).toContain("[o] salir del modo observador");
    }
  });

  test("el aviso largo se recorta al ancho como los demás avisos", () => {
    const notice = `No se pudo abrir ${"/carpeta".repeat(30)}`;
    for (const line of renderObserver({ ...waitingMeta, width: 80, observer: { notice } }).split("\n")) expect([...line].length).toBeLessThanOrEqual(80);
  });

  test("sin teclas activas el pie es el de siempre", () => {
    expect(renderObserver({ ...waitingMeta, controls: "ctrl-c" })).toContain("[Ctrl+C] salir");
    expect(renderObserver({ ...waitingMeta, controls: "none" })).not.toContain("[o]");
  });
});
