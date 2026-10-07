import { describe, expect, test } from "bun:test";
import { buildModel } from "../../src/model/model.ts";
import type { TeamBacklogModel, TeamModel, TeamRenderMeta } from "../../src/shared/types.ts";
import { render, renderTeam } from "../../src/ui/render.ts";
import { fixture } from "../../../_shared/test/helpers.ts";

const meta: TeamRenderMeta = {
  projectName: "demo-app",
  projectDir: "/proyectos/demo-app",
  updatedAt: new Date(2026, 9, 6, 12, 0, 0),
  trigger: { kind: "start" },
  color: false,
  width: 100,
  selected: "gersom",
  preferred: "ana",
};

const teamBacklog: TeamBacklogModel = {
  present: true,
  free: [{ title: "Revisar el copy del onboarding", block: { tag: null, reason: null } }],
  blocked: [{ title: "Integrar la pasarela", block: { tag: "dependencia", reason: "espera la cuenta del cliente" } }],
  warnings: [],
};

const team: TeamModel = {
  rows: [
    {
      folder: "ana",
      folderless: false,
      missing: false,
      current: { label: "Tarea", number: 12, title: "Implementar el parser", done: 3, total: 5 },
      counts: { free: 2, blocked: 1 },
      lastCompleted: { date: "2026-10-04", status: "done", number: 5, label: "Tarea", title: "Escribir el README" },
    },
    { folder: "gersom", folderless: false, missing: false, current: null, counts: { free: 0, blocked: 0 }, lastCompleted: null },
    { folder: "luis", folderless: true, missing: false, current: null, counts: { free: 0, blocked: 0 }, lastCompleted: null },
    { folder: "mia", folderless: false, missing: true, current: null, counts: { free: 0, blocked: 0 }, lastCompleted: null },
  ],
  teamBacklog,
  warnings: ["[mia] handoff.md no existe (¿se está reescribiendo?)."],
};

describe("renderTeam", () => {
  const out = renderTeam(team, meta);
  const lines = out.split("\n");

  test("encabezado con «equipo» y recuadro EQUIPO con operators.md", () => {
    expect(lines[0]).toBe("▣ DEMO APP · equipo");
    expect(out).toMatch(/╭─ EQUIPO \(4\) ─+ operators\.md ─╮/);
  });

  test("una fila por operador: tarea en curso con su plan, sin tarea, solo team-backlog y sin handoff", () => {
    expect(out).toContain("  ana (tú)  Tarea 12 — Implementar el parser · plan 3/5");
    expect(out).toContain("› gersom    Sin tarea en curso");
    expect(out).toContain("  luis      (solo team-backlog)");
    expect(out).toContain("  mia       (sin handoff.md)");
  });

  test("el elegido lleva «›» y los operadores sin carpeta nunca", () => {
    expect(out).toContain("› gersom");
    expect(renderTeam(team, { ...meta, selected: "luis" })).not.toContain("› luis");
  });

  test("segunda línea con los conteos y la última tarea completada", () => {
    expect(out).toContain("libres 2 · bloqueadas 1 · último cierre: T-5: Escribir el README (2026-10-04)");
  });

  test("recuadro SIN DUEÑO con team-backlog.md: libres y bloqueadas con su tag y motivo", () => {
    expect(out).toMatch(/╭─ SIN DUEÑO \(2\) ─+ team-backlog\.md ─╮/);
    expect(out).toContain("• Revisar el copy del onboarding");
    expect(out).toContain("• Integrar la pasarela [dependencia]");
    expect(out).toContain("→ espera la cuenta del cliente");
  });

  test("avisos y pie con las teclas del selector", () => {
    expect(out).toContain("! [mia] handoff.md no existe (¿se está reescribiendo?).");
    expect(renderTeam(team, { ...meta, controls: "keys", multiView: "team" })).toContain("↑/↓ elegir · Enter abrir · c compactar · q o Ctrl+C salir · r redibujar");
    expect(renderTeam(team, { ...meta, controls: "none" })).not.toContain("↑/↓");
  });

  test("sin team-backlog.md no hay recuadro; sin operadores lo dice", () => {
    const bare = renderTeam({ rows: [], teamBacklog: { present: false, free: [], blocked: [], warnings: [] }, warnings: [] }, meta);
    expect(bare).not.toContain("SIN DUEÑO");
    expect(bare).toContain("Ningún operador registrado en operators.md");
  });

  test("SIN DUEÑO usa la paleta de las tareas completadas: título y viñeta en su verde, texto en su gris", () => {
    const colored = renderTeam(team, { ...meta, color: true });
    const box = colored.slice(colored.indexOf("SIN DUEÑO"));
    expect(colored).toContain("\x1b[38;2;109;176;123mSIN DUEÑO"); // verde #6DB07B del título de completadas
    expect(box).toContain("\x1b[38;2;109;176;123m• \x1b[39m");
    expect(box).toContain("\x1b[38;5;245mRevisar el copy del onboarding\x1b[39m"); // gris de las completadas
    expect(box).toContain("\x1b[31m [dependencia]"); // el tag de bloqueo sigue en rojo
    expect(box).not.toContain("\x1b[34m"); // ya no es azul
  });

  test("sin colores no hay códigos ANSI y todo cabe en el ancho", () => {
    expect(out).not.toMatch(/\x1b\[/);
    for (const line of lines) expect([...line].length).toBeLessThanOrEqual(100);
  });
});

describe("render del panel de un operador en modo multi", () => {
  const model = buildModel({
    handoffText: fixture("es-anchors", "handoff.md"),
    backlogText: fixture("es-anchors", "backlog.md"),
    historyText: fixture("es-anchors", "history.md"),
  });
  const panel = (extra: Partial<TeamRenderMeta> = {}) => render(model, { ...meta, operator: "ana", teamBacklog, multiView: "operator", ...extra });

  test("el recuadro SIN DUEÑO abre el flujo: va encima de BLOQUEADAS, con la flecha «se toma»", () => {
    const out = panel();
    expect(out.indexOf("╭─ BLOQUEADAS")).toBeGreaterThan(-1);
    expect(out.indexOf("╭─ SIN DUEÑO (2)")).toBeGreaterThan(-1);
    expect(out.indexOf("╭─ SIN DUEÑO (2)")).toBeLessThan(out.indexOf("╭─ BLOQUEADAS"));
    expect(out).toContain("   ↓ se toma");
    expect(out).toContain("▣ DEMO APP · ana");
  });

  test("sin team-backlog (modo plano) no aparece el recuadro", () => {
    expect(render(model, { ...meta, operator: undefined })).not.toContain("SIN DUEÑO");
    expect(panel({ teamBacklog: { ...teamBacklog, present: false } })).not.toContain("SIN DUEÑO");
  });

  test("pie del panel: cómo volver al equipo", () => {
    expect(panel({ controls: "keys" })).toContain("b o Esc volver al equipo · c compactar · f ocultar flechas · q o Ctrl+C salir · r redibujar");
  });

  test("los avisos del team-backlog salen con los del panel", () => {
    expect(panel({ teamBacklog: { ...teamBacklog, warnings: ["team-backlog.md tiene placeholders sin completar."] } })).toContain(
      "! team-backlog.md tiene placeholders sin completar.",
    );
  });

  test("tarea sin bloqueo vigente: sin tag ni motivo", () => {
    const out = panel({ teamBacklog: { ...teamBacklog, blocked: [{ title: "Suelta", block: { tag: null, reason: null } }] } });
    expect(out).toContain("• Suelta");
    expect(out).not.toContain("• Suelta [");
  });
});
