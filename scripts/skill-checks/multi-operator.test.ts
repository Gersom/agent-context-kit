import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseOperators } from "../_shared/parse/operators.ts";

const ROOT = join(import.meta.dir, "..", "..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const bytes = (text: string) => Buffer.byteLength(text, "utf8");
const withoutComments = (text: string) => text.replace(/<!--[\s\S]*?-->/g, "");

const MULTI_TEMPLATES = ["AGENTS.md", "operators.md", "team-backlog.md", "preferences.md", "rules.md"];

describe("modo multi-operador: plantillas", () => {
  test("existen todas las plantillas de multi/", () => {
    for (const name of MULTI_TEMPLATES) expect(existsSync(join(ROOT, "skill/template/multi", name))).toBe(true);
  });

  test("multi/AGENTS.md lee README, reglas, operadores y handoff en ese orden, y es corto", () => {
    const text = withoutComments(read("skill/template/multi/AGENTS.md"));
    const at = ["docs/README.md", "docs/agents/rules.md", "docs/agents/operators.md", "<tu-carpeta>/handoff.md"].map((s) => text.indexOf(s));
    expect(at.every((n) => n >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(text).toContain("git config user.email");
    expect(text).toContain("nunca las edites");
    expect(text).toContain("team-backlog.md");
    expect(text).toContain("solo team-backlog");
    expect(text).toContain("`HEAD`");
    expect(bytes(text)).toBeLessThanOrEqual(2600);
  });

  test("operators.md: la plantilla se interpreta sin operadores y con el ancla de la lista", () => {
    const text = read("skill/template/multi/operators.md");
    expect(text).toContain("<!-- agent-context-kit:section=operators -->");
    expect(parseOperators(text)).toEqual({ operators: [], unreadable: [] });
    expect(bytes(withoutComments(text))).toBeLessThanOrEqual(700);
  });

  test("team-backlog.md: anclas libres/bloqueadas, sin contador, y reglas de tomar y devolver", () => {
    const text = read("skill/template/multi/team-backlog.md");
    expect(text).toContain("<!-- agent-context-kit:section=free -->");
    expect(text).toContain("<!-- agent-context-kit:section=blocked -->");
    expect(text).not.toContain("Próximo número");
    expect(text).toContain("Origen: team-backlog");
    expect(text).toContain("Devuelta por");
    expect(text).toContain("T-N@operador");
  });

  test("preferences.md no puede contradecir rules.md", () => {
    const text = read("skill/template/multi/preferences.md");
    expect(text).toContain("../rules.md");
    expect(text).toContain("gana `rules.md`");
  });

  test("el bloque de reglas no redefine las Reglas por defecto y se coloca antes de «Enlaces»", () => {
    const text = read("skill/template/multi/rules.md");
    expect(text).toContain("## Trabajo en paralelo (modo multi-operador)");
    expect(text).toContain("Reglas 2 a 8");
    expect(text).toContain("T-N@operador");
    expect(text).not.toMatch(/\n\d+\. \*\*/);
    expect(text).toContain("antes de \"## Enlaces\"");
  });
});

describe("modo multi-operador: flujos", () => {
  test("questions-flow pregunta si trabajan varias personas y usa todas las plantillas de multi/", () => {
    const flow = read("skill/docs/questions-flow.md");
    expect(flow).toContain("¿Van a trabajar varias personas en paralelo en este proyecto, cada una con su agente?");
    expect(flow).toContain("## Modo multi-operador");
    for (const name of MULTI_TEMPLATES) expect(flow).toContain(`template/multi/${name}`);
  });

  test("migration-flow pasa de plano a multi con git mv y verifica el árbol limpio", () => {
    const flow = read("skill/docs/migration-flow.md");
    expect(flow).toContain("## Pasar de plano a multi-operador");
    expect(flow).toContain("git status --porcelain docs/agents");
    expect(flow).toContain("`git mv`");
  });

  test("SKILL.md enlaza el modo multi y el paso de plano a multi", () => {
    const skill = read("skill/SKILL.md");
    expect(skill).toContain("docs/multi-operator.md");
    expect(skill).toContain("Pasar de plano a multi-operador");
  });

  test("multi-operator.md describe detección, resolución del operador y estado inconsistente", () => {
    const doc = read("skill/docs/multi-operator.md");
    expect(doc).toContain("docs/agents/operators.md");
    expect(doc).toContain("git config user.email");
    expect(doc).toContain("Estado inconsistente");
    expect(doc).toContain("solo team-backlog");
  });
});

describe("modo plano: sin cambios", () => {
  const PLAIN = [
    "skill/template/AGENTS.md",
    "skill/template/agents/rules.md",
    "skill/template/agents/handoff.md",
    "skill/template/agents/backlog.md",
    "skill/template/agents/history.md",
  ];

  test("las plantillas planas no mencionan el modo multi", () => {
    for (const file of PLAIN) {
      const text = read(file);
      expect(text, file).not.toContain("operators.md");
      expect(text, file).not.toContain("team-backlog");
      expect(text, file).not.toContain("multi-operador");
    }
  });

  test("la plantilla plana de rules.md sigue sin el bloque de trabajo en paralelo", () => {
    expect(read("skill/template/agents/rules.md")).not.toContain("Trabajo en paralelo");
  });
});

describe("enlaces relativos de la documentación del skill", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(join(ROOT, dir))) {
      const rel = join(dir, name);
      if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
      else if (rel.endsWith(".md")) files.push(rel);
    }
  };
  walk("skill/docs");
  walk("docs");
  files.push("skill/SKILL.md", "README.md", "AGENTS.md", "CLAUDE.md");

  test("todos apuntan a archivos o carpetas que existen", () => {
    const broken: string[] = [];
    for (const file of files) {
      const text = read(file).replace(/```[\s\S]*?```/g, "").replace(/<!--[\s\S]*?-->/g, "");
      for (const match of text.matchAll(/\]\((\.{1,2}\/[^)#\s]*)(#[^)]*)?\)/g)) {
        if (!existsSync(resolve(ROOT, dirname(file), match[1]))) broken.push(`${file} → ${match[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });
});

describe("docs/architecture.md refleja el modo multi", () => {
  test("lista multi-operator.md, template/multi y el parser de operators", () => {
    const doc = read("docs/architecture.md");
    expect(doc).toContain("multi-operator.md");
    expect(doc).toContain("multi/");
    expect(doc).toContain("operators");
  });
});
