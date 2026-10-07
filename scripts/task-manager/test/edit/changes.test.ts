import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeEol } from "../../../_shared/parse/positions.ts";
import { CliError } from "../../src/cli/errors.ts";
import { commitChanges, type FileChange, planChanges } from "../../src/edit/changes.ts";
import { deleteRange, insertAt, replaceRange } from "../../src/edit/edits.ts";
import { writeFileAtomic } from "../../src/edit/write.ts";
import { type Docs, readDocs } from "../../src/workspace/docs.ts";
import { resolveWorkspace } from "../../src/workspace/workspace.ts";
import { captureIo, makeProject, type Project } from "../helpers.ts";

const project: Project = makeProject({ folders: ["gersom"], teamBacklog: true });
afterAll(() => project.cleanup());

const dir = join(project.agents, "gersom");
const handoffPath = join(dir, "handoff.md");
const backlogPath = join(dir, "backlog.md");
const original = { handoff: readFileSync(handoffPath, "utf8"), backlog: readFileSync(backlogPath, "utf8") };

let docs: Docs;
beforeEach(() => {
  writeFileSync(handoffPath, original.handoff);
  writeFileSync(backlogPath, original.backlog);
  docs = readDocs(resolveWorkspace({ agents: project.root, operator: "gersom", email: null }));
});

/** Edición válida: marca el paso 3 del plan del handoff como hecho. */
const markStep3 = (): FileChange => ({ doc: docs.handoff, edits: [replaceRange(docs.handoff.parsed.inProgress.steps[2].markRange!, "x")] });

describe("planChanges", () => {
  test("calcula el resultado sin escribir", () => {
    const [file] = planChanges([markStep3()]);
    expect(file.changed).toBe(true);
    expect(file.after).toBe(file.before.replace("- [ ] Paso 3", "- [x] Paso 3"));
    expect(readFileSync(handoffPath, "utf8")).toBe(original.handoff);
  });

  test("ediciones que no cambian nada: changed false", () => {
    const step = docs.handoff.parsed.inProgress.steps[0]; // ya está marcado con x
    const [file] = planChanges([{ doc: docs.handoff, edits: [replaceRange(step.markRange!, "x")] }]);
    expect(file.changed).toBe(false);
  });

  test("el mismo archivo dos veces se rechaza", () => {
    expect(() => planChanges([markStep3(), markStep3()])).toThrow(/aparece dos veces/);
  });

  test("una edición que borra el ancla de una sección se rechaza y dice cuál", () => {
    const anchor = docs.handoff.parsed.sections["in-progress"].anchorRange!;
    expect(() => planChanges([{ doc: docs.handoff, edits: [deleteRange({ start: anchor.start, end: anchor.end + 1 })] }])).toThrow(
      /ilegible[^]*se perdió el ancla|ilegible[^]*ya no se encuentra/,
    );
  });

  test("borrar todas las anclas (y quedar en plan B) se rechaza", () => {
    const edits = Object.values(docs.backlog.parsed.sections).map((s) => deleteRange({ start: s.anchorRange!.start, end: s.anchorRange!.end + 1 }));
    expect(() => planChanges([{ doc: docs.backlog, edits }])).toThrow(/sin anclas de sección/);
  });

  test("verify: false permite saltarse la verificación", () => {
    const anchor = docs.handoff.parsed.sections.paused.anchorRange!;
    const [file] = planChanges([{ doc: docs.handoff, edits: [deleteRange({ start: anchor.start, end: anchor.end + 1 })] }], { verify: false });
    expect(file.changed).toBe(true);
  });

  test("un archivo que ya estaba sin anclas se puede seguir editando (solo cuentan las regresiones)", () => {
    const stripped = original.backlog.replace(/<!-- agent-context-kit:section=[a-z-]+ -->\n/g, "");
    writeFileSync(backlogPath, stripped);
    const bare = readDocs(resolveWorkspace({ agents: project.root, operator: "gersom", email: null }));
    expect(() => planChanges([{ doc: bare.backlog, edits: [insertAt(0, "nota\n")] }])).not.toThrow();
  });
});

