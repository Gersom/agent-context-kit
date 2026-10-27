// Cómo se informan las rutas inválidas o sin documentación de la skill.

import type { ResolveError } from "../shared/types.ts";

export function printResolveError({ error, tried }: ResolveError): void {
  console.error(error);
  for (const dir of tried) console.error(`  - ${dir}`);
}
