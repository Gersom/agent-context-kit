// Tipos del verificador: el hallazgo que produce cada check y el contexto que reciben. El contexto
// lleva el texto y el parseo de cada archivo ya hechos, así que un check es una función pura
// (`ctx => Finding[]`) que se prueba sin tocar el disco.

import type { ParsedBacklog, ParsedHandoff, ParsedHistory, ParsedTeamBacklog } from "../../_shared/types.ts";
import type { DocKind } from "../../task-manager/src/workspace/docs.ts";

export type Severity = "error" | "warning";

export interface Finding {
  severity: Severity;
  /** Identifica el check (`anchor-missing`, `next-number`...). */
  code: string;
  /** Ruta relativa a la raíz del proyecto, con `/`. */
  file: string;
  /** Línea (1-based) del problema; `null` si es del archivo entero. */
  line: number | null;
  message: string;
}

/** Un archivo del operador ya leído y parseado. Si no existe, `text` está vacío y se parsea como vacío. */
export interface DocInfo<P> {
  kind: DocKind;
  /** Ruta relativa a la raíz del proyecto, con `/` (también si el archivo no existe: dónde debería estar). */
  file: string;
  exists: boolean;
  /** Texto con los finales de línea en LF: el que parsean los parsers y al que apuntan los números de línea. */
  text: string;
  parsed: P;
}

export interface DocSet {
  handoff: DocInfo<ParsedHandoff>;
  backlog: DocInfo<ParsedBacklog>;
  history: DocInfo<ParsedHistory>;
  /** `null` en el repo plano (no hay equipo). */
  teamBacklog: DocInfo<ParsedTeamBacklog> | null;
}

/** `AGENTS.md` o `CLAUDE.md` de la raíz del proyecto. */
export interface RootFileInfo {
  /** Nombre del archivo (es su ruta, porque vive en la raíz). */
  file: string;
  exists: boolean;
  text: string;
}

/** `rules.md` de la carpeta de agentes compartida: su cabecera (donde va el marcador de versión) y el texto completo. */
export interface RulesInfo {
  /** Ruta relativa a la raíz del proyecto, con `/` (también si no existe: dónde debería estar). */
  file: string;
  exists: boolean;
  /** Las primeras líneas del archivo (LF); vacío si no existe. */
  head: string;
  /** El texto completo (LF); vacío si no existe. */
  text: string;
}

/** La carpeta `project/decisions/` (un archivo por tema, con su `README.md` como índice) y los archivos sueltos del formato anterior. */
export interface DecisionsInfo {
  /** Ruta relativa a la raíz del proyecto, con `/` (también si no existe: dónde debería estar). */
  dir: string;
  exists: boolean;
  /** Texto del `README.md` (LF); `null` si no existe. */
  readme: string | null;
  /** Los `.md` de la carpeta salvo `README.md`, ordenados. */
  files: string[];
  /** `decisions.md` y `stack.md` sueltos en `project/` (rutas relativas): formato anterior a la skill 2.0.0. */
  legacy: string[];
}

export interface CheckContext {
  mode: "flat" | "multi";
  docs: DocSet;
  rules: RulesInfo;
  rootFiles: RootFileInfo[];
  decisions: DecisionsInfo;
  /** Ruta relativa de `operators.md`; `null` en el repo plano. */
  operatorsFile: string | null;
  /** Texto de `operators.md` (LF); vacío en el repo plano o si no existe. */
  operatorsText: string;
  /** Avisos de lectura del espacio de trabajo (líneas de operators.md sin leer). */
  operatorWarnings: string[];
}

export type Check = (ctx: CheckContext) => Finding[];
