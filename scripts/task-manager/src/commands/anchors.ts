// `anchors`: comprueba que cada archivo tenga las anclas de sección que necesita el parseo
// (`<!-- agent-context-kit:section=... -->`), que es lo que permite editar sin depender del idioma
// de los headers. No escribe nada. Sale con código 1 si falta alguna ancla o sección.

import type { Section } from "../../../_shared/types.ts";
import type { Command } from "../cli/types.ts";
import { DOC_SECTIONS, type Doc } from "../workspace/docs.ts";

/** Lo que se lee de un archivo ya parseado: secciones (handoff, backlog, team-backlog) o entradas (history). */
interface ParsedShape {
  sections?: Record<string, Section>;
  entries?: unknown[];
}

/** Líneas del informe de un archivo y cuántos problemas tiene. */
function checkDoc(doc: Doc<unknown>): { lines: string[]; problems: number } {
  const parsed = doc.parsed as ParsedShape;
  const lines = [`${doc.fileName}  (${doc.path})`];
  if (!doc.exists) {
    lines.push("  no existe (opcional según el set de archivos; este script no lo crea)");
    return { lines, problems: 0 };
  }
  const ids = DOC_SECTIONS[doc.kind];
  if (!ids.length) {
    lines.push(`  no usa anclas: sus entradas son los headers \`## \` (${parsed.entries?.length ?? 0} entradas leídas)`);
    return { lines, problems: 0 };
  }
  let problems = 0;
  for (const id of ids) {
    const section = parsed.sections?.[id];
    let status: string;
    if (!section) {
      status = "NO SE ENCONTRÓ la sección";
      problems++;
    } else if (!section.anchorRange) {
      status = "SIN ANCLA (ubicada por orden, plan B)";
      problems++;
    } else {
      status = `ok (ancla en la línea ${section.anchorRange.startLine})`;
    }
    lines.push(`  ${id.padEnd(12)}${status}`);
  }
  return { lines, problems };
}

export const anchors: Command = {
  name: "anchors",
  summary: "Verifica que cada archivo tenga sus anclas de sección (solo lectura)",
  usage: "anchors [--agents <ruta>] [--operator <carpeta>]",
  run({ docs, io }) {
    const all = docs();
    const targets = [all.handoff, all.backlog, all.history, ...(all.teamBacklog ? [all.teamBacklog] : [])];
    let problems = 0;
    for (const doc of targets) {
      const result = checkDoc(doc);
      result.lines.forEach((line) => io.out(line));
      problems += result.problems;
    }
    if (problems) {
      io.out("");
      io.out(`${problems} problema(s): sin anclas el script no edita con seguridad. Agrégalas con el skill (al actualizar el archivo) o a mano.`);
      return 1;
    }
    io.out("");
    io.out("Todas las anclas están en su lugar.");
  },
};
