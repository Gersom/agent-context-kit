import { describe, expect, test } from "bun:test";
import { blockInfo } from "../../tasks/block-info.ts";

describe("blockInfo", () => {
  const task = (value: string) => ({ fields: [{ label: "Bloqueos", value }] });

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
    expect(blockInfo(task("[el diseño](../x.md) `[dependencia]` x")).tag).toBeNull();
  });

  test("acepta el tag inicial con o sin backticks", () => {
    expect(blockInfo(task("[postergada] sin backticks")).tag).toBe("postergada");
    expect(blockInfo(task("  `[dependencia]` con espacios antes")).tag).toBe("dependencia");
  });

  test("solo cuenta el tag con el que empieza el campo, no uno en el medio", () => {
    expect(blockInfo(task("ver `[dependencia]` más abajo")).tag).toBeNull();
    const info = blockInfo({
      fields: [
        { label: "Descripción", value: "revisar el caso [algo] del diseño" },
        { label: "Bloqueos", value: "`[dependencia]` espera la Tarea 3." },
      ],
    });
    expect(info).toEqual({ tag: "dependencia", reason: "espera la Tarea 3." });
  });

  test("el recorte de una etiqueta final tipo 'Antes:' solo se aplica si hay historial", () => {
    expect(blockInfo(task("`[dependencia]` falta definir el formato, ver:")).reason).toBe("falta definir el formato, ver:");
    expect(blockInfo(task("`[dependencia]` espera X. Antes: `[Resuelto el 2026-10-05]` — era y")).reason).toBe("espera X.");
  });
});
