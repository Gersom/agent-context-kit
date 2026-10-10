import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parseOperators } from "../_shared/parse/operators.ts";
import { hasSkill, ROOT, readRoot, readSkill, SKILL_DIR } from "./skill-dir.ts";

const bytes = (text: string) => Buffer.byteLength(text, "utf8");
const withoutComments = (text: string) => text.replace(/<!--[\s\S]*?-->/g, "");

const MULTI_TEMPLATES = ["AGENTS.md", "operators.md", "team-backlog.md", "preferences.md", "rules.md"];

describe.skipIf(!hasSkill)("modo multi-operador: plantillas", () => {
  test("existen todas las plantillas de multi/", () => {
    for (const name of MULTI_TEMPLATES) expect(existsSync(join(SKILL_DIR, "template/multi", name))).toBe(true);
  });

  test("multi/AGENTS.md lee README, reglas, operadores y handoff en ese orden, y es corto", () => {
    const text = withoutComments(readSkill("template/multi/AGENTS.md"));
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
    const text = readSkill("template/multi/operators.md");
    expect(text).toContain("<!-- agent-context-kit:section=operators -->");
    expect(parseOperators(text)).toEqual({ operators: [], unreadable: [] });
    expect(bytes(withoutComments(text))).toBeLessThanOrEqual(700);
  });

  test("team-backlog.md: anclas libres/bloqueadas, sin contador, y reglas de tomar y devolver", () => {
    const text = readSkill("template/multi/team-backlog.md");
    expect(text).toContain("<!-- agent-context-kit:section=free -->");
    expect(text).toContain("<!-- agent-context-kit:section=blocked -->");
    expect(text).not.toContain("Próximo número");
    expect(text).toContain("Origen: team-backlog");
    expect(text).toContain("Devuelta por");
    expect(text).toContain("T-N@operador");
  });

  test("preferences.md no puede contradecir rules.md", () => {
    const text = readSkill("template/multi/preferences.md");
    expect(text).toContain("../rules.md");
    expect(text).toContain("gana `rules.md`");
  });

  test("el bloque de reglas no redefine las Reglas por defecto y se coloca antes de «Enlaces»", () => {
    const text = readSkill("template/multi/rules.md");
    expect(text).toContain("## Trabajo en paralelo (modo multi-operador)");
    expect(text).toContain("Reglas 2 a 8");
    expect(text).toContain("T-N@operador");
    expect(text).not.toMatch(/\n\d+\. \*\*/);
    expect(text).toContain("antes de \"## Enlaces\"");
  });
});

describe.skipIf(!hasSkill)("modo multi-operador: flujos", () => {
  test("questions-flow pregunta si trabajan varias personas y usa todas las plantillas de multi/", () => {
    const flow = readSkill("docs/questions-flow.md");
    expect(flow).toContain("¿Van a trabajar varias personas en paralelo en este proyecto, cada una con su agente?");
    expect(flow).toContain("## Modo multi-operador");
    for (const name of MULTI_TEMPLATES) expect(flow).toContain(`template/multi/${name}`);
  });

  test("migration-flow pasa de plano a multi con git mv y verifica el árbol limpio", () => {
    const flow = readSkill("docs/migration-flow.md");
    expect(flow).toContain("## Pasar de plano a multi-operador");
    expect(flow).toContain("git status --porcelain docs/agents");
    expect(flow).toContain("`git mv`");
  });

  test("SKILL.md enlaza el modo multi y el paso de plano a multi", () => {
    const skill = readSkill("SKILL.md");
    expect(skill).toContain("docs/multi-operator.md");
    expect(skill).toContain("Pasar de plano a multi-operador");
  });

  test("multi-operator.md describe detección, resolución del operador y estado inconsistente", () => {
    const doc = readSkill("docs/multi-operator.md");
    expect(doc).toContain("docs/agents/operators.md");
    expect(doc).toContain("git config user.email");
    expect(doc).toContain("Estado inconsistente");
    expect(doc).toContain("solo team-backlog");
  });
});

describe.skipIf(!hasSkill)("modo plano: sin cambios", () => {
  const PLAIN = [
    "template/AGENTS.md",
    "template/agents/rules.md",
    "template/agents/handoff.md",
    "template/agents/backlog.md",
    "template/agents/history.md",
  ];

  test("las plantillas planas no mencionan el modo multi", () => {
    for (const file of PLAIN) {
      const text = readSkill(file);
      expect(text, file).not.toContain("operators.md");
      expect(text, file).not.toContain("team-backlog");
      expect(text, file).not.toContain("multi-operador");
    }
  });

  test("la plantilla plana de rules.md sigue sin el bloque de trabajo en paralelo", () => {
    expect(readSkill("template/agents/rules.md")).not.toContain("Trabajo en paralelo");
  });
});

