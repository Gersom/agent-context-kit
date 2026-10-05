import { describe, expect, test } from "bun:test";
import { blockInfo, buildModel } from "../src/model.js";
import { fixture } from "./helpers.js";

const load = (name) => buildModel({ handoffText: fixture(name, "handoff.md"), backlogText: fixture(name, "backlog.md") });

describe("buildModel", () => {
  test("tarea en curso con progreso del plan y próximo paso", () => {
    const { current } = load("es-anchors");
    expect(current.number).toBe(12);
    expect(current.plan).toMatchObject({ done: 2, total: 5 });
    expect(current.plan.currentStep.text).toBe("Paso 3 — Escribir el modelo");
    expect(current.nextStep).toBe("Paso 3 — escribir `model.js`.\nSegunda línea del próximo paso.");
  });

  test("libres con grupo enlazado a sus tareas agrupadas, y conteos", () => {
    const model = load("es-anchors");
    expect(model.free.groups[0].tasks.map((t) => t.title)).toEqual(["Redactar `costs.md`", "Redactar `limits.md`"]);
    expect(model.counts).toEqual({ paused: 1, free: 4, blocked: 2 });
  });

  test("bloqueadas con su tag, independiente de la etiqueta del campo", () => {
    const model = load("es-anchors");
    expect(model.blocked.map((t) => t.block.tag)).toEqual(["dependencia", "postergada"]);
    expect(model.blocked[0].block.reason).toBe("depende de la Tarea 3.");
    const en = load("en-no-anchors");
    expect(en.blocked[0].block.tag).toBe("dependency");
  });

  test("sin avisos cuando todo tiene anclas", () => {
    expect(load("es-anchors").warnings).toEqual([]);
  });

  test("avisa el plan B en ambos archivos", () => {
    const { warnings } = load("en-no-anchors");
    expect(warnings.some((w) => w.startsWith("handoff.md no tiene anclas"))).toBe(true);
    expect(warnings.some((w) => w.startsWith("backlog.md no tiene anclas"))).toBe(true);
  });

  test("set mínimo: sin backlog.md es una nota, no un error", () => {
    const model = load("minimal");
    expect(model.hasBacklog).toBe(false);
    expect(model.current).toBeNull();
    expect(model.warnings).toEqual([]);
    expect(model.notes).toHaveLength(1);
  });

  test("handoff ausente o vacío se avisa sin romper", () => {
    expect(buildModel({ handoffText: null, backlogText: null }).warnings[0]).toContain("no existe");
    expect(buildModel({ handoffText: "  \n", backlogText: null }).warnings[0]).toContain("vacío");
  });

  test("avisa una tarea en bloqueadas sin bloqueo vigente", () => {
    const backlog = [
      "<!-- agent-context-kit:section=free -->",
      "## Libres",
      "<!-- agent-context-kit:section=blocked -->",
      "## Bloqueadas",
      "",
      "### Tarea 8 — Ya desbloqueada",
      "",
      "- **Bloqueos:** `[Resuelto el 2026-10-05]` — era `[dependencia]` esperaba la Tarea 7.",
      "",
      "<!-- agent-context-kit:section=grouped -->",
      "## Agrupadas",
    ].join("\n");
    const model = buildModel({ handoffText: fixture("minimal", "handoff.md"), backlogText: backlog });
    expect(model.blocked[0].block.tag).toBeNull();
    expect(model.warnings).toEqual(['Tarea 8 está en "bloqueadas" sin bloqueo vigente: ¿moverla a libres? (Regla 7)']);
  });

  test("avisa placeholders sin completar", () => {
    const handoff =
      "<!-- agent-context-kit:section=in-progress -->\n## X\n\n**Tarea:** [Placeholder]\n\n<!-- agent-context-kit:section=paused -->\n## Y\n";
    expect(buildModel({ handoffText: handoff, backlogText: null }).warnings).toEqual(["handoff.md tiene placeholders sin completar."]);
  });
});

describe("blockInfo", () => {
  const task = (value) => ({ fields: [{ label: "Bloqueos", value }] });

  test("un campo que empieza con [Resuelto…] es historial: no devuelve el bloqueo viejo", () => {
    expect(blockInfo(task("`[Resuelto el 2026-01-01]` — era `[dependencia]` x"))).toEqual({ tag: null, reason: null });
    expect(blockInfo(task("[Resolved on 2026-01-01] — was [dependency] x")).tag).toBeNull();
  });

  test("bloqueo vigente primero e historial después: tag y motivo del vigente", () => {
    const info = blockInfo(task("`[dependencia]` espera la Tarea 14. Antes: `[Resuelto el 2026-10-05]` — era `[postergada]` x"));
    expect(info).toEqual({ tag: "dependencia", reason: "espera la Tarea 14." });
  });

  test("busca en cualquier campo y salta los que son historial", () => {
    const info = blockInfo({
      fields: [
        { label: "Bloqueos", value: "`[Resuelto el 2026-01-01]` — era `[dependencia]` x" },
        { label: "Notas", value: "`[postergada]` conviene esperar" },
      ],
    });
    expect(info.tag).toBe("postergada");
  });

  test("ignora placeholders y links markdown", () => {
    expect(blockInfo(task("[Placeholder — motivo]")).tag).toBeNull();
    expect(blockInfo(task("ver [el diseño](../x.md)")).tag).toBeNull();
    expect(blockInfo(task("ver [el diseño](../x.md) `[dependencia]` x")).tag).toBe("dependencia");
  });

  test("acepta el tag sin backticks", () => {
    expect(blockInfo(task("[postergada] sin backticks")).tag).toBe("postergada");
  });
});
