// Carpeta `project/decisions/` (un archivo por tema): su `README.md` es el índice con una línea por
// tema (`- [tema.md](./tema.md) — cuándo leerlo`). El agente elige el archivo a leer por ese índice,
// así que tiene que listar todos los archivos de la carpeta y no apuntar a ninguno que no exista.
// Los `decisions.md` y `stack.md` sueltos son del formato anterior a la skill 2.0.0.

import { proseLines } from "../lines.ts";
import type { Check, Finding } from "../types.ts";

/** Elemento de lista con un enlace a un `.md` local: el grupo 1 es la ruta (sin `./` ni ancla). */
const INDEX_ITEM_RE = /^\s*[-*]\s+\[[^\]]+\]\((?:\.\/)?([^)#\s/]+\.md)(?:#[^)]*)?\)/;

export const README_NAME = "README.md";

export const checkDecisionsIndex: Check = ({ decisions }) => {
  const findings: Finding[] = [];
  const warn = (code: string, file: string, line: number | null, message: string) => findings.push({ severity: "warning", code, file, line, message });

  for (const legacy of decisions.legacy) {
    warn("decisions-legacy", legacy, null, `Es del formato anterior a la skill 2.0.0: muévelo a \`${decisions.dir}/\` (un archivo por tema) y lístalo en su ${README_NAME}.`);
  }
  if (!decisions.exists) return findings;

  if (decisions.readme === null) {
    warn("decisions-index", decisions.dir, null, `La carpeta no tiene ${README_NAME}, el índice con el que el agente elige qué tema leer: créalo desde la plantilla de la skill.`);
    return findings;
  }

  const readmeFile = `${decisions.dir}/${README_NAME}`;
  const listed = new Map<string, number>();
  for (const line of proseLines(decisions.readme)) {
    const match = line.visible.match(INDEX_ITEM_RE);
    if (match && !listed.has(match[1])) listed.set(match[1], line.n);
  }
  for (const file of decisions.files) {
    if (!listed.has(file)) {
      warn("decisions-index", readmeFile, null, `«${file}» no figura en el índice: agrega una línea \`- [${file}](./${file}) — cuándo leerlo\`.`);
    }
  }
  for (const [file, n] of listed) {
    if (file !== README_NAME && !decisions.files.includes(file)) {
      warn("decisions-index", readmeFile, n, `El índice enlaza a «${file}», que no existe en la carpeta: quita la línea o crea el archivo.`);
    }
  }
  return findings;
};
