// Verificación posterior a editar: el texto resultante se vuelve a parsear y se comprueba que no
// se rompió la estructura que leen el task-tracker y este script (secciones y anclas). Solo cuentan
// las REGRESIONES: lo que ya estaba mal antes de editar (ej. un archivo sin anclas) no impide
// editarlo, pero editar no puede empeorarlo.

import { normalizeEol } from "../../../_shared/parse/positions.ts";
import { findSections } from "../../../_shared/parse/sections.ts";
import type { DocKind } from "../workspace/docs.ts";
import { DOC_SECTIONS } from "../workspace/docs.ts";

/**
 * Problemas que introduce la edición, en español (lista vacía = sigue legible).
 * @param kind qué archivo es (decide qué secciones se esperan)
 * @param before texto crudo antes de editar
 * @param after texto crudo resultante
 */
export function readabilityProblems(kind: DocKind, before: string, after: string): string[] {
  const ids = DOC_SECTIONS[kind];
  if (!ids.length) return []; // history.md no usa anclas: sus entradas son los `## `
  const old = findSections(normalizeEol(before).text, ids);
  const next = findSections(normalizeEol(after).text, ids);
  const problems: string[] = [];

  if (!old.usedFallback && next.usedFallback) {
    problems.push("el archivo quedó sin anclas de sección (el parseo cae al plan B por orden)");
  }
  for (const id of ids) {
    const was = old.sections[id];
    const now = next.sections[id];
    if (was && !now) problems.push(`la sección «${id}» ya no se encuentra`);
    else if (was?.anchorRange && now && !now.anchorRange) problems.push(`se perdió el ancla de la sección «${id}»`);
  }
  return problems;
}
