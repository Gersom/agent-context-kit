import { describe, expect, test } from "bun:test";
import { blockInfo } from "../../tasks/block-info.ts";
import { normalizeEol } from "../../parse/positions.ts";
import { parseTeamBacklog } from "../../parse/team-backlog.ts";
import { lineNumbersMatch, sliceRange } from "../helpers.ts";

const DOC = `# Backlog del equipo

Reglas de ejemplo.

---

<!-- agent-context-kit:section=free -->
## Tareas libres

### Revisar el copy del onboarding

- **Descripción:** Ajustar los textos.
- **Bloqueos:** Ninguno.
- **Agregada:** 2026-10-06 por ana

<!-- agent-context-kit:section=blocked -->
## Tareas bloqueadas / pospuestas

### Integrar la pasarela de pago

- **Descripción:** Conectar Stripe.
- **Bloqueos:** \`[dependencia]\` espera la cuenta del cliente.
- **Agregada:** 2026-10-05 por luis
`;

describe("parseTeamBacklog", () => {
  test("tareas libres y bloqueadas por título, sin número, con sus campos", () => {
    const parsed = parseTeamBacklog(DOC);
    expect(parsed.free.map((t) => t.title)).toEqual(["Revisar el copy del onboarding"]);
    expect(parsed.blocked.map((t) => t.title)).toEqual(["Integrar la pasarela de pago"]);
    expect(parsed.free[0].fields.map((f) => f.label)).toEqual(["Descripción", "Bloqueos", "Agregada"]);
    expect(parsed).toMatchObject({ usedFallback: false, missing: [], placeholders: false });
  });

  test("el tag de bloqueo sale de blockInfo", () => {
    const [task] = parseTeamBacklog(DOC).blocked;
    expect(blockInfo(task)).toEqual({ tag: "dependencia", reason: "espera la cuenta del cliente." });
  });

  test("la plantilla vacía: tarea placeholder marcada y aviso de placeholders", () => {
    const text = `${DOC.split("<!-- agent-context-kit:section=free -->")[0]}<!-- agent-context-kit:section=free -->\n## Tareas libres\n\n### [Placeholder — título único de la tarea]\n\n- **Descripción:** [Placeholder]\n\n<!-- agent-context-kit:section=blocked -->\n## Tareas bloqueadas / pospuestas\n\n[Placeholder — "Ninguna" si no hay]\n`;
    const parsed = parseTeamBacklog(text);
    expect(parsed.free).toHaveLength(1);
    expect(parsed.free[0].isPlaceholder).toBe(true);
    expect(parsed.blocked).toEqual([]);
    expect(parsed.placeholders).toBe(true);
  });

  test("ignora comentarios HTML y headers dentro de bloques de código", () => {
    const text = `<!-- agent-context-kit:section=free -->\n## Tareas libres\n\n<!-- ### oculta -->\n### Real\n\n\`\`\`\n### de ejemplo\n\`\`\`\n\n<!-- agent-context-kit:section=blocked -->\n## Tareas bloqueadas\n`;
    expect(parseTeamBacklog(text).free.map((t) => t.title)).toEqual(["Real"]);
  });

  test("sin anclas usa el orden de las secciones (plan B)", () => {
    const text = DOC.replace(/<!-- agent-context-kit:section=\w+ -->\n/g, "");
    const parsed = parseTeamBacklog(text);
    expect(parsed.usedFallback).toBe(true);
    expect(parsed.free).toHaveLength(1);
    expect(parsed.blocked).toHaveLength(1);
  });

  test("documento vacío", () => {
    expect(parseTeamBacklog("")).toMatchObject({ free: [], blocked: [], missing: ["free", "blocked"] });
  });
});

