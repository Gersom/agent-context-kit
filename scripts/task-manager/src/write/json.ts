// `--json` de los comandos que escriben: en vez del diff y los avisos, un objeto con lo que pasó
// (si se escribió, qué archivos cambian) y los datos propios del comando.

import type { ChangeResult } from "../edit/changes.ts";
import { emitJson, relFile } from "../query/format.ts";
import type { CommandContext, FlagSpec } from "../cli/types.ts";

export const JSON_FLAG: FlagSpec = {
  type: "boolean",
  description: "Salida estructurada (JSON) en vez del diff y los mensajes: dice si se escribió y qué cambió.",
};

/**
 * Imprime el resultado de un comando de escritura.
 * `applied`: se escribió al menos un archivo. `pending`: había cambios y falta `--apply` para escribirlos.
 */
export function emitWriteJson(ctx: CommandContext, command: string, result: ChangeResult, data: Record<string, unknown>): void {
  const ws = ctx.workspace({ allowFolderless: true });
  const changed = result.files.some((file) => file.changed);
  emitJson(ctx.io, command, {
    applied: result.files.some((file) => file.written),
    dryRun: ctx.global.dryRun,
    pending: changed && !result.files.some((file) => file.written) && !ctx.global.dryRun,
    files: result.files.map((file) => ({ file: relFile(ws, file.path), changed: file.changed, written: file.written })),
    ...data,
  });
}
