// Sección de la suite en rules.md: el bloque que enseña al agente a usar `acsuite task`, `check` y
// `board` (lo escribe `acsuite init`). Es solo un aviso: un proyecto puede no usar la suite.

import { hasSuiteBlock } from "../../../_shared/rules-block.ts";
import type { Check } from "../types.ts";

/** `rules.md` trae el bloque de agent-context-suite. Si el archivo no existe, no dice nada (lo reporta el check de archivos). */
export const checkSuiteRules: Check = ({ rules }) => {
  if (!rules.exists || hasSuiteBlock(rules.text)) return [];
  return [
    {
      severity: "warning",
      code: "suite-rules",
      file: rules.file,
      line: null,
      message: "rules.md no tiene la sección de agent-context-suite: ejecuta `acsuite init` para que el agente sepa usar la suite.",
    },
  ];
};
