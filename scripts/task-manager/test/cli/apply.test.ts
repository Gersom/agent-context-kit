// Mecanismo `--apply` y reglas de escritura del núcleo: un comando que escribe (`writes: true`) solo
// escribe con `--apply`, `--dry-run` gana, solo toca la carpeta propia y es todo o nada entre archivos.

import { afterAll, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { APPLY_NOTICE, run } from "../../src/cli/dispatch.ts";
import type { Command, CommandContext } from "../../src/cli/types.ts";
import type { FileChange } from "../../src/edit/changes.ts";
import { deleteRange, insertAt, replaceRange } from "../../src/edit/edits.ts";
import { captureIo, makeProject, type Project } from "../helpers.ts";

const projects: Project[] = [];
function project(options: Parameters<typeof makeProject>[0] = { folders: ["gersom", "ana"], teamBacklog: true }): Project {
  const p = makeProject(options);
  projects.push(p);
  return p;
}
afterAll(() => projects.forEach((p) => p.cleanup()));

function snapshot(root: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of readdirSync(root, { recursive: true, encoding: "utf8" })) {
    try {
      result[name] = readFileSync(join(root, name), "utf8");
    } catch {
      // carpetas
    }
  }
  return result;
}

const MARK = "<!-- marca -->\n";

/** Comando de prueba: pone una marca al principio del backlog (y, con `--team`, del team-backlog). */
const writer: Command = {
  name: "marcar",
  summary: "Pone una marca",
  usage: "marcar",
  writes: true,
  flags: { team: { type: "boolean", description: "Solo el team-backlog" }, ambos: { type: "boolean", description: "Backlog y handoff" } },
  run(ctx: CommandContext) {
    const docs = ctx.docs({ allowFolderless: ctx.flags.team === true });
    if (ctx.flags.team === true) {
      ctx.commit([{ doc: docs.teamBacklog!, edits: [insertAt(0, MARK)] }]);
      return;
    }
    const changes: FileChange[] = [{ doc: docs.backlog, edits: [insertAt(0, MARK)] }];
    if (ctx.flags.ambos === true) changes.push({ doc: docs.handoff, edits: [insertAt(0, MARK)] });
    ctx.commit(changes);
  },
};

/** Igual que `writer`, pero es de lectura (sin `writes`): escribe directamente. */
const reader: Command = { ...writer, name: "leer", writes: undefined };

async function exec(argv: string[], p: Project, email: string | null = "gersom@mail.com", commands: Command[] = [writer, reader]) {
  const cap = captureIo();
  const code = await run(argv, { commands, io: cap.io, email, baseDir: p.root });
  return { code, out: cap.text(), err: cap.err.join("\n") };
}

const backlogPath = (p: Project, folder = "gersom") => join(p.agents, folder, "backlog.md");

