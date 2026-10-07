// Regla de los comandos que escriben: solo se edita la carpeta propia. Las carpetas de otros
// operadores son de solo lectura (docs/agents/rules.md, «Trabajo en paralelo»).

import { CliError } from "../cli/errors.ts";
import type { Workspace } from "./workspace.ts";

/**
 * Comprueba que la carpeta resuelta es la del operador actual (la del correo de `git config
 * user.email`). En el repo plano no hay otros operadores, así que siempre se puede escribir.
 * @throws CliError si es la carpeta de otro operador, o si no se pudo verificar de quién es; el
 *   mensaje dice qué hacer. No escribe nada.
 */
export function requireOwnFolder(workspace: Pick<Workspace, "operator">): void {
  const operator = workspace.operator;
  if (!operator || operator.ownership === "own") return;
  if (operator.ownership === "unverified") {
    throw new CliError(
      `No se pudo verificar que la carpeta «${operator.folder}» sea la tuya (no se pudo leer \`git config user.email\`): los comandos que escriben solo editan la carpeta propia. Configura tu correo con \`git config user.email\` y vuelve a intentarlo. No se escribió nada.`,
    );
  }
  throw new CliError(
    `La carpeta «${operator.folder}» no es la tuya (${operator.email ?? "tu correo de git"} no figura con esa carpeta en operators.md): las carpetas de otros operadores son de solo lectura. No se escribió nada.`,
  );
}
