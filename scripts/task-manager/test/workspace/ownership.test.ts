// Escribir solo en la carpeta propia (`requireOwnFolder`) y el operador «solo team-backlog» (sin
// carpeta) para los comandos que solo escriben en el team-backlog.md compartido.

import { afterAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { CliError } from "../../src/cli/errors.ts";
import { requireOwnFolder } from "../../src/workspace/ownership.ts";
import { resolveWorkspace } from "../../src/workspace/workspace.ts";
import { makeProject, type Project } from "../helpers.ts";

const projects: Project[] = [];
function project(options: Parameters<typeof makeProject>[0]): Project {
  const p = makeProject(options);
  projects.push(p);
  return p;
}
afterAll(() => projects.forEach((p) => p.cleanup()));

function errorOf(fn: () => unknown): string {
  try {
    fn();
  } catch (caught) {
    expect(caught).toBeInstanceOf(CliError);
    return (caught as CliError).message;
  }
  throw new Error("no lanzó");
}

describe("requireOwnFolder", () => {
  const multi = project({ folders: ["gersom", "ana"], teamBacklog: true });

  test("la carpeta propia pasa; el repo plano también (no hay otros operadores)", () => {
    expect(() => requireOwnFolder(resolveWorkspace({ agents: multi.root, email: "gersom@mail.com" }))).not.toThrow();
    const flat = project({ flat: true });
    expect(() => requireOwnFolder(resolveWorkspace({ agents: flat.root, email: null }))).not.toThrow();
  });

  test("la de otro operador: error que lo dice y recuerda que es de solo lectura", () => {
    const message = errorOf(() => requireOwnFolder(resolveWorkspace({ agents: multi.root, email: "gersom@mail.com", operator: "ana" })));
    expect(message).toContain("«ana» no es la tuya");
    expect(message).toContain("solo lectura");
    expect(message).toContain("No se escribió nada");
  });

  test("sin correo de git: no se puede verificar y se niega", () => {
    const message = errorOf(() => requireOwnFolder(resolveWorkspace({ agents: multi.root, email: null, operator: "gersom" })));
    expect(message).toContain("No se pudo verificar");
  });
});

describe("operador «solo team-backlog» (sin carpeta)", () => {
  const multi = project({ folders: ["gersom"], teamBacklog: true });

  test("por defecto sigue fallando (no hay carpeta que editar)", () => {
    expect(errorOf(() => resolveWorkspace({ agents: multi.root, email: "luis@mail.com" }))).toContain("solo team-backlog");
    expect(errorOf(() => resolveWorkspace({ agents: multi.root, email: "gersom@mail.com", operator: "luis" }))).toContain("solo team-backlog");
  });

  test("con allowFolderless se resuelve por correo, con su nombre y el team-backlog.md", () => {
    const ws = resolveWorkspace({ agents: multi.root, email: "LUIS@mail.com", allowFolderless: true });
    expect(ws.mode).toBe("multi");
    expect(ws.operator).toEqual({ folder: "luis", source: "email", email: "LUIS@mail.com", ownership: "own", folderless: true });
    expect(ws.files.teamBacklog).toBe(join(multi.agents, "team-backlog.md"));
  });

  test("con --operator también; si el correo es de otro, no es suyo", () => {
    const ws = resolveWorkspace({ agents: multi.root, email: "gersom@mail.com", operator: "luis", allowFolderless: true });
    expect(ws.operator).toMatchObject({ folder: "luis", source: "flag", ownership: "other", folderless: true });
    const unverified = resolveWorkspace({ agents: multi.root, email: null, operator: "luis", allowFolderless: true });
    expect(unverified.operator?.ownership).toBe("unverified");
  });

  test("un operador con carpeta se resuelve igual que sin allowFolderless", () => {
    const strict = resolveWorkspace({ agents: multi.root, email: "gersom@mail.com" });
    expect(resolveWorkspace({ agents: multi.root, email: "gersom@mail.com", allowFolderless: true })).toEqual(strict);
    expect(strict.operator?.folderless).toBeUndefined();
  });
});
