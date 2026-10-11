import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { hasSkill, readSkill, SKILL_DIR } from "./skill-dir.ts";

// El changelog de la skill (docs/changelog/) lo lee el agente al actualizar un proyecto: un archivo
// X.Y.md por cada versión minor o major, con una sección «## X.Y.Z» por versión. Estos tests fijan su
// formato (el que define docs/changelog/README.md) y que cubra todas las versiones desde la 1.9.

const FIRST_MINOR = 9; // la 1.9 es la primera con marcador de versión y changelog
const TYPES = ["insertar", "reemplazar", "eliminar", "manual"];

const CHANGELOG_DIR = join(SKILL_DIR, "docs", "changelog");

type Version = [number, number, number];
const parse = (version: string): Version => version.split(".").map(Number) as Version;
const compare = (a: string, b: string): number => {
  const [x, y] = [parse(a), parse(b)];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

const pluginVersion = (): string => (JSON.parse(readSkill(".claude-plugin/plugin.json")) as { version: string }).version;
const seriesFiles = (): string[] => readdirSync(CHANGELOG_DIR).filter((name) => /^\d+\.\d+\.md$/.test(name));
const readSeries = (file: string): string => readFileSync(join(CHANGELOG_DIR, file), "utf8").replace(/\r\n/g, "\n");

interface Change {
  title: string;
  fields: Map<string, string>;
  blocks: Map<string, string>;
}
interface Section {
  version: string;
  text: string;
  changes: Change[];
}

/** Secciones `## X.Y.Z` de un archivo de serie y los cambios `### …` de cada una. */
function sections(text: string): Section[] {
  const out: Section[] = [];
  for (const chunk of text.split(/^## /m).slice(1)) {
    const [head, ...rest] = chunk.split(/^### /m);
    const version = head.split("\n")[0].trim();
    const changes = rest.map((body): Change => {
      const lines = body.split("\n");
      const change: Change = { title: lines[0].trim(), fields: new Map(), blocks: new Map() };
      let pending: string | null = null;
      let inBlock = false;
      let block: string[] = [];
      for (const line of lines.slice(1)) {
        const field = line.match(/^- \*\*([^:*]+):\*\*\s*(.*)$/);
        if (field && !inBlock) {
          change.fields.set(field[1], field[2]);
          pending = field[1];
        } else if (line.startsWith("```")) {
          if (inBlock && pending) change.blocks.set(pending, block.join("\n"));
          inBlock = !inBlock;
          block = [];
        } else if (inBlock) block.push(line);
      }
      return change;
    });
    out.push({ version, text: head, changes });
  }
  return out;
}

describe.skipIf(!hasSkill)("changelog de la skill (docs/changelog/)", () => {
  test("hay README y un archivo por cada minor o major desde la 1.9 hasta la versión actual", () => {
    expect(existsSync(join(CHANGELOG_DIR, "README.md")), "falta docs/changelog/README.md").toBe(true);
    const [major, minor] = parse(pluginVersion());
    const expected: string[] = [];
    for (let m = major === 1 ? FIRST_MINOR : 0; m <= minor; m++) expected.push(`${major}.${m}.md`);
    const missing = expected.filter((name) => !seriesFiles().includes(name));
    expect(missing, "faltan archivos de serie en docs/changelog/").toEqual([]);
  });

  test("cada archivo empieza con «# X.Y» igual a su nombre y no hay series posteriores a la versión actual", () => {
    const current = pluginVersion();
    for (const file of seriesFiles()) {
      const series = file.replace(/\.md$/, "");
      expect(readSeries(file).split("\n")[0].trim(), `${file}: el título no coincide con el nombre`).toBe(`# ${series}`);
      expect(compare(`${series}.0`, current), `${file}: es posterior a la versión actual (${current})`).toBeLessThanOrEqual(0);
    }
  });

  test("las secciones ## X.Y.Z son de su serie, crecientes y no pasan de la versión actual", () => {
    const current = pluginVersion();
    for (const file of seriesFiles()) {
      const series = file.replace(/\.md$/, "");
      const versions = sections(readSeries(file)).map((s) => s.version);
      expect(versions.length, `${file}: sin secciones de versión`).toBeGreaterThan(0);
      for (const version of versions) {
        expect(version, `${file}: «## ${version}» no es X.Y.Z`).toMatch(/^\d+\.\d+\.\d+$/);
        expect(version.startsWith(`${series}.`), `${file}: «## ${version}» no es de la serie ${series}`).toBe(true);
        expect(compare(version, current), `${file}: «## ${version}» pasa de la versión actual`).toBeLessThanOrEqual(0);
      }
      const sorted = [...versions].sort(compare);
      expect(versions, `${file}: las secciones van de la más vieja a la más nueva`).toEqual(sorted);
    }
  });

  test("la versión actual tiene su sección en el archivo de su serie", () => {
    const current = pluginVersion();
    const [major, minor] = parse(current);
    const versions = sections(readSeries(`${major}.${minor}.md`)).map((s) => s.version);
    expect(versions).toContain(current);
  });

  test("cada sección dice «Sin cambios que aplicar» o lista cambios bien formados", () => {
    for (const file of seriesFiles()) {
      for (const section of sections(readSeries(file))) {
        const where = `${file} ## ${section.version}`;
        if (section.changes.length === 0) {
          expect(section.text, `${where}: sin cambios debe decir «Sin cambios que aplicar»`).toContain("Sin cambios que aplicar");
          continue;
        }
        for (const change of section.changes) {
          const at = `${where} ### ${change.title}`;
          const type = change.fields.get("Tipo") ?? "";
          expect(TYPES, `${at}: Tipo inválido «${type}»`).toContain(type);
          expect(change.fields.has("Archivo"), `${at}: falta Archivo`).toBe(true);
          if (type === "insertar" || type === "reemplazar") expect(change.blocks.has("Texto nuevo"), `${at}: falta Texto nuevo`).toBe(true);
          if (type === "reemplazar" || type === "eliminar") expect(change.blocks.has("Texto anterior"), `${at}: falta Texto anterior`).toBe(true);
          if (type === "manual") expect(change.fields.has("Instrucción"), `${at}: falta Instrucción`).toBe(true);
        }
      }
    }
  });

  test("el «Texto nuevo» de los cambios de la serie actual con Plantilla está en esa plantilla", () => {
    const [major, minor] = parse(pluginVersion());
    for (const section of sections(readSeries(`${major}.${minor}.md`))) {
      for (const change of section.changes) {
        const template = change.fields.get("Plantilla");
        const text = change.blocks.get("Texto nuevo");
        if (!template || !text) continue;
        const escaped = text.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{\\\{versión\\\}\\\}/g, "\\d+\\.\\d+\\.\\d+");
        expect(readSkill(template), `${change.title}: el texto nuevo no está en ${template}`).toMatch(new RegExp(escaped));
      }
    }
  });

  test("el cambio de la 1.9 (marcador en rules.md) coincide con la plantilla actual", () => {
    const [change] = sections(readSeries("1.9.md"))[0].changes;
    const text = change.blocks.get("Texto nuevo") ?? "";
    expect(text).toContain("agent-context-kit:version {{versión}}");
    const template = readSkill("template/agents/rules.md").split("\n")[0];
    expect(template.replace(/version \d+\.\d+\.\d+/, "version {{versión}}")).toBe(text.trim());
  });
});
