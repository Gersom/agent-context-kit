import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const bytes = (text: string) => Buffer.byteLength(text, "utf8");
const withoutComments = (text: string) => text.replace(/<!--[\s\S]*?-->/g, "");

describe("política de lectura: skill", () => {
  const skill = read("skill/SKILL.md");

  test("SKILL.md define la política y sus reglas clave", () => {
    expect(skill).toContain("## Política de lectura");
    expect(skill).toContain("wc -c");
    expect(skill).toContain("`cp`");
    expect(skill).toContain("AGENTS.md");
  });

  test("SKILL.md no repite el flujo diario que vive en el repo destino", () => {
    expect(skill).not.toContain("Actualizar `handoff.md`");
    expect(bytes(skill)).toBeLessThanOrEqual(4500);
  });

  test("los flujos remiten a la política de SKILL.md", () => {
    expect(read("skill/docs/questions-flow.md")).toContain("política de lectura");
    expect(read("skill/docs/migration-flow.md")).toContain("política de lectura");
  });
});

describe("política de lectura: migración", () => {
  const migration = read("skill/docs/migration-flow.md");

  test("la firma se lee solo con head", () => {
    expect(migration).toContain("head -n 3");
  });

  test("pregunta por docs-legacy y por condensar antes de tocar nada", () => {
    expect(migration).toContain("¿Querés conservar la documentación vieja en `docs-legacy/`?");
    expect(migration).toContain("¿Querés condensar el texto");
  });

  test("copia con comandos de archivo y verifica el respaldo en git si no se conserva", () => {
    expect(migration).toContain("cp -r");
    expect(migration).toContain("git status --porcelain");
  });
});

describe("política de lectura: AGENTS.md de este repo (modo multi-operador)", () => {
  test("coincide con la variante multi de la plantilla, sin su título", () => {
    const template = read("skill/template/multi/AGENTS.md");
    const block = template.slice(template.indexOf("<!-- agent-docs-skill:start -->"), template.indexOf("<!-- agent-docs-skill:end -->"));
    const body = block.split("\n").slice(2).join("\n").trim(); // sin el marcador ni el título de la sección
    expect(read("AGENTS.md")).toContain(body);
  });

  test("lee README, reglas, operadores y el handoff de su carpeta, en ese orden", () => {
    const text = read("AGENTS.md");
    const at = ["docs/README.md", "docs/agents/rules.md", "docs/agents/operators.md", "<tu-carpeta>/handoff.md"].map((s) => text.indexOf(s));
    expect(at.every((n) => n >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });
});

describe("política de lectura: AGENTS.md", () => {
  for (const file of ["skill/template/AGENTS.md"]) {
    test(`${file} lee README, reglas y handoff en ese orden`, () => {
      const text = withoutComments(read(file));
      const readme = text.indexOf("docs/README.md");
      const rules = text.indexOf("docs/agents/rules.md");
      const handoff = text.indexOf("docs/agents/handoff.md");
      expect(readme).toBeGreaterThanOrEqual(0);
      expect(rules).toBeGreaterThan(readme);
      expect(handoff).toBeGreaterThan(rules);
    });

    test(`${file} limita backlog/history, la sección de cierre y los archivos grandes`, () => {
      const text = read(file);
      expect(text).toContain("El resto, solo si la tarea lo exige.");
      expect(text).toContain("no leas `backlog.md` ni `history.md`");
      expect(text).toContain("«Al cerrar una tarea»");
      expect(text).toContain("`grep -n`");
    });

    test(`${file} es corto`, () => {
      expect(bytes(withoutComments(read(file)))).toBeLessThanOrEqual(1500);
    });
  }
});

describe("política de lectura: rules.md", () => {
  for (const file of ["skill/template/agents/rules.md", "docs/agents/rules.md"]) {
    test(`${file} deja las Reglas 5 a 8 en la sección final de cierre`, () => {
      const text = read(file);
      const closing = text.indexOf("## Al cerrar una tarea");
      expect(closing).toBeGreaterThan(0);
      for (const n of [1, 2, 3, 4]) {
        const at = text.indexOf(`\n${n}. **`);
        expect(at).toBeGreaterThan(0);
        expect(at).toBeLessThan(closing);
      }
      for (const n of [5, 6, 7, 8]) {
        expect(text.indexOf(`\n${n}. **`)).toBeGreaterThan(closing);
      }
      expect(text.slice(closing + 1)).not.toMatch(/\n## /);
    });
  }
});

describe("plantillas que se leen en cada sesión", () => {
  test("el README de docs/ es un mapa mínimo con la definición de operador", () => {
    const readme = read("skill/template/README.md");
    expect(readme).toContain("**Operador:**");
    expect(readme).toContain("1,5 KB");
    expect(bytes(withoutComments(readme))).toBeLessThanOrEqual(2600);
  });

  test("architecture.md conserva el árbol anotado", () => {
    expect(read("skill/template/project/architecture.md")).toContain("## Estructura");
  });
});
