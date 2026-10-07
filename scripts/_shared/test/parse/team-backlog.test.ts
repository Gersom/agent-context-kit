import { describe, expect, test } from "bun:test";
import { blockInfo } from "../../tasks/block-info.ts";
import { parseTeamBacklog } from "../../parse/team-backlog.ts";

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
