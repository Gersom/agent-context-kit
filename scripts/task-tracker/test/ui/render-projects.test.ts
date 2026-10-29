import { describe, expect, test } from "bun:test";
import type { ProjectRow, ProjectsRenderMeta } from "../../src/shared/types.ts";
import { render, renderProjects, renderTeam } from "../../src/ui/render.ts";
import { visibleLength } from "../../src/ui/format.ts";
import { MIN_CURRENT_WIDTH, MIN_PATH_WIDTH, projectColumns, projectViewMode, truncateStart } from "../../src/ui/project-columns.ts";
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

  test("encabezado PROYECTOS sin línea de nombre/ruta y recuadro PROYECTOS con la cantidad", () => {
    expect(lines[0]).toBe("▣ PROYECTOS");
    expect(lines[1]).toBe("  Última actualización 12:00:00 · al iniciar");
    expect(lines[2]).toBe("");
    expect(out).toMatch(/╭─ PROYECTOS \(4\) ─+ docs\/agents ─╮/);
  });

  test("encabezado: el título lleva el sufijo · MODO OBSERVADOR solo con el observador activo; sin color no hay ANSI", () => {
    expect(out).not.toContain("MODO OBSERVADOR");
    const on = renderProjects(rows, { ...meta, observer: { notice: null } }).split("\n");
    expect(on.slice(0, 2)).toEqual(["▣ PROYECTOS · MODO OBSERVADOR", "  Última actualización 12:00:00 · al iniciar"]);
    expect(out).not.toMatch(/\x1b/);
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
    expect(renderProjects(rows, { ...meta, controls: "keys", multiView: "projects", width: 140 })).toContain("[↑/↓] elegir - [Enter] abrir - [a] agregar repo - [x] quitar - [r] releer - [o] observar - [Ctrl+C o q] salir");
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

  test("confirmando quitar: la línea con el nombre y la ruta dentro del recuadro y el pie de la confirmación", () => {
    const keys = { ...meta, controls: "keys" as const, multiView: "projects" as const };
    const out = renderProjects(rows, { ...keys, confirmRemove: { name: "demo-app", path: "/repos/demo-app" } });
    expect(out.split("\n").find((l) => l.includes("¿Quitar"))).toMatch(/^│ ¿Quitar demo-app \(\/repos\/demo-app\) de la lista\? \[Enter\] sí · \[Esc\] no +│$/);
    expect(out).toContain("[Enter] quitar - [Esc] cancelar - [Ctrl+C] salir");
    expect(out).not.toContain("[x] quitar");
    expect(out).not.toContain("[a] agregar repo");
    // Sin confirmar, ni la línea ni el pie de la confirmación; el pie normal ofrece [x] quitar.
    const normal = renderProjects(rows, keys);
    expect(normal).not.toContain("¿Quitar");
    expect(normal).not.toContain("[Enter] quitar");
    expect(normal).toContain("[x] quitar");
    expect(renderProjects(rows, { ...keys, confirmRemove: null })).not.toContain("¿Quitar");
  });

  test("sin teclas activas no se ofrece [x] quitar", () => {
    expect(renderProjects(rows, { ...meta, controls: "ctrl-c" })).not.toContain("[x]");
    expect(renderProjects(rows, { ...meta, controls: "none" })).not.toContain("[x]");
  });

  test("[x] quitar solo aparece en el pie cuando hay filas", () => {
    const keys = { ...meta, controls: "keys" as const, multiView: "projects" as const };
    const empty = renderProjects([], keys);
    expect(empty).not.toContain("[x]");
    expect(empty).toContain("[↑/↓] elegir - [Enter] abrir - [a] agregar repo - [r] releer - [o] observar - [Ctrl+C o q] salir");
    expect(renderProjects(rows.slice(0, 1), keys)).toContain("[a] agregar repo - [x] quitar - [r] releer");
  });

  test("la línea de confirmación cabe en el ancho, también con ancho chico y un nombre largo", () => {
    const confirmRemove = { name: "un-nombre-de-proyecto-muy-largo-que-no-entra", path: "/repos/un-nombre-de-proyecto-muy-largo-que-no-entra" };
    for (const width of [100, 60, 40]) {
      for (const line of renderProjects(rows, { ...meta, width, confirmRemove }).split("\n")) {
        expect([...line].length).toBeLessThanOrEqual(width);
      }
    }
  });

  test("una ruta que no cabe en la confirmación se corta por el principio y deja entero el resto de la línea", () => {
    const path = `/repos/${"carpeta/".repeat(20)}final`;
    for (const width of [100, 80]) {
      const line = renderProjects(rows, { ...meta, width, confirmRemove: { name: "demo-app", path } }).split("\n").find((l) => l.includes("¿Quitar"))!;
      expect(line).toMatch(/^│ ¿Quitar demo-app \(….*final\) de la lista\? \[Enter\] sí · \[Esc\] no +│$/);
      expect([...line].length).toBeLessThanOrEqual(width);
      expect(line).not.toContain("/repos/carpeta");
    }
    // Si cabe, va entera y sin «…».
    const short = renderProjects(rows, { ...meta, confirmRemove: { name: "demo-app", path: "/repos/demo-app" } });
    expect(short).not.toContain("(…");
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

// Filas largas: nombre de más de 24 columnas y rutas largas (lo que más aprieta a la tabla).
const longName = "un-nombre-de-proyecto-muy-largo-que-no-entra";
const longPath = `/repos/${"carpeta/".repeat(6)}${longName}`;
const longRows: ProjectRow[] = [
  {
    name: longName,
    path: longPath,
    operator: "gersom",
    work: { current: { label: "Tarea", number: 12, title: "Implementar el parser de los anchors" }, counts: { free: 3, blocked: 3 } },
    warning: null,
  },
  { name: "plano", path: "/repos/plano", operator: null, work: { current: null, counts: { free: 0, blocked: 0 } }, warning: null },
  { name: "ajeno", path: "/repos/ajeno", operator: null, work: null, warning: null },
  { name: "roto", path: `${longPath}-roto`, operator: null, work: null, warning: "No existe la carpeta: /repos/roto" },
];
// Nombre largo pero rutas cortas: la tabla le da a cada columna lo que pide su contenido.
const mediumRows: ProjectRow[] = [{ ...longRows[0], path: "/repos/largo" }, longRows[1], longRows[2]];
const longMeta: ProjectsRenderMeta = { ...meta, selected: longPath };
const lengthOf = (line: string) => visibleLength(line);
/** Primer ancho (entre 40 y 300) en el que la lista se dibuja como tabla. */
const threshold = (list: ProjectRow[]) => {
  for (let width = 40; width <= 300; width++) if (projectViewMode(list, width) === "table") return width;
  throw new Error("nunca llega a tabla");
};

describe("projectViewMode", () => {
  test("el umbral sale del contenido: filas cortas llegan a tabla con menos ancho que filas largas", () => {
    expect(threshold(rows)).toBeLessThan(threshold(longRows));
    expect(threshold(rows)).toBeLessThanOrEqual(100);
    expect(threshold(longRows)).toBeGreaterThan(100);
    expect(threshold(longRows)).toBeLessThan(140);
  });

  test("en el borde: un ancho antes son tarjetas; desde el umbral, tabla con la ruta y «en curso» en sus mínimos", () => {
    for (const list of [rows, mediumRows, longRows]) {
      const edge = threshold(list);
      expect(projectViewMode(list, edge - 1)).toBe("cards");
      expect(projectViewMode(list, edge)).toBe("table");
      expect(projectViewMode(list, edge + 40)).toBe("table");
      const cols = projectColumns(list, edge);
      expect(cols.pathW).toBeGreaterThanOrEqual(Math.min(cols.pathMax, MIN_PATH_WIDTH));
      expect(cols.currentW).toBeGreaterThanOrEqual(Math.min(cols.currentMax, MIN_CURRENT_WIDTH));
      // Un ancho antes, una de las dos columnas se queda por debajo de su mínimo.
      const before = projectColumns(list, edge - 1);
      expect(before.pathW < Math.min(before.pathMax, MIN_PATH_WIDTH) || before.currentW < Math.min(before.currentMax, MIN_CURRENT_WIDTH)).toBe(true);
    }
  });

  test("con rutas largas la ruta llega justo a su mínimo en el umbral", () => {
    const cols = projectColumns(longRows, threshold(longRows));
    expect(cols.pathW).toBeGreaterThanOrEqual(MIN_PATH_WIDTH);
    expect(cols.pathW).toBeLessThanOrEqual(MIN_PATH_WIDTH + 1);
  });

  test("más ancho nunca vuelve a tarjetas", () => {
    let table = false;
    for (let width = 40; width <= 300; width++) {
      const mode = projectViewMode(longRows, width);
      if (table) expect(mode).toBe("table");
      table ||= mode === "table";
    }
  });
});

describe("renderProjects según el ancho", () => {
  const headerRe = /nombre +ruta +operador +en curso +libres +bloqueadas/;

  test("terminal ancha: tabla con todos los encabezados completos", () => {
    for (const [list, width] of [[longRows, 140], [mediumRows, 100]] as const) {
      const out = renderProjects(list, { ...longMeta, width });
      expect(out.split("\n").some((l) => headerRe.test(l))).toBe(true);
      expect(out).not.toMatch(/ · \d+ libres · /);
    }
  });

  test("terminal angosta: tarjetas, sin encabezados de columnas", () => {
    for (const width of [100, 80, 60, 50, 40]) {
      const out = renderProjects(longRows, { ...longMeta, width });
      expect(out).not.toMatch(headerRe);
      expect(out).not.toMatch(/│ +(nombre|ruta|operador)/);
      expect(out).toContain("· 3 libres · 3 bloqueadas");
    }
  });

  test("en todos los anchos ninguna línea supera el ancho de la pantalla, con entrada y confirmación", () => {
    const keys = { ...longMeta, controls: "keys" as const, multiView: "projects" as const };
    const extras = [{}, { input: longPath }, { confirmRemove: { name: longName, path: longPath } }];
    for (const width of [300, 140, 120, 118, 117, 100, 80, 70, 60, 50, 45, 40]) {
      for (const list of [rows, longRows, mediumRows]) {
        for (const extra of extras) {
          for (const line of renderProjects(list, { ...keys, ...extra, width }, ["No se pudo abrir " + longPath]).split("\n")) {
            expect(lengthOf(line)).toBeLessThanOrEqual(width);
          }
        }
      }
    }
  });

  test("sin color no hay ANSI en ningún modo; con color, las tarjetas pintan elegido y conteos", () => {
    for (const width of [140, 80, 40]) expect(renderProjects(longRows, { ...longMeta, width })).not.toMatch(/\x1b/);
    const colored = renderProjects(longRows, { ...longMeta, width: 80, color: true });
    const unselected = renderProjects(longRows, { ...longMeta, width: 80, color: true, selected: null });
    const greens = (s: string) => s.split("\x1b[32m").length;
    expect(greens(colored)).toBeGreaterThan(greens(unselected));
    expect(colored).toContain("\x1b[36m");
    expect(colored).toContain("\x1b[31m");
    expect(colored).toContain("\x1b[33m");
  });
});

describe("renderProjects como tarjetas", () => {
  /** Las líneas de contenido del recuadro, sin los bordes. */
  const cardLines = (list: ProjectRow[], width: number, extra: Partial<ProjectsRenderMeta> = {}) =>
    renderProjects(list, { ...longMeta, width, ...extra })
      .split("\n")
      .filter((l) => l.startsWith("│"))
      .map((l) => l.slice(2, -2).trimEnd());

  test("tres líneas por proyecto, con una línea en blanco entre uno y otro", () => {
    const lines = cardLines(rows, 60, { selected: rows[0].path });
    expect(lines).toHaveLength(rows.length * 4 - 1);
    expect(lines.slice(0, 3)).toEqual(["› demo-app · 2 libres · 1 bloqueadas", "  /repos/demo-app", "  ana · T-12: Implementar el parser"]);
    expect(lines[3]).toBe("");
    expect(lines.slice(4, 7)).toEqual(["  plano · 0 libres · 0 bloqueadas", "  /repos/plano", "  Sin tarea en curso"]);
  });

  test("repo ajeno sin datos: «—» en los conteos, operador y tarea", () => {
    const lines = cardLines(rows, 60);
    expect(lines.slice(8, 11)).toEqual(["  ajeno · — libres · — bloqueadas", "  /repos/ajeno", "  —"]);
  });

  test("el elegido lleva «›» y solo él", () => {
    const lines = cardLines(longRows, 60);
    expect(lines.filter((l) => l.startsWith("›"))).toHaveLength(1);
    expect(lines[0].startsWith("› ")).toBe(true);
    const other = cardLines(longRows, 60, { selected: "/repos/plano" });
    expect(other[0].startsWith("  ")).toBe(true);
    expect(other[4].startsWith("› plano")).toBe(true);
  });

  test("si la línea del nombre no cabe se recorta el nombre por el final y se conservan los conteos", () => {
    for (const width of [60, 50, 40]) {
      const [first] = cardLines(longRows, width);
      expect(first).toMatch(/^› un-n.*… · 3 libres · 3 bloqueadas$/);
      expect(visibleLength(first)).toBeLessThanOrEqual(width - 4);
    }
    // Si cabe, va entero y sin «…».
    expect(cardLines(longRows, 80)[0]).toBe(`› ${longName} · 3 libres · 3 bloqueadas`);
  });

  test("la ruta se recorta por el principio y deja el final", () => {
    for (const width of [60, 50, 40]) {
      const second = cardLines(longRows, width)[1];
      expect(second).toMatch(/^ {2}….*no-entra$/);
      expect(visibleLength(second)).toBe(width - 4);
    }
    expect(cardLines(longRows, 80)[1]).toMatch(/^ {2}….*no-entra$/);
  });

  test("la tercera línea recorta por el final y el repo ilegible muestra su aviso", () => {
    const lines = cardLines(longRows, 40);
    expect(lines[2]).toBe("  gersom · T-12: Implementar el par…");
    // El ilegible: solo el nombre, la ruta y el aviso (recortado al ancho).
    expect(lines.slice(12, 15)).toEqual(["  roto",expect.stringMatching(/^ {2}….*-roto$/), "  ! No existe la carpeta: /repos/ro…"]);
    expect(cardLines(longRows, 80)[14]).toBe("  ! No existe la carpeta: /repos/roto");
    const narrow = cardLines([{ ...longRows[3], warning: "un aviso muy largo que no cabe en una pantalla angosta" }], 40);
    expect(narrow[2]).toMatch(/^ {2}! un aviso.*…$/);
    expect(visibleLength(narrow[2])).toBe(36);
  });

  test("debajo de las tarjetas siguen la ruta que se escribe y la confirmación de quitar", () => {
    const out = renderProjects(longRows, { ...longMeta, width: 60, input: "/repos/nuevo" });
    expect(out).toContain("Ruta del repo: /repos/nuevo█");
    const confirm = renderProjects(longRows, { ...longMeta, width: 80, confirmRemove: { name: "demo", path: "/repos/demo" } });
    expect(confirm).toContain("¿Quitar demo (/repos/demo) de la lista?");
  });

  test("el borde derecho queda alineado en cada fila de tarjetas", () => {
    for (const width of [80, 60, 40]) {
      const box = renderProjects(longRows, { ...longMeta, width }).split("\n").filter((l) => l.startsWith("│"));
      for (const line of box) expect(visibleLength(line)).toBe(width);
    }
  });
});

describe("renderProjects recortado al alto de la terminal", () => {
  const many: ProjectRow[] = Array.from({ length: 12 }, (_, i) => ({
    name: `repo${String(i).padStart(2, "0")}`,
    path: `/repos/repo${String(i).padStart(2, "0")}`,
    operator: "ana",
    work: { current: null, counts: { free: i, blocked: 0 } },
    warning: null,
  }));
  const keys = { ...meta, controls: "keys" as const, multiView: "projects" as const };
  const footer = "[↑/↓] elegir - [Enter] abrir - [a] agregar repo - [x] quitar - [r] releer - [o] observar - [Ctrl+C o q] salir";
  const at = (i: number, extra: Partial<ProjectsRenderMeta> = {}) => renderProjects(many, { ...keys, selected: many[i].path, ...extra });

  test("sin `rows` no cambia nada, y con `rows` de sobra tampoco", () => {
    for (const width of [140, 60]) {
      const full = at(5, { width });
      expect(at(5, { width, rows: 500 })).toBe(full);
      expect(full).not.toContain("más");
    }
  });

  for (const [mode, width] of [["tabla", 140], ["tarjetas", 60]] as const) {
    describe(`en ${mode}`, () => {
      const rows = 14;

      test("para cada fila elegida: a lo sumo rows - 1 líneas, la fila elegida entera a la vista y el pie", () => {
        for (let i = 0; i < many.length; i++) {
          const out = at(i, { width, rows });
          const lines = out.split("\n");
          expect(lines.length - 1).toBeLessThanOrEqual(rows - 1);
          expect(out).toContain(`› ${many[i].name}`);
          if (mode === "tarjetas") {
            // Las tres líneas de la tarjeta: nombre, ruta y operador.
            const idx = lines.findIndex((l) => l.includes(`› ${many[i].name}`));
            expect(lines[idx + 1]).toContain(many[i].path);
            expect(lines[idx + 2]).toContain("ana");
          }
          expect(out).toContain(width === 140 ? footer : "[Ctrl+C o q] salir");
        }
      });

      test("indicadores: solo abajo con el primero, arriba y abajo en medio, solo arriba con el último", () => {
        expect(at(0, { width, rows })).not.toMatch(/↑ \d+ más/);
        expect(at(0, { width, rows })).toMatch(/↓ \d+ más/);
        expect(at(6, { width, rows })).toMatch(/↑ \d+ más/);
        expect(at(6, { width, rows })).toMatch(/↓ \d+ más/);
        expect(at(11, { width, rows })).toMatch(/↑ \d+ más/);
        expect(at(11, { width, rows })).not.toMatch(/↓ \d+ más/);
      });

      test("ninguna línea supera el ancho", () => {
        for (const line of at(6, { width, rows }).split("\n")) expect(visibleLength(line)).toBeLessThanOrEqual(width);
      });
    });
  }

  test("con entrada de ruta y confirmación al fondo, el pie de ese paso sigue a la vista", () => {
    const out = at(11, { width: 140, rows: 14, input: "/repos/nuevo" });
    expect(out).toContain("[Enter] agregar - [Esc] cancelar - [Ctrl+C] salir");
    expect(out).toContain("› repo11");
  });

  test("los indicadores van en el gris secundario", () => {
    expect(at(6, { width: 60, rows: 14, color: true })).toMatch(/\x1b\[38;5;250m↑ \d+ más\x1b\[39m/);
  });

  test("lista vacía o sin selección con `rows`: no falla y arranca desde arriba", () => {
    expect(renderProjects([], { ...keys, rows: 6 })).toContain("[Ctrl+C o q] salir");
    const out = renderProjects(many, { ...keys, selected: null, rows: 14 });
    expect(out).toContain("▣ PROYECTOS");
    expect(out).toMatch(/↓ \d+ más/);
    expect(out).not.toMatch(/↑ \d+ más/);
  });
});

describe("truncateStart", () => {
  test("deja el final con «…» delante y respeta el ancho", () => {
    expect(truncateStart("/repos/abc/final", 10)).toBe("…abc/final");
    expect(truncateStart("/repos/abc/final", 16)).toBe("/repos/abc/final");
    expect(truncateStart("/repos/abc/final", 1)).toBe("…");
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

  test("el panel plano ofrece solo [p] proyectos, sin [e] equipo", () => {
    expect(render(model, repo)).toContain("[p] proyectos - [c] compactar");
    expect(render(model, repo)).not.toContain("volver");
    expect(render(model, repo)).not.toContain("[e]");
  });

  test("la vista de equipo: solo [p] proyectos, sin volver ni [e] ni [c]", () => {
    const team = { rows: [], teamBacklog: { present: false as const, free: [], blocked: [], warnings: [] }, warnings: [] };
    const out = renderTeam(team, { ...repo, multiView: "team", selected: null, preferred: null });
    expect(out).toContain("[↑/↓] elegir - [Enter] abrir - [p] proyectos - [r] redibujar - [o] observar - [Ctrl+C o q] salir");
    expect(out).not.toContain("volver");
    expect(out).not.toContain("[e]");
    expect(out).not.toContain("[c]");
    expect(out).not.toContain("[f]");
  });

  test("todas las vistas de un repo ofrecen [p] proyectos; la lista no", () => {
    expect(render(model, repo)).toContain("[p] proyectos");
    expect(render(model, { ...repo, multiView: "operator" })).toContain("[p] proyectos");
  });

  test("en el panel de un operador `e` lleva al equipo y `p` a la lista", () => {
    const out = render(model, { ...repo, multiView: "operator" });
    expect(out).toContain("[e] equipo - [p] proyectos");
    expect(out).not.toContain("volver");
  });
});
