import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CliError } from "../../src/cli/errors.ts";
import { readDoc, readDocs, readRaw, requireDoc } from "../../src/workspace/docs.ts";
import { resolveWorkspace } from "../../src/workspace/workspace.ts";
import { makeProject, type Project } from "../helpers.ts";

const projects: Project[] = [];
function project(options: Parameters<typeof makeProject>[0]): Project {
  const p = makeProject(options);
  projects.push(p);
  return p;
}
afterAll(() => projects.forEach((p) => p.cleanup()));

describe("readDocs", () => {
  test("lee y parsea los cuatro archivos con posiciones sobre el texto LF", () => {
    const p = project({ folders: ["gersom"], teamBacklog: true });
    const docs = readDocs(resolveWorkspace({ agents: p.root, email: "g@work.com" }));
    expect(docs.handoff.exists && docs.backlog.exists && docs.history.exists && docs.teamBacklog?.exists).toBe(true);
    expect(docs.handoff.kind).toBe("handoff");
    expect(docs.handoff.parsed.inProgress.task?.number).toBe(12);
    expect(docs.handoff.parsed.sections["in-progress"].anchorRange).not.toBeNull();
    expect(docs.history.parsed.entries.length).toBeGreaterThan(0);
    expect(docs.teamBacklog?.parsed.free.map((t) => t.title)).toEqual(["Revisar el copy del onboarding"]);
    // Los rangos apuntan al texto normalizado: recortar `text` con ellos da lo que describen.
    const task = docs.handoff.parsed.inProgress.task;
    expect(docs.handoff.text.slice(task!.range!.start, task!.range!.end)).toBe("**Tarea:** Tarea 12 — Implementar el **parser** de anclas");
  });

  test("CRLF: el crudo se conserva, el texto parseado va en LF y los offsets se traducen", () => {
    const p = project({ folders: ["gersom"] });
    const path = join(p.agents, "gersom", "handoff.md");
    writeFileSync(path, readFileSync(path, "utf8").replace(/\n/g, "\r\n"));
    const docs = readDocs(resolveWorkspace({ agents: p.root, operator: "gersom", email: null }));
    expect(docs.handoff.raw).toContain("\r\n");
    expect(docs.handoff.text).not.toContain("\r");
    expect(docs.handoff.eol.eol).toBe("\r\n");
    const task = docs.handoff.parsed.inProgress.task!;
    const [start, end] = docs.handoff.eol.rawSpan(task.range!);
    expect(docs.handoff.raw.slice(start, end)).toBe("**Tarea:** Tarea 12 — Implementar el **parser** de anclas");
  });

  test("archivos que pueden faltar: history.md y team-backlog.md ausentes no son un error", () => {
    const p = project({ folders: ["gersom"], omit: ["history.md"] }); // sin team-backlog.md
    const docs = readDocs(resolveWorkspace({ agents: p.root, operator: "gersom", email: null }));
    expect(docs.history).toMatchObject({ exists: false, raw: "", text: "" });
    expect(docs.history.parsed.entries).toEqual([]);
    expect(docs.teamBacklog).toMatchObject({ exists: false, raw: "" });
    expect(docs.handoff.exists).toBe(true);
  });

  test("repo plano: no hay team-backlog", () => {
    const p = project({ flat: true, omit: ["backlog.md", "history.md"] });
    const docs = readDocs(resolveWorkspace({ agents: p.root, email: null }));
    expect(docs.teamBacklog).toBeNull();
    expect(docs.backlog.exists).toBe(false);
    expect(docs.handoff.exists).toBe(true);
  });

  test("un archivo vacío existe: no es lo mismo que uno ausente", () => {
    const p = project({ flat: true });
    writeFileSync(join(p.agents, "history.md"), "");
    const docs = readDocs(resolveWorkspace({ agents: p.root, email: null }));
    expect(docs.history).toMatchObject({ exists: true, raw: "" });
  });
});

describe("readRaw / readDoc / requireDoc", () => {
  test("ausente → null; ilegible (es una carpeta) → error claro, no «ausente»", () => {
    const p = project({ flat: true });
    expect(readRaw(join(p.agents, "no-existe.md"))).toBeNull();
    const dir = join(p.agents, "carpeta.md");
    mkdirSync(dir);
    expect(() => readRaw(dir)).toThrow(CliError);
    expect(() => readRaw(dir)).toThrow(/No se pudo leer carpeta\.md/);
    expect(() => readDoc("history", dir, () => 0)).toThrow(CliError);
  });

  test("requireDoc: error si falta o no aplica; devuelve el archivo si existe", () => {
    const p = project({ flat: true, omit: ["history.md"] });
    const docs = readDocs(resolveWorkspace({ agents: p.root, email: null }));
    expect(requireDoc(docs.handoff, "handoff.md")).toBe(docs.handoff);
    expect(() => requireDoc(docs.history, "history.md")).toThrow(/Falta history\.md/);
    expect(() => requireDoc(docs.teamBacklog, "team-backlog.md")).toThrow(/no aplica en este repo/);
  });
});
