import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CliError } from "../../src/cli/errors.ts";
import { locateAgents } from "../../src/workspace/paths.ts";
import { resolveWorkspace } from "../../src/workspace/workspace.ts";
import { makeProject, type Project } from "../helpers.ts";

const projects: Project[] = [];
function project(options: Parameters<typeof makeProject>[0]): Project {
  const p = makeProject(options);
  projects.push(p);
  return p;
}
afterAll(() => projects.forEach((p) => p.cleanup()));

/** El mensaje del CliError que lanza `fn` (falla el test si no lanza). */
function errorOf(fn: () => unknown): string {
  try {
    fn();
  } catch (caught) {
    expect(caught).toBeInstanceOf(CliError);
    return (caught as CliError).message;
  }
  throw new Error("no lanzó");
}

describe("resolveWorkspace — modo multi-operador", () => {
  const multi = project({ folders: ["gersom", "ana", "fantasma"], teamBacklog: true });

  test("por correo de git, sin distinguir mayúsculas y con varios correos", () => {
    for (const email of ["gersom@MAIL.com", "g@work.com"]) {
      const ws = resolveWorkspace({ agents: multi.root, email });
      expect(ws.mode).toBe("multi");
      expect(ws.operator).toEqual({ folder: "gersom", source: "email", email, ownership: "own" });
      expect(ws.dir).toBe(join(multi.agents, "gersom"));
      expect(ws.agentsRoot).toBe(multi.agents);
      expect(ws.projectDir).toBe(multi.root);
      expect(ws.files).toEqual({
        handoff: join(multi.agents, "gersom", "handoff.md"),
        backlog: join(multi.agents, "gersom", "backlog.md"),
        history: join(multi.agents, "gersom", "history.md"),
        teamBacklog: join(multi.agents, "team-backlog.md"),
      });
    }
  });

  test("--agents acepta la raíz del proyecto, docs/agents y la carpeta de un operador", () => {
    for (const agents of [multi.root, multi.agents]) {
      expect(resolveWorkspace({ agents, email: "ana@mail.com" }).operator?.folder).toBe("ana");
    }
    const direct = resolveWorkspace({ agents: join(multi.agents, "ana"), email: "gersom@mail.com" });
    expect(direct.operator).toMatchObject({ folder: "ana", source: "path", ownership: "other" });
  });

  test("--operator gana sobre el correo, sin distinguir mayúsculas, y marca que no es la carpeta propia", () => {
    const ws = resolveWorkspace({ agents: multi.root, operator: "ANA", email: "gersom@mail.com" });
    expect(ws.operator).toEqual({ folder: "ana", source: "flag", email: "gersom@mail.com", ownership: "other" });
    expect(resolveWorkspace({ agents: multi.root, operator: "gersom", email: "gersom@mail.com" }).operator?.ownership).toBe("own");
  });

  test("sin correo de git: sin verificar con --operator, error sin él", () => {
    expect(resolveWorkspace({ agents: multi.root, operator: "ana", email: null }).operator?.ownership).toBe("unverified");
    const message = errorOf(() => resolveWorkspace({ agents: multi.root, email: null }));
    expect(message).toContain("git config user.email");
    expect(message).toContain("--operator");
  });

  test("correo no registrado: dice cuál y qué operadores hay", () => {
    const message = errorOf(() => resolveWorkspace({ agents: multi.root, email: "otra@mail.com" }));
    expect(message).toContain("otra@mail.com no figura en operators.md");
    expect(message).toContain("Operadores con carpeta: gersom, ana, fantasma");
  });

  test("operador «solo team-backlog» (por correo o por --operator): no tiene carpeta", () => {
    expect(errorOf(() => resolveWorkspace({ agents: multi.root, email: "luis@mail.com" }))).toContain("solo team-backlog");
    expect(errorOf(() => resolveWorkspace({ agents: multi.root, operator: "luis", email: "gersom@mail.com" }))).toContain(
      "solo team-backlog",
    );
  });

  test("--operator desconocido", () => {
    const message = errorOf(() => resolveWorkspace({ agents: multi.root, operator: "nadie", email: "gersom@mail.com" }));
    expect(message).toContain("«nadie» no figura en operators.md");
  });

  test("en operators.md pero sin carpeta o sin handoff.md", () => {
    const p = project({ folders: ["gersom"] }); // «ana» y «fantasma» figuran, pero no existen
    const message = errorOf(() => resolveWorkspace({ agents: p.root, operator: "ana", email: "gersom@mail.com" }));
    expect(message).toContain("«ana» figura en operators.md pero no existe o no tiene handoff.md");
  });

  test("carpeta con handoff.md que no figura en operators.md: lo dice", () => {
    const p = project({ folders: ["gersom", "extra"] });
    const message = errorOf(() => resolveWorkspace({ agents: p.root, operator: "extra", email: "gersom@mail.com" }));
    expect(message).toContain("existe pero no está registrada");
  });

  test("operators.md sin operadores legibles", () => {
    const p = project({ folders: ["gersom"], operators: "# Operadores\n\n<!-- agent-context-kit:section=operators -->\n## Lista\n\nnada\n" });
    expect(errorOf(() => resolveWorkspace({ agents: p.root, email: "gersom@mail.com" }))).toContain("no tiene operadores legibles");
  });

  test("líneas de operators.md sin leer: aviso (si se resuelve) o dato en el error", () => {
    const operators = "<!-- agent-context-kit:section=operators -->\n## Lista\n\n- gersom: g@mail.com\n- esto no se entiende\n";
    const p = project({ folders: ["gersom"], operators });
    const ws = resolveWorkspace({ agents: p.root, email: "g@mail.com" });
    expect(ws.warnings).toEqual(["operators.md: línea sin leer: esto no se entiende"]);
    expect(errorOf(() => resolveWorkspace({ agents: p.root, email: "x@mail.com" }))).toContain("sin leer: esto no se entiende");
  });

  test("no escribe nada al resolver (mismo contenido de carpetas antes y después)", () => {
    const listing = () => new Bun.Glob("**/*").scanSync({ cwd: multi.root, dot: true, onlyFiles: false });
    const snapshot = [...listing()].sort();
    resolveWorkspace({ agents: multi.root, email: "gersom@mail.com" });
    expect([...listing()].sort()).toEqual(snapshot);
  });
});

