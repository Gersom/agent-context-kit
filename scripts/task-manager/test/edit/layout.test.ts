import { describe, expect, test } from "bun:test";
import { normalizeEol } from "../../../_shared/parse/positions.ts";
import { parseBacklog } from "../../../_shared/parse/backlog.ts";
import { parseHandoff } from "../../../_shared/parse/handoff.ts";
import type { Range } from "../../../_shared/types.ts";
import { applyEdits, type Edit } from "../../src/edit/edits.ts";
import { blockSeparator, contentBounds, insertBlock, removeBlock } from "../../src/edit/layout.ts";
import { trimRange } from "../../src/query/lines.ts";

/** Aplica una edición sobre un texto LF. */
function apply(text: string, edit: Edit): string {
  return applyEdits(text, normalizeEol(text), [edit]);
}

const NEW = "### Tarea 9 — Nueva\n\n- **Descripción:** x";

describe("contentBounds", () => {
  test("desde el primer hasta el último carácter que no es blanco", () => {
    const text = "ab\n\n  hola  \n\ncd";
    expect(contentBounds(text, { start: 2, end: 13 })).toEqual({ start: 6, end: 10 });
  });

  test("todo blanco: null", () => {
    expect(contentBounds("a\n\n  \nb", { start: 1, end: 5 })).toBeNull();
  });
});

describe("blockSeparator", () => {
  const text = "## L\n\n### Tarea 1 — a\n\n- x\n\n\n### Tarea 2 — b\n\n- y\n\n<!-- ancla -->\n";
  const rangesOf = (t: string) => parseBacklog(t).free.tasks.map((task) => task.range as Range);

  test("conserva lo que ya hay entre los dos últimos bloques (aunque sean dos líneas en blanco)", () => {
    expect(blockSeparator(text, rangesOf(text))).toBe("\n\n\n");
  });

  test("con un solo bloque o sin ninguno: una línea en blanco", () => {
    expect(blockSeparator(text, [rangesOf(text)[0]])).toBe("\n\n");
    expect(blockSeparator(text, [])).toBe("\n\n");
  });

  test("si entre los bloques hay otra cosa (un comentario), una línea en blanco", () => {
    const withComment = "## L\n\n### Tarea 1 — a\n\n- x\n\n<!-- nota -->\n### Tarea 2 — b\n\n- y\n";
    expect(blockSeparator(withComment, rangesOf(withComment))).toBe("\n\n");
  });
});