describe("parseTeamBacklog: posiciones en el texto original", () => {
  const POS_DOC = [
    "# Backlog del equipo", // 1
    "", // 2
    "<!-- agent-context-kit:section=free -->", // 3
    "## Tareas libres", // 4
    "", // 5
    "<!--", // 6
    "### [Placeholder título] (ejemplo comentado)", // 7
    "-->", // 8
    "### Revisar el copy", // 9
    "", // 10
    "- **Descripción:** Ajustar textos.", // 11
    "  - con sublista", // 12
    "- **Agregada:** 2026-10-06 por ana", // 13
    "", // 14
    "```md", // 15
    "### Falso en un bloque de código", // 16
    "```", // 17
    "", // 18
    "### Otra tarea <!-- inline -->", // 19
    "", // 20
    "- **Bloqueos:** Ninguno.", // 21
    "", // 22
    "<!-- agent-context-kit:section=blocked -->", // 23
    "## Tareas bloqueadas", // 24
    "", // 25
    "### Integrar la pasarela", // 26
    "- **Bloqueos:** `[dependencia]` espera.", // 27
  ].join("\n");

  test("cada tarea abarca de su `### ` hasta antes de la siguiente, o hasta el fin de su sección", () => {
    const { free, blocked } = parseTeamBacklog(POS_DOC);
    expect(free.map((t) => t.title)).toEqual(["Revisar el copy", "Otra tarea"]);
    expect(sliceRange(POS_DOC, free[0].range!)).toBe(POS_DOC.split("\n").slice(8, 18).join("\n") + "\n");
    expect(free[0].range).toMatchObject({ startLine: 9, endLine: 18 });
    // La última de la sección no arrastra el ancla de la sección siguiente.
    expect(sliceRange(POS_DOC, free[1].range!)).toBe("### Otra tarea <!-- inline -->\n\n- **Bloqueos:** Ninguno.\n\n");
    expect(sliceRange(POS_DOC, blocked[0].range!)).toBe("### Integrar la pasarela\n- **Bloqueos:** `[dependencia]` espera.");
    expect(blocked[0].range!.end).toBe(POS_DOC.length);
    for (const t of [...free, ...blocked]) expect(lineNumbersMatch(POS_DOC, t.range!)).toBe(true);
  });

  test("campos: su línea y sus continuaciones", () => {
    const { free, blocked } = parseTeamBacklog(POS_DOC);
    expect(free[0].fields.map((f) => sliceRange(POS_DOC, f.range!))).toEqual([
      "- **Descripción:** Ajustar textos.\n  - con sublista\n",
      "- **Agregada:** 2026-10-06 por ana\n",
    ]);
    expect(free[0].fields[0].range).toMatchObject({ startLine: 11, endLine: 12 });
    expect(sliceRange(POS_DOC, blocked[0].fields[0].range!)).toBe("- **Bloqueos:** `[dependencia]` espera.");
  });

  test("secciones: anchor y cuerpo de cada una", () => {
    const { sections } = parseTeamBacklog(POS_DOC);
    expect(sliceRange(POS_DOC, sections.blocked.anchorRange!)).toBe("<!-- agent-context-kit:section=blocked -->");
    expect(sliceRange(POS_DOC, sections.free.headerRange)).toBe("## Tareas libres");
    expect(sections.free.bodyRange.end).toBe(sections.blocked.anchorRange!.start);
  });

  test("plan B (sin anclas): tareas ubicadas igual, secciones sin ancla", () => {
    const text = "## Libres\n\n### A\n- **X:** 1\n\n## Bloqueadas\n\n### B\n";
    const { free, blocked, sections, usedFallback } = parseTeamBacklog(text);
    expect(usedFallback).toBe(true);
    expect(sliceRange(text, free[0].range!)).toBe("### A\n- **X:** 1\n\n");
    expect(sliceRange(text, free[0].fields[0].range!)).toBe("- **X:** 1\n");
    expect(sliceRange(text, blocked[0].range!)).toBe("### B\n");
    expect(sections.free.anchorRange).toBeNull();
  });

  test("CRLF: mismas posiciones sobre el texto normalizado, traducibles al crudo", () => {
    const crlf = POS_DOC.replace(/\n/g, "\r\n");
    const info = normalizeEol(crlf);
    const parsed = parseTeamBacklog(info.text);
    expect(parsed).toEqual(parseTeamBacklog(POS_DOC));
    const [s, e] = info.rawSpan(parsed.free[0].fields[1].range!);
    expect(crlf.slice(s, e)).toBe("- **Agregada:** 2026-10-06 por ana\r\n");
  });

  test("archivo vacío", () => {
    const parsed = parseTeamBacklog("");
    expect(parsed).toMatchObject({ free: [], blocked: [], sections: {}, missing: ["free", "blocked"] });
  });
});
