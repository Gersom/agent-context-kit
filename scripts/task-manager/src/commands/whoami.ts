// `whoami`: muestra qué resolvió el script (operador, carpeta y archivos) sin escribir nada. Sirve
// para comprobar la infraestructura y para saber, antes de editar, sobre qué archivos va a trabajar.

import { existsSync } from "node:fs";
import type { Command } from "../cli/types.ts";

const SOURCE: Record<string, string> = {
  email: "el correo de `git config user.email` cruzado con operators.md",
  flag: "el flag --operator",
  path: "la ruta pasada con --agents (carpeta del operador)",
};

const OWNERSHIP: Record<string, string> = {
  own: "sí (coincide con tu correo de git)",
  other: "no: es la carpeta de otro operador (solo lectura según las reglas del proyecto)",
  unverified: "sin verificar (no se pudo leer `git config user.email`)",
};

export const whoami: Command = {
  name: "whoami",
  summary: "Muestra el operador, su carpeta y los archivos resueltos (solo lectura)",
  usage: "whoami [--agents <ruta>] [--operator <carpeta>]",
  run({ workspace, io }) {
    const ws = workspace();
    io.out(ws.mode === "multi" ? "Modo: multi-operador (hay operators.md)" : "Modo: plano (sin operators.md ni carpetas de operador)");
    io.out(`Proyecto: ${ws.projectDir}`);
    io.out(`Carpeta de agentes: ${ws.agentsRoot}`);
    if (ws.operator) {
      io.out(`Operador: ${ws.operator.folder} (resuelto por ${SOURCE[ws.operator.source]})`);
      io.out(`Correo de git: ${ws.operator.email ?? "(no disponible)"}`);
      io.out(`Carpeta propia: ${OWNERSHIP[ws.operator.ownership]}`);
    }
    io.out(`Carpeta de trabajo: ${ws.dir}`);
    io.out("Archivos:");
    const rows: Array<[string, string]> = [
      ["handoff.md", ws.files.handoff],
      ["backlog.md", ws.files.backlog],
      ["history.md", ws.files.history],
    ];
    if (ws.files.teamBacklog) rows.push(["team-backlog.md", ws.files.teamBacklog]);
    for (const [name, path] of rows) io.out(`  ${name.padEnd(16)}${existsSync(path) ? "existe" : "no existe"}  ${path}`);
    if (ws.mode === "flat") io.out("  (team-backlog.md: no aplica, el repo es plano)");
    for (const warning of ws.warnings) io.out(`Aviso: ${warning}`);
  },
};
