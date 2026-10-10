import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { hasSkill, ROOT, SKILL_DIR } from "./skill-dir.ts";

// El fixture de docs-check es una copia de skill/template/. Si la plantilla cambia, el snapshot debe regenerarse.
const FIXTURE = join(ROOT, "scripts", "docs-check", "test", "fixtures", "template");

const normalize = (text: string) => text.replace(/\r\n/g, "\n");

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) out.push(...walkFiles(abs));
    else out.push(abs);
  }
  return out;
}

describe.skipIf(!hasSkill)("snapshot de docs-check coincide con la plantilla de la skill", () => {
  test("cada archivo de fixtures/template/ es idéntico al de SKILL_DIR/template/", () => {
    if (!existsSync(FIXTURE)) {
      // Aún no existe el snapshot: no hay nada que comparar.
      expect(true).toBe(true);
      return;
    }
    const differing: string[] = [];
    for (const file of walkFiles(FIXTURE)) {
      const rel = relative(FIXTURE, file).split(sep).join("/");
      const source = join(SKILL_DIR, "template", rel);
      if (!existsSync(source) || normalize(readFileSync(file, "utf8")) !== normalize(readFileSync(source, "utf8"))) differing.push(rel);
    }
    expect(
      differing,
      `El snapshot scripts/docs-check/test/fixtures/template/ difiere de la plantilla de la skill en: ${differing.join(", ")}. ` +
        "Regéneralo copiando esos archivos desde SKILL_DIR/template/ (o borrando los que ya no existen allí).",
    ).toEqual([]);
  });
});