describe("commitChanges", () => {
  test("escribe solo lo que cambió y deja el resto intacto", () => {
    const { io } = captureIo();
    const aTimeAgo = new Date(Date.now() - 60_000);
    utimesSync(backlogPath, aTimeAgo, aTimeAgo);
    const planned = planChanges([markStep3(), { doc: docs.backlog, edits: [] }]);
    const result = commitChanges(planned, { dryRun: false, io });

    expect(result.files.map((f) => [f.fileName, f.changed, f.written])).toEqual([
      ["handoff.md", true, true],
      ["backlog.md", false, false],
    ]);
    expect(readFileSync(handoffPath, "utf8")).toBe(original.handoff.replace("- [ ] Paso 3", "- [x] Paso 3"));
    // El backlog sin cambios no se reescribió: ni contenido ni fecha de modificación.
    expect(readFileSync(backlogPath, "utf8")).toBe(original.backlog);
    expect(Math.abs(statSync(backlogPath).mtimeMs - aTimeAgo.getTime())).toBeLessThan(2000);
  });

  test("no deja archivos temporales", () => {
    commitChanges(planChanges([markStep3()]), { dryRun: false, io: captureIo().io });
    expect(readdirSync(dir).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  test("--dry-run muestra el diff y no escribe nada", () => {
    const cap = captureIo();
    const result = commitChanges(planChanges([markStep3(), { doc: docs.backlog, edits: [] }]), { dryRun: true, io: cap.io });
    expect(readFileSync(handoffPath, "utf8")).toBe(original.handoff);
    expect(result.files.every((f) => !f.written)).toBe(true);
    expect(result.dryRun).toBe(true);
    const text = cap.text();
    expect(text).toContain(handoffPath);
    expect(text).toContain("-- [ ] Paso 3 — Escribir el modelo");
    expect(text).toContain("+- [x] Paso 3 — Escribir el modelo");
    expect(text).toContain("backlog.md: sin cambios");
    expect(text).toContain("--dry-run: no se escribió nada.");
  });

  test("todo o nada: si una edición es inválida, no se escribe ningún archivo", () => {
    const bad: FileChange = { doc: docs.backlog, edits: [replaceRange({ start: 0, end: 10 }, "x"), replaceRange({ start: 5, end: 12 }, "y")] };
    expect(() => commitChanges(planChanges([markStep3(), bad]), { dryRun: false, io: captureIo().io })).toThrow(/solapadas/);
    expect(readFileSync(handoffPath, "utf8")).toBe(original.handoff);
  });

  test("si el archivo cambió en disco después de leerlo, no escribe ninguno", () => {
    const planned = planChanges([markStep3(), { doc: docs.backlog, edits: [insertAt(0, "nota\n")] }]);
    writeFileSync(backlogPath, original.backlog + "\ncambio externo\n");
    expect(() => commitChanges(planned, { dryRun: false, io: captureIo().io })).toThrow(/cambió en disco/);
    expect(readFileSync(handoffPath, "utf8")).toBe(original.handoff);
    expect(readFileSync(backlogPath, "utf8")).toBe(original.backlog + "\ncambio externo\n");
  });

  test("CRLF: un archivo CRLF sigue siendo CRLF tras editarlo", () => {
    writeFileSync(handoffPath, original.handoff.replace(/\n/g, "\r\n"));
    docs = readDocs(resolveWorkspace({ agents: project.root, operator: "gersom", email: null }));
    commitChanges(
      planChanges([{ doc: docs.handoff, edits: [insertAt(docs.handoff.parsed.inProgress.steps[3].range!.end, "- [ ] Paso 5 — Nuevo\n")] }]),
      { dryRun: false, io: captureIo().io },
    );
    const after = readFileSync(handoffPath, "utf8");
    expect(after).toContain("- [ ] Paso 5 — Nuevo\r\n");
    expect(after.replace(/\r\n/g, "")).not.toContain("\n"); // ningún LF suelto
  });

  test("archivo que no existía: se crea (y con --dry-run se muestra como nuevo)", () => {
    const newPath = join(dir, "nuevo.md");
    const doc: FileChange["doc"] = { kind: "history", fileName: "nuevo.md", path: newPath, exists: false, raw: "", eol: normalizeEol(""), text: "", parsed: null };
    const cap = captureIo();
    const edits = [insertAt(0, "hola\n")];
    commitChanges(planChanges([{ doc, edits }]), { dryRun: true, io: cap.io });
    expect(existsSync(newPath)).toBe(false);
    expect(cap.text()).toContain("(archivo nuevo)");
    commitChanges(planChanges([{ doc, edits }]), { dryRun: false, io: cap.io });
    expect(readFileSync(newPath, "utf8")).toBe("hola\n");
  });
});

describe("writeFileAtomic", () => {
  test("escribe el contenido tal cual y reemplaza el archivo existente", () => {
    const path = join(dir, "atomico.md");
    writeFileAtomic(path, "uno\r\ndos\n");
    expect(readFileSync(path, "utf8")).toBe("uno\r\ndos\n");
    writeFileAtomic(path, "otro\n");
    expect(readFileSync(path, "utf8")).toBe("otro\n");
    expect(readdirSync(dir).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  test("si no se puede escribir, error claro y sin temporales", () => {
    const missing = join(project.root, "no", "existe", "x.md");
    expect(() => writeFileAtomic(missing, "x")).toThrow(CliError);
    expect(() => writeFileAtomic(missing, "x")).toThrow(/No se pudo escribir x\.md/);
  });
});