describe("resolveWorkspace — repo plano", () => {
  test("handoff, backlog e history directo en docs/agents/, sin operador ni team-backlog", () => {
    const p = project({ flat: true });
    const ws = resolveWorkspace({ agents: p.root, email: "cualquiera@mail.com" });
    expect(ws.mode).toBe("flat");
    expect(ws.operator).toBeNull();
    expect(ws.dir).toBe(p.agents);
    expect(ws.files).toEqual({
      handoff: join(p.agents, "handoff.md"),
      backlog: join(p.agents, "backlog.md"),
      history: join(p.agents, "history.md"),
      teamBacklog: null,
    });
  });

  test("--operator en un repo plano es un error explícito", () => {
    const p = project({ flat: true });
    expect(errorOf(() => resolveWorkspace({ agents: p.root, operator: "ana", email: null }))).toContain("este repo es plano");
  });

  test("set mínimo: solo handoff.md", () => {
    const p = project({ flat: true, omit: ["backlog.md", "history.md"] });
    const ws = resolveWorkspace({ agents: p.agents, email: null });
    expect(ws.mode).toBe("flat");
  });
});

describe("locateAgents — casos de error y rutas", () => {
  test("operators.md ausente pero con carpetas de operador: no se asume plano", () => {
    const p = project({ folders: ["gersom", "ana"], operators: null });
    const message = errorOf(() => locateAgents(p.root, p.root));
    expect(message).toContain("Hay carpetas de operador (ana, gersom) pero falta operators.md");
    expect(message).toContain("No se asume repo plano");
  });

  test("handoff.md suelto junto a carpetas de operador y sin operators.md: sigue siendo ambiguo", () => {
    const p = project({ flat: true, folders: ["ana"], operators: null });
    expect(errorOf(() => locateAgents(p.root, p.root))).toContain("falta operators.md");
  });

  test("sin documentación de agentes: lista las carpetas probadas", () => {
    const p = project({ operators: null });
    const message = errorOf(() => locateAgents(p.root, p.root));
    expect(message).toContain("No se encontró la documentación de agentes");
    expect(message).toContain(join(p.root, "docs", "agents"));
    expect(message).toContain("--agents");
  });

  test("--agents vacío o que no existe", () => {
    const p = project({});
    expect(errorOf(() => locateAgents("  ", p.root))).toContain("--agents está vacío");
    expect(errorOf(() => locateAgents("no-existe", p.root))).toContain("No existe la carpeta indicada con --agents");
  });

  test("ruta relativa (contra baseDir) y con comillas envolventes", () => {
    const p = project({ flat: true });
    expect(locateAgents(".", p.root)).toEqual({ mode: "flat", agentsDir: p.agents });
    expect(locateAgents(`"${p.root}"`, "C:/otra")).toEqual({ mode: "flat", agentsDir: p.agents });
  });

  test("también encuentra agent-context/agents", () => {
    const p = project({ operators: null });
    const alt = join(p.root, "agent-context", "agents");
    mkdirSync(alt, { recursive: true });
    writeFileSync(join(alt, "handoff.md"), "# Handoff\n");
    expect(locateAgents(p.root, p.root)).toEqual({ mode: "flat", agentsDir: alt });
  });

  test("sin --agents, busca el repo git que contiene la carpeta de invocación", () => {
    const p = project({ flat: true });
    const init = spawnSync("git", ["init", "-q", p.root]);
    if (init.status !== 0) return; // sin git en la máquina: no se puede probar
    const sub = join(p.root, "docs");
    const located = locateAgents(undefined, sub);
    // git puede devolver la ruta larga de un directorio temporal con nombre corto (8.3) de Windows.
    expect(located.mode).toBe("flat");
    expect(realpathSync.native(located.mode === "flat" ? located.agentsDir : "")).toBe(realpathSync.native(p.agents));
  });
});
