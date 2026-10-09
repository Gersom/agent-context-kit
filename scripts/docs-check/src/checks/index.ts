// Registro de checks: uno por familia, todos puros (`ctx => Finding[]`). Para agregar uno, créalo en
// su archivo y súmalo a `CHECKS`.

import type { Check, CheckContext, Finding } from "../types.ts";
import { checkAnchors } from "./anchors.ts";
import { checkFilesExist, checkOperatorsReadable, checkRootFiles } from "./files.ts";
import { checkCurrentTask } from "./handoff.ts";
import { checkHistoryEntries } from "./history.ts";
import { checkPlaceholders } from "./placeholders.ts";
import { checkBlockTags, checkDuplicateNumbers, checkNextNumber, checkTaskFields, checkTaskHeadings } from "./tasks.ts";

export const CHECKS: Check[] = [
  checkFilesExist,
  checkOperatorsReadable,
  checkRootFiles,
  checkAnchors,
  checkPlaceholders,
  checkNextNumber,
  checkDuplicateNumbers,
  checkTaskHeadings,
  checkTaskFields,
  checkBlockTags,
  checkCurrentTask,
  checkHistoryEntries,
];

/** Corre todos los checks sobre el contexto. El orden no importa: el reporte ordena. */
export function runChecks(ctx: CheckContext): Finding[] {
  return CHECKS.flatMap((check) => check(ctx));
}

export { checkRootFiles };