/** Lista (rutas absolutas) los .md bajo `dir`, recursivamente; vacío si la carpeta no existe. */
function walkMd(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) out.push(...walkMd(abs));
    else if (abs.endsWith(".md")) out.push(abs);
  }
  return out;
}

/** Enlaces markdown (sin ancla) de un .md, ignorando bloques de código y comentarios. */
function linksOf(abs: string): string[] {
  const text = readFileSync(abs, "utf8").replace(/```[\s\S]*?```/g, "").replace(/<!--[\s\S]*?-->/g, "");
  return [...text.matchAll(/\]\(([^)#\s]*)(#[^)]*)?\)/g)].map((m) => m[1]);
}

/** Enlaces relativos con prefijo ./ o ../ (los que se resuelven contra el archivo que los contiene). */
const relativeLinksOf = (abs: string) => linksOf(abs).filter((l) => /^\.{1,2}\//.test(l));

/** Enlaces relativos de cualquier forma (`./x`, `../x`, `x/y`); excluye URLs con esquema, rutas absolutas y anclas. */
const anyRelativeLinksOf = (abs: string) => linksOf(abs).filter((l) => l !== "" && !/^[a-z][a-z0-9+.-]*:/i.test(l) && !l.startsWith("/"));

/** `target` está dentro de `base` (o es `base`). */
function isInside(base: string, target: string): boolean {
  const rel = relative(base, target);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

describe("enlaces relativos de la documentación del kit", () => {
  const kitFiles = () => [...walkMd(join(ROOT, "docs")), ...["README.md", "AGENTS.md", "CLAUDE.md"].map((f) => join(ROOT, f))];
  const rel = (abs: string) => relative(ROOT, abs).split(sep).join("/");

  test("todos apuntan a archivos o carpetas que existen", () => {
    const broken: string[] = [];
    for (const file of kitFiles()) {
      for (const link of relativeLinksOf(file)) {
        if (!existsSync(resolve(dirname(file), link))) broken.push(`${rel(file)} → ${link}`);
      }
    }
    expect(broken).toEqual([]);
  });

  test("ninguno enlaza con la carpeta skill/ (vive en un repo aparte)", () => {
    // Registros históricos: pueden mencionar skill/ sin que sea un enlace vivo.
    const historical = (file: string) => {
      const r = rel(file);
      return r === "docs/desing.md" || /^docs\/agents\/[^/]+\/(history|backlog)\.md$/.test(r);
    };
    const offenders: string[] = [];
    for (const file of kitFiles().filter((f) => !historical(f))) {
      for (const link of anyRelativeLinksOf(file)) {
        if (isInside(join(ROOT, "skill"), resolve(dirname(file), link))) offenders.push(`${rel(file)} → ${link}`);
      }
    }
    expect(offenders, "enlaces del kit que apuntan dentro de skill/ (quítalos o conviértelos en texto)").toEqual([]);
  });
});

describe.skipIf(!hasSkill)("enlaces relativos de la documentación de la skill", () => {
  const skillFiles = () => [join(SKILL_DIR, "SKILL.md"), ...walkMd(join(SKILL_DIR, "docs"))];
  const rel = (abs: string) => relative(SKILL_DIR, abs).split(sep).join("/");

  test("todos apuntan a archivos o carpetas que existen", () => {
    const broken: string[] = [];
    for (const file of skillFiles()) {
      for (const link of relativeLinksOf(file)) {
        if (!existsSync(resolve(dirname(file), link))) broken.push(`${rel(file)} → ${link}`);
      }
    }
    expect(broken).toEqual([]);
  });

  test("ninguno sale fuera de la carpeta de la skill", () => {
    const escaping: string[] = [];
    for (const file of skillFiles()) {
      for (const link of anyRelativeLinksOf(file)) {
        if (!isInside(SKILL_DIR, resolve(dirname(file), link))) escaping.push(`${rel(file)} → ${link}`);
      }
    }
    expect(escaping, "la skill debe ser autocontenida: sus enlaces no pueden salir de su carpeta").toEqual([]);
  });

  test("no menciona (ni en texto plano) el README raíz ni docs/desing.md del kit", () => {
    const mentions: string[] = [];
    for (const file of skillFiles()) {
      const text = readFileSync(file, "utf8");
      if (/desing.md|`README.md` raíz|README.md raíz/.test(text)) mentions.push(rel(file));
    }
    expect(mentions, "la skill no debe depender de archivos del repo kit").toEqual([]);
  });
});

describe("docs/architecture.md refleja el modo multi", () => {
  test("lista multi-operator.md, template/multi y el parser de operators", () => {
    const doc = readRoot("docs/architecture.md");
    expect(doc).toContain("multi-operator.md");
    expect(doc).toContain("multi/");
    expect(doc).toContain("operators");
  });
});
