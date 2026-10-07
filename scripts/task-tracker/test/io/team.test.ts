import { describe, expect, test } from "bun:test";
import { relative, sep } from "node:path";
import { createTeamReader, ROOT_WATCHED_FILES, TEAM_BACKLOG_FILE } from "../../src/io/team.ts";
import type { ReadResult } from "../../src/shared/types.ts";

const ROOT = "/agents";
const OPERATORS = `# Operadores

<!-- agent-context-kit:section=operators -->
## Lista

- gersom: g@mail.com
- ana: ana@mail.com
- luis (solo team-backlog): luis@mail.com
`;

type FakeFile = string | null | { code: string };

/** readFile falso por ruta relativa a la raíz (`gersom/handoff.md`, `team-backlog.md`). */
function fakeFs(initial: Record<string, FakeFile>) {
  const files: Record<string, FakeFile> = { ...initial };
  const readFile = (path: string): ReadResult => {
    const key = relative(ROOT, path).split(sep).join("/");
    const value = files[key];
    if (value == null) return { text: null, error: null, code: null };
    if (typeof value === "object") return { text: null, error: `No se pudo leer ${key}: ${value.code}`, code: value.code };
    return { text: value, error: null, code: null };
  };
  return { files, readFile };
}

const options = (readFile: (path: string) => ReadResult) => ({ readFile, now: () => new Date(2026, 9, 6, 12, 0, 0), formatTime: () => "12:00:00" });

describe("createTeamReader", () => {
  test("lee cada operador con carpeta, deja sin snapshot al que es solo team-backlog y lee el team-backlog", () => {
    const fs = fakeFs({
      "operators.md": OPERATORS,
      "gersom/handoff.md": "# G",
      "gersom/backlog.md": "# GB",
      "gersom/history.md": "# GH",
      "ana/handoff.md": "# A",
      "team-backlog.md": "# T",
    });
    const read = createTeamReader(ROOT, options(fs.readFile)).read({ allowRetry: false });
    expect(read.operators.map((o) => o.entry.folder)).toEqual(["gersom", "ana", "luis"]);
    expect(read.operators[0].snapshot).toMatchObject({ handoffText: "# G", backlogText: "# GB", historyText: "# GH" });
    expect(read.operators[1].snapshot).toMatchObject({ handoffText: "# A", backlogText: null });
    expect(read.operators[2].snapshot).toBeNull();
    expect(read.teamBacklogText).toBe("# T");
    expect(read.warnings).toEqual([]);
  });

  test("pide reintento si un operador no se pudo leer en la primera lectura", () => {
    const fs = fakeFs({ "operators.md": OPERATORS, "gersom/handoff.md": "# G" });
    const reader = createTeamReader(ROOT, options(fs.readFile));
    expect(reader.read().needsRetry).toBe(true);
    expect(reader.read({ allowRetry: false }).needsRetry).toBe(false);
  });

  test("team-backlog.md que falla después de leerse bien: última versión buena con aviso", () => {
    const fs = fakeFs({ "operators.md": OPERATORS, "gersom/handoff.md": "# G", "team-backlog.md": "# T" });
    const reader = createTeamReader(ROOT, options(fs.readFile));
    reader.read({ allowRetry: false });
    fs.files["team-backlog.md"] = { code: "EBUSY" };
    const read = reader.read({ allowRetry: false });
    expect(read.teamBacklogText).toBe("# T");
    expect(read.warnings).toContain("team-backlog.md no se pudo leer (error de lectura): mostrando la versión de las 12:00:00.");
  });

  test("un operador nuevo en operators.md aparece en la lectura siguiente", () => {
    const fs = fakeFs({ "operators.md": OPERATORS, "gersom/handoff.md": "# G" });
    const reader = createTeamReader(ROOT, options(fs.readFile));
    expect(reader.read({ allowRetry: false }).operators).toHaveLength(3);
    fs.files["operators.md"] = `${OPERATORS}- mia: mia@mail.com\n`;
    fs.files["mia/handoff.md"] = "# M";
    const read = reader.read({ allowRetry: false });
    expect(read.operators.map((o) => o.entry.folder)).toContain("mia");
    expect(read.operators.at(-1)?.snapshot?.handoffText).toBe("# M");
  });

  test("líneas ilegibles de operators.md quedan como aviso", () => {
    const fs = fakeFs({ "operators.md": `${OPERATORS}- rota\n` });
    const read = createTeamReader(ROOT, options(fs.readFile)).read({ allowRetry: false });
    expect(read.warnings).toContain("operators.md: línea sin leer: rota");
  });

  test("archivos de la raíz que se vigilan", () => {
    expect(ROOT_WATCHED_FILES).toEqual(["operators.md", TEAM_BACKLOG_FILE]);
  });
});
