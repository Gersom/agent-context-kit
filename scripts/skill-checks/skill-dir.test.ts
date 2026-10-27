import { describe, expect, test } from "bun:test";
import { join, resolve } from "node:path";
import { resolveSkillDir } from "./skill-dir.ts";

const ROOT = resolve("/repo");

// Simula un disco donde solo existen estas carpetas de skill (con su SKILL.md).
const withSkillIn = (...dirs: string[]) => {
  const files = new Set(dirs.map((dir) => join(dir, "SKILL.md")));
  return (path: string) => files.has(path);
};

describe("resolveSkillDir", () => {
  test("SKILL_DIR gana a las carpetas por defecto", () => {
    const custom = resolve("/otra/skill");
    const exists = withSkillIn(custom, join(ROOT, "agent-context-skill"), join(ROOT, "skill"));
    expect(resolveSkillDir(custom, ROOT, exists)).toBe(custom);
  });

  test("agent-context-skill/ gana a skill/", () => {
    const exists = withSkillIn(join(ROOT, "agent-context-skill"), join(ROOT, "skill"));
    expect(resolveSkillDir(undefined, ROOT, exists)).toBe(join(ROOT, "agent-context-skill"));
  });

  test("solo skill/", () => {
    const exists = withSkillIn(join(ROOT, "skill"));
    expect(resolveSkillDir(undefined, ROOT, exists)).toBe(join(ROOT, "skill"));
  });

  test("SKILL_DIR sin SKILL.md se ignora y se usa la siguiente candidata", () => {
    const exists = withSkillIn(join(ROOT, "agent-context-skill"));
    expect(resolveSkillDir(resolve("/no/existe"), ROOT, exists)).toBe(join(ROOT, "agent-context-skill"));
  });

  test("ninguna existe: devuelve <raíz>/skill, que no existe", () => {
    const exists = withSkillIn();
    const dir = resolveSkillDir(undefined, ROOT, exists);
    expect(dir).toBe(join(ROOT, "skill"));
    expect(exists(join(dir, "SKILL.md"))).toBe(false);
  });
});