describe("insertBlock", () => {
  const section = (id: string, body: string) => `<!-- agent-context-kit:section=${id} -->\n## Sección\n${body}`;

  function bodyOf(text: string): Range {
    return parseBacklog(text).sections.free.bodyRange;
  }

  test("al final de las tareas, con una línea en blanco de separación y antes de la sección siguiente", () => {
    const text = `# B\n\n${section("free", "\n### Tarea 1 — a\n\n- x\n")}\n<!-- agent-context-kit:section=blocked -->\n## Otra\n`;
    const edit = insertBlock(text, bodyOf(text), NEW, { hasBlocks: true });
    expect(apply(text, edit)).toBe(
      `# B\n\n${section("free", "\n### Tarea 1 — a\n\n- x\n\n" + NEW + "\n")}\n<!-- agent-context-kit:section=blocked -->\n## Otra\n`,
    );
  });

  test("al final del archivo, con y sin salto de línea final", () => {
    const withNewline = `${section("free", "\n### Tarea 1 — a\n\n- x\n")}`;
    expect(apply(withNewline, insertBlock(withNewline, bodyOf(withNewline), NEW, { hasBlocks: true }))).toBe(
      `${section("free", "\n### Tarea 1 — a\n\n- x\n\n" + NEW + "\n")}`,
    );
    const without = withNewline.replace(/\n$/, "");
    expect(apply(without, insertBlock(without, bodyOf(without), NEW, { hasBlocks: true }))).toBe(`${section("free", "\n### Tarea 1 — a\n\n- x\n\n" + NEW)}`);
  });

  test("usa el separador que se le pasa", () => {
    const text = section("free", "\n### Tarea 1 — a\n\n- x\n");
    expect(apply(text, insertBlock(text, bodyOf(text), NEW, { hasBlocks: true, separator: "\n\n\n" }))).toContain("- x\n\n\n### Tarea 9");
  });

  test("sin tareas: reemplaza «Ninguna.» dejando las líneas en blanco de alrededor", () => {
    const text = `${section("free", "\nNinguna.\n")}\n<!-- agent-context-kit:section=blocked -->\n## Otra\n`;
    expect(apply(text, insertBlock(text, bodyOf(text), NEW, { hasBlocks: false }))).toBe(
      `${section("free", "\n" + NEW + "\n")}\n<!-- agent-context-kit:section=blocked -->\n## Otra\n`,
    );
  });

  test("sin tareas: reemplaza el placeholder de la plantilla (varias líneas)", () => {
    const text = section("free", "\n### Tarea [N] — [Placeholder — título]\n\n- **Descripción:** [Placeholder]\n- **Bloqueos:** Ninguno.\n");
    expect(apply(text, insertBlock(text, bodyOf(text), NEW, { hasBlocks: false }))).toBe(section("free", "\n" + NEW + "\n"));
  });

  test("sin tareas: conserva los comentarios del principio", () => {
    const text = section("free", "\n<!-- instrucciones -->\n\n[Placeholder — «Ninguna» si no hay]\n");
    expect(apply(text, insertBlock(text, bodyOf(text), NEW, { hasBlocks: false }))).toBe(
      section("free", "\n<!-- instrucciones -->\n\n" + NEW + "\n"),
    );
  });

  test("sin tareas y solo con comentarios: agrega después del último", () => {
    const text = section("free", "\n<!-- instrucciones -->\n");
    expect(apply(text, insertBlock(text, bodyOf(text), NEW, { hasBlocks: false }))).toBe(section("free", "\n<!-- instrucciones -->\n\n" + NEW + "\n"));
  });

  test("cuerpo en blanco: una línea en blanco a cada lado, con ancla siguiente o al final", () => {
    const next = "<!-- agent-context-kit:section=blocked -->\n## Otra\n";
    const text = `${section("free", "")}${next}`;
    expect(apply(text, insertBlock(text, bodyOf(text), NEW, { hasBlocks: false }))).toBe(`${section("free", "\n" + NEW + "\n")}\n${next}`);
    const last = section("free", "\n");
    expect(apply(last, insertBlock(last, bodyOf(last), NEW, { hasBlocks: false }))).toBe(section("free", "\n" + NEW + "\n"));
  });

  test("handoff: reemplaza «Sin tarea en curso» sin tocar el ancla ni las pausadas", () => {
    const text = "<!-- agent-context-kit:section=in-progress -->\n## Tarea en progreso\n\nSin tarea en curso\n\n<!-- agent-context-kit:section=paused -->\n## Tareas pausadas\n\nNinguna.\n";
    const body = parseHandoff(text).sections["in-progress"].bodyRange;
    expect(apply(text, insertBlock(text, body, "Tarea 1 — x", { hasBlocks: false }))).toBe(text.replace("Sin tarea en curso", "Tarea 1 — x"));
  });
});

describe("removeBlock", () => {
  const rangeOf = (text: string, n: number): Range => {
    const task = parseBacklog(text).free.tasks.find((t) => t.number === n)!;
    return trimRange(text, task.range!);
  };
  const text = "<!-- agent-context-kit:section=free -->\n## L\n\n### Tarea 1 — a\n\n- x\n\n### Tarea 2 — b\n\n- y\n\n### Tarea 3 — c\n\n- z\n\n<!-- agent-context-kit:section=blocked -->\n## B\n";

  test("el del medio: no deja huecos ni líneas en blanco dobles", () => {
    expect(apply(text, removeBlock(text, rangeOf(text, 2), "Ninguna.", true))).toBe(text.replace("### Tarea 2 — b\n\n- y\n\n", ""));
  });

  test("el primero y el último de la sección", () => {
    expect(apply(text, removeBlock(text, rangeOf(text, 1), "Ninguna.", true))).toBe(text.replace("### Tarea 1 — a\n\n- x\n\n", ""));
    expect(apply(text, removeBlock(text, rangeOf(text, 3), "Ninguna.", true))).toBe(text.replace("### Tarea 3 — c\n\n- z\n\n", ""));
  });

  test("el único: la sección queda con el texto de vacío", () => {
    const single = "<!-- agent-context-kit:section=free -->\n## L\n\n### Tarea 1 — a\n\n- x\n\n<!-- agent-context-kit:section=blocked -->\n## B\n";
    expect(apply(single, removeBlock(single, rangeOf(single, 1), "Ninguna.", false))).toBe("<!-- agent-context-kit:section=free -->\n## L\n\nNinguna.\n\n<!-- agent-context-kit:section=blocked -->\n## B\n");
  });

  test("lo último del archivo: quita también la separación previa y conserva el final de línea", () => {
    const tail = "## L\n\n### Tarea 1 — a\n\n- x\n\n### Tarea 2 — b\n\n- y\n";
    expect(apply(tail, removeBlock(tail, rangeOf(tail, 2), "Ninguna.", true))).toBe("## L\n\n### Tarea 1 — a\n\n- x\n");
    const noNewline = tail.replace(/\n$/, "");
    expect(apply(noNewline, removeBlock(noNewline, rangeOf(noNewline, 2), "Ninguna.", true))).toBe("## L\n\n### Tarea 1 — a\n\n- x");
  });
});