describe("--apply", () => {
  test("sin --apply un comando de escritura muestra el diff, avisa y no escribe nada", async () => {
    const p = project();
    const before = snapshot(p.root);
    const { code, out } = await exec(["marcar", "--operator", "gersom"], p);
    expect(code).toBe(0);
    expect(out).toContain("+<!-- marca -->");
    expect(out).toContain("backlog.md");
    expect(out).toContain(APPLY_NOTICE);
    expect(out).not.toContain("--dry-run");
    expect(snapshot(p.root)).toEqual(before);
  });

  test("con --apply escribe", async () => {
    const p = project();
    const original = readFileSync(backlogPath(p), "utf8");
    const { code, out } = await exec(["marcar", "--apply"], p);
    expect(code).toBe(0);
    expect(out).not.toContain(APPLY_NOTICE);
    expect(readFileSync(backlogPath(p), "utf8")).toBe(MARK + original);
  });

  test("--dry-run + --apply: no escribe (--dry-run gana)", async () => {
    const p = project();
    const before = snapshot(p.root);
    const { code, out } = await exec(["marcar", "--apply", "--dry-run"], p);
    expect(code).toBe(0);
    expect(out).toContain("+<!-- marca -->");
    expect(out).toContain("--dry-run: no se escribió nada.");
    expect(out).not.toContain(APPLY_NOTICE);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("solo --dry-run también muestra el diff sin escribir", async () => {
    const p = project();
    const before = snapshot(p.root);
    const { out } = await exec(["marcar", "--dry-run"], p);
    expect(out).toContain("--dry-run: no se escribió nada.");
    expect(snapshot(p.root)).toEqual(before);
  });

  test("un comando de lectura (sin `writes`) sigue escribiendo directo, sin --apply", async () => {
    const p = project();
    const original = readFileSync(backlogPath(p), "utf8");
    await exec(["leer"], p);
    expect(readFileSync(backlogPath(p), "utf8")).toBe(MARK + original);
  });

  test("sin nada que cambiar no pide --apply", async () => {
    const p = project();
    const noop: Command = {
      ...writer,
      name: "nada",
      run(ctx) {
        const { backlog } = ctx.docs();
        ctx.commit([{ doc: backlog, edits: [replaceRange({ start: 0, end: 1 }, backlog.text[0])] }]);
      },
    };
    const { out } = await exec(["nada"], p, "gersom@mail.com", [noop]);
    expect(out).toContain("backlog.md: sin cambios");
    expect(out).not.toContain(APPLY_NOTICE);
  });

  test("la ayuda marca los comandos que escriben y explica --apply", async () => {
    const p = project();
    const general = await exec([], p);
    expect(general.out).toMatch(/marcar \*\s+Pone una marca/);
    expect(general.out).toMatch(/leer\s+Pone una marca/);
    expect(general.out).toContain("--apply");
    expect(general.out).toContain("no escriben nada sin --apply");
    const one = await exec(["marcar", "--help"], p);
    expect(one.out).toContain("sin --apply solo muestra el diff");
    const read = await exec(["leer", "--help"], p);
    expect(read.out).not.toContain("sin --apply solo muestra el diff");
  });
});

describe("solo la carpeta propia", () => {
  test("la carpeta de otro operador: error claro, sin escribir ni mostrar el diff, con o sin --apply", async () => {
    const p = project();
    const before = snapshot(p.root);
    for (const extra of [[], ["--apply"], ["--dry-run"]]) {
      const { code, out, err } = await exec(["marcar", "--operator", "ana", ...extra], p);
      expect(code).toBe(1);
      expect(err).toContain("«ana» no es la tuya");
      expect(err).toContain("solo lectura");
      expect(out).toBe("");
    }
    expect(snapshot(p.root)).toEqual(before);
  });

  test("sin poder leer el correo de git (sin verificar): también se niega y dice cómo arreglarlo", async () => {
    const p = project();
    const before = snapshot(p.root);
    const { code, err } = await exec(["marcar", "--operator", "gersom", "--apply"], p, null);
    expect(code).toBe(1);
    expect(err).toContain("No se pudo verificar");
    expect(err).toContain("git config user.email");
    expect(snapshot(p.root)).toEqual(before);
  });

  test("lo que cambia solo el team-backlog.md (compartido) no exige carpeta propia", async () => {
    const p = project();
    const teamPath = join(p.agents, "team-backlog.md");
    const original = readFileSync(teamPath, "utf8");
    const { code } = await exec(["marcar", "--team", "--operator", "ana", "--apply"], p);
    expect(code).toBe(0);
    expect(readFileSync(teamPath, "utf8")).toBe(MARK + original);
  });

  test("el repo plano no tiene otros operadores: se puede escribir", async () => {
    const p = project({ flat: true });
    const original = readFileSync(join(p.agents, "backlog.md"), "utf8");
    const { code } = await exec(["marcar", "--apply"], p, null);
    expect(code).toBe(0);
    expect(readFileSync(join(p.agents, "backlog.md"), "utf8")).toBe(MARK + original);
  });
});

describe("todo o nada entre archivos", () => {
  test("si una edición deja un archivo ilegible no se escribe ninguno, ni el que estaba bien", async () => {
    const p = project();
    const before = snapshot(p.root);
    const breaking: Command = {
      ...writer,
      name: "romper",
      run(ctx) {
        const { handoff, backlog } = ctx.docs();
        const anchor = backlog.parsed.sections.free.anchorRange!;
        ctx.commit([
          { doc: handoff, edits: [insertAt(0, MARK)] }, // válida
          { doc: backlog, edits: [deleteRange({ start: anchor.start, end: anchor.end + 1 })] }, // pierde el ancla
        ]);
      },
    };
    const { code, err } = await exec(["romper", "--apply"], p, "gersom@mail.com", [breaking]);
    expect(code).toBe(1);
    expect(err).toContain("No se escribió ningún archivo");
    expect(snapshot(p.root)).toEqual(before);
  });

  test("varios archivos a la vez: con --apply se escriben todos", async () => {
    const p = project();
    const handoffPath = join(p.agents, "gersom", "handoff.md");
    const handoff = readFileSync(handoffPath, "utf8");
    const backlog = readFileSync(backlogPath(p), "utf8");
    await exec(["marcar", "--ambos", "--apply"], p);
    expect(readFileSync(handoffPath, "utf8")).toBe(MARK + handoff);
    expect(readFileSync(backlogPath(p), "utf8")).toBe(MARK + backlog);
  });
});
