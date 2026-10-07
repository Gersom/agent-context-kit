import { describe, expect, test } from "bun:test";
import { buildModel } from "../../src/model/model.ts";
import type { RenderMeta } from "../../src/shared/types.ts";
import { visibleLength } from "../../src/ui/format.ts";
import { arrowText, dependencyText, render, screenWidth, triggerText } from "../../src/ui/render.ts";
import { fixture } from "../../../_shared/test/helpers.ts";

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
/** Líneas que pertenecen a un recuadro (bordes y contenido). */
const boxLines = (out: string) => out.split("\n").filter((l) => /^(\x1b\[[0-9;]*m)*[╭│╰]/.test(l));
/** Fila de un recuadro que contiene `text`, sin los bordes ni el relleno. */
const rowWith = (out: string, text: string) => {
  const row = out.split("\n").find((l) => l.startsWith("│") && l.includes(text));
  if (!row) throw new Error(`no se encontró una fila con "${text}"`);
  return row.slice(2, -2).trimEnd();
};

describe("render", () => {
  test("encabezado: nombre del repo en mayúsculas, ruta del repo y última actualización", () => {
    const lines = screen("es-anchors").split("\n");
    expect(lines.slice(0, 3)).toEqual([
      "▣ DEMO APP",
      "  /proyectos/demo-app",
      "  Última actualización 14:30:00 · al iniciar",
    ]);
  });

  test("encabezado en modo multi-operador: agrega el operador al título, donde la ruta larga no lo recorta", () => {
    const lines = screen("es-anchors", { operator: "ana" }).split("\n");
    expect(lines.slice(0, 2)).toEqual(["▣ DEMO APP · ana", "  /proyectos/demo-app"]);
  });

  test("un recuadro por tipo, en el orden del flujo de una tarea, con el título a la izquierda y el archivo a la derecha", () => {
    const out = screen("es-anchors");
    expect(out).not.toMatch(/\x1b\[/);
    expect(out).not.toContain("━━");
    const tops = out.split("\n").filter((l) => l.startsWith("╭"));
    expect(tops.map((l) => l.match(/^╭─ (.+?) ─+ (\S+\.md) ─╮$/)?.slice(1))).toEqual([
      ["LIBRES (4)", "backlog.md"],
      ["BLOQUEADAS (2)", "backlog.md"],
      ["EN PROGRESO", "handoff.md"],
      ["PAUSADAS (1)", "handoff.md"],
      ["TAREAS COMPLETADAS (últimas 5)", "history.md"],
    ]);
    expect(out.split("\n").filter((l) => l.startsWith("╰"))).toHaveLength(5);
  });

  test("una línea de flecha con el nombre de la transición entre cada par de recuadros", () => {
    const arrows = screen("es-anchors")
      .split("\n")
      .filter((l) => /^ {3}[↑↓]/.test(l))
      .map((l) => l.trim());
    expect(arrows).toEqual(["↓ bloquea · ↑ desbloquea", "↓ empieza (desde libres)", "↑ retoma · ↓ pausa", "↓ se cierra"]);
  });

  test("arrowText: la transición entre cada par de etapas y «↓» si no hay una conocida", () => {
    expect(arrowText("unowned", "free")).toBe("↓ se toma");
    expect(arrowText("unowned", "current")).toBe("↓ se toma");
    expect(arrowText("free", "blocked")).toBe("↓ bloquea · ↑ desbloquea");
    expect(arrowText("free", "current")).toBe("↓ empieza");
    expect(arrowText("blocked", "current")).toBe("↓ empieza (desde libres)");
    expect(arrowText("current", "paused")).toBe("↑ retoma · ↓ pausa");
    expect(arrowText("current", "completed")).toBe("↓ se cierra");
    expect(arrowText("paused", "completed")).toBe("↓ se cierra");
    expect(arrowText("free", "completed")).toBe("↓");
  });

  test("las flechas solo van entre recuadros que se muestran", () => {
    // Sin pausadas ni bloqueadas ni historial: solo LIBRES → EN PROGRESO.
    const model = buildModel({ handoffText: "# H\n", backlogText: fixture("es-anchors", "backlog.md"), historyText: null });
    const out = render({ ...model, blocked: [], paused: [], counts: { ...model.counts, blocked: 0, paused: 0 } }, meta);
    expect(out.split("\n").filter((l) => /^ {3}[↑↓]/.test(l)).map((l) => l.trim())).toEqual(["↓ empieza"]);
    // Set mínimo (solo handoff.md): un único recuadro, sin flechas.
    expect(screen("minimal")).not.toMatch(/\n {3}[↑↓]/);
  });

  test("todos los recuadros tienen el ancho de la pantalla, con y sin color", () => {
    for (const color of [false, true]) {
      for (const width of [40, 70, 120]) {
        const lines = boxLines(screen("es-anchors", { color, width }));
        expect(lines.length).toBeGreaterThan(10);
        for (const line of lines) expect(visibleLength(line)).toBe(width);
      }
    }
  });

  test("ninguna línea supera el ancho de la pantalla", () => {
    const out = screen("es-anchors", { width: 40 });
    for (const line of out.split("\n")) expect(visibleLength(line)).toBeLessThanOrEqual(40);
  });

  test("un título largo se recorta y el archivo se conserva", () => {
    const top = screen("es-anchors", { width: 40 }).split("\n").find((l) => l.includes("TAREAS COMPLETADAS") || l.includes("TAREAS COMPLE"));
    if (!top) throw new Error("no se encontró el borde de completadas");
    expect(top).toMatch(/^╭─ TAREAS .*… ─+ history\.md ─╮$/);
    expect(visibleLength(top)).toBe(40);
  });

  test("una fila larga se recorta con … sin romper el borde", () => {
    const row = screen("es-anchors", { width: 40 }).split("\n").find((l) => l.includes("T-11:"));
    if (!row) throw new Error("no se encontró la fila de T-11");
    expect(row.endsWith(" │")).toBe(true);
    expect(visibleLength(row)).toBe(40);
  });

  test("completadas: las últimas 5, compactas, sin tachar, con la descartada marcada y la fecha", () => {
    const out = screen("es-anchors");
    expect(rowWith(out, "T-11:")).toBe("T-11: Escribir el parser de secciones · 2026-10-05");
    expect(rowWith(out, "T-10:")).toBe("T-10: Usar YAML para las tareas ✖ (descartada) · 2026-10-04");
    expect(rowWith(out, "Qué es este proyecto")).toBe('Agregar la sección "Qué es este proyecto" · 2026-10-03');
    expect(out).not.toContain("Sexta entrada");
    const colored = screen("es-anchors", { color: true });
    // Con color, el prefijo `T-11` va pintado aparte del resto del nombre.
    const line = colored.split("\n").find((l) => l.includes("T-11"));
    expect(line).toBeDefined();
    expect(line).not.toContain("\x1b[9m");
  });

  test("pasos hechos tachados (solo el texto) en la tarea en progreso y en las pausadas", () => {
    const out = screen("es-anchors", { color: true });
    for (const step of ["Paso 1 — Preparar fixtures", "Paso 2 — Escribir el parser", "Paso 1 — Copiar el contenido viejo"]) {
      const line = out.split("\n").find((l) => l.includes(step));
      if (!line) throw new Error(`no se encontró el paso "${step}"`);
      expect(line).toContain(`\x1b[9m${step}\x1b[29m`);
      expect(line.slice(0, line.indexOf("\x1b[9m"))).toContain("✔");
    }
    for (const step of ["Paso 3 — Escribir el modelo", "Paso 2 — Revisar los links"]) {
      const line = out.split("\n").find((l) => l.includes(step));
      expect(line).not.toContain("\x1b[9m");
    }
    expect(screen("es-anchors")).not.toContain("\x1b[9m");
  });

  test("handoff en detalle: plan, subsecciones (sin la del plan) y pausadas con su plan y campos", () => {
    const out = screen("es-anchors");
    expect(rowWith(out, "Tarea 12")).toBe("Tarea 12 — Implementar el parser de anclas");
    expect(rowWith(out, "2/5")).toBe("Plan [█████░░░░░░░] 2/5");
    expect(rowWith(out, "Paso 3 — Escribir")).toBe("  ▸ Paso 3 — Escribir el modelo");
    expect(rowWith(out, "Qué falta: Pasos")).toBe("Qué falta: Pasos 3 y 4.");
    expect(rowWith(out, "Segunda línea")).toBe("  Segunda línea del próximo paso.");
    expect(out).not.toContain("Modo de ejecución");
    expect(rowWith(out, "Tarea 8")).toBe("• Tarea 8 — Migrar la documentación vieja");
    expect(rowWith(out, "1/3")).toBe("    Plan [████░░░░░░░░] 1/3");
    expect(rowWith(out, "Copiar el contenido")).toBe("      ✔ Paso 1 — Copiar el contenido viejo");
    expect(rowWith(out, "Revisar los links")).toBe("      ▸ Paso 2 — Revisar los links");
    expect(rowWith(out, "Por qué se pausó")).toBe("    Por qué se pausó: surgió una prioridad mayor.");
    expect(out).not.toContain("Plan: ");
  });

  test("backlog compacto con T-N, grupos y dependencias de las bloqueadas", () => {
    const out = screen("es-anchors");
    expect(rowWith(out, "T-1:")).toBe("T-1: Probar el flujo completo");
    expect(rowWith(out, "Grupo:")).toBe("◇ Grupo: Documentar los planes (T-14, T-15)");
    expect(rowWith(out, "T-14: Redactar")).toBe("  · T-14: Redactar costs.md");
    expect(rowWith(out, "T-4: Deploy")).toBe("T-4: Deploy en skills.sh [dependencia]");
    expect(rowWith(out, "espera T-3")).toBe("     → espera T-3: Exportar como skill");
    expect(rowWith(out, "T-5:")).toBe("T-5: Rehacer el README [postergada]");
    expect(rowWith(out, "espera T-4")).toBe("     → espera T-4: Deploy en skills.sh");
    expect(out).not.toContain("Tarea 4 —");
  });

  test("pausadas y bloqueadas no aparecen cuando no hay ninguna", () => {
    const backlogText = "<!-- agent-context-kit:section=free -->\n## Tareas libres\n\n### Tarea 1 — Algo libre\n\n- **Descripción:** x\n";
    const out = render(buildModel({ handoffText: fixture("minimal", "handoff.md"), backlogText }), meta);
    expect(out).toContain("╭─ LIBRES (1)");
    expect(out).not.toContain("PAUSADAS");
    expect(out).not.toContain("BLOQUEADAS");
    // Con tareas pausadas y bloqueadas sí aparecen.
    const full = screen("es-anchors");
    expect(full).toContain("╭─ PAUSADAS");
    expect(full).toContain("╭─ BLOQUEADAS");
  });

  test("estados vacíos y set mínimo (sin backlog ni history)", () => {
    const out = screen("minimal", { trigger: { kind: "change", file: "handoff.md" } });
    expect(rowWith(out, "Sin tarea")).toBe("Sin tarea en curso");
    expect(out).not.toContain("PAUSADAS");
    expect(out).not.toContain("LIBRES");
    expect(out).not.toContain("history.md");
    expect(out).toContain("Sin backlog.md");
    expect(out).toContain("· se modificó handoff.md");
    expect(out.split("\n").filter((l) => l.startsWith("╭"))).toHaveLength(1);
  });

  test("pie según los controles disponibles", () => {
    expect(screen("minimal", { controls: "keys" })).toContain("[c] compactar - [f] ocultar flechas - [r] redibujar - [Ctrl+C o q] salir");
    expect(screen("minimal", { controls: "keys", compact: true, arrows: false })).toContain("[c] expandir - [f] mostrar flechas - [r] redibujar - [Ctrl+C o q] salir");
    expect(screen("minimal")).toContain("[Ctrl+C] salir");
    expect(screen("minimal", { controls: "none" })).not.toContain("Ctrl+C");
  });

  test("el pie se parte en más líneas si no entra, y «salir» nunca se recorta", () => {
    const full = "[Esc o b] volver al equipo - [c] compactar - [f] ocultar flechas - [r] redibujar - [Ctrl+C o q] salir";
    expect(screen("minimal", { controls: "keys", multiView: "operator", width: 120 })).toContain(full);
    const narrow = screen("minimal", { controls: "keys", multiView: "operator", width: 60 }).split("\n");
    const at = narrow.findIndex((l) => l.startsWith("[Esc o b]"));
    const footer = narrow.slice(at).filter(Boolean);
    expect(footer.length).toBeGreaterThan(1);
    for (const line of footer) expect(visibleLength(line)).toBeLessThanOrEqual(60);
    expect(footer.join(" - ").replace(/ - - /g, " - ")).toContain("[Ctrl+C o q] salir");
    expect(footer.join(" ")).not.toContain("…");
  });

  test("colores: bordes en gris salvo en progreso, completadas (nombre y fecha) en su gris, título verde, secundarios en gris claro", () => {
    const out = screen("es-anchors", { color: true });
    const tops = out.split("\n").filter((l) => l.includes("╭─"));
    const top = (title: string) => {
      const line = tops.find((l) => l.includes(title));
      if (!line) throw new Error(`no se encontró el recuadro "${title}"`);
      return line;
    };
    for (const title of ["TAREAS COMPLETADAS", "PAUSADAS", "LIBRES", "BLOQUEADAS"]) {
      expect(top(title).startsWith("\x1b[90m╭─ ")).toBe(true);
    }
    expect(top("EN PROGRESO").startsWith("\x1b[32m╭─ ")).toBe(true);
    expect(top("TAREAS COMPLETADAS")).toContain("\x1b[38;2;109;176;123mTAREAS COMPLETADAS");
    // Completadas: el nombre y la fecha en el mismo gris.
    // El prefijo T-N en el verde del título; el resto del nombre en el gris de las completadas.
    expect(out).toMatch(/\x1b\[38;2;109;176;123mT-\d+\x1b\[39m\x1b\[38;5;245m: /);
    expect(out).toMatch(/\x1b\[38;5;245m · \d{4}-\d{2}-\d{2}/);
    // Textos secundarios (archivo del borde) en el gris claro.
    expect(top("EN PROGRESO")).toContain("\x1b[38;5;250mhandoff.md");
    expect(out).not.toContain("\x1b[2m");
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

  test("screenWidth: pedido, mínimo 40 y COLUMNS si no hay terminal", () => {
    expect(screenWidth(120)).toBe(120);
    expect(screenWidth(10)).toBe(40);
    if (process.stdout.columns == null) {
      const saved = process.env.COLUMNS;
      try {
        process.env.COLUMNS = "77";
        expect(screenWidth()).toBe(77);
        delete process.env.COLUMNS;
        expect(screenWidth()).toBe(100);
      } finally {
        if (saved === undefined) delete process.env.COLUMNS;
        else process.env.COLUMNS = saved;
      }
    }
  });
});
