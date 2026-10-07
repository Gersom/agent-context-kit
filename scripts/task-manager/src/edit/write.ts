// Escritura atómica de un archivo: se escribe a un temporal en la misma carpeta y se renombra sobre
// el original, así un corte a mitad de escritura (o el watcher del task-tracker leyendo en ese
// instante) nunca ve un archivo a medio escribir. En Windows el renombrado puede fallar un
// instante si otro proceso tiene el archivo abierto (EBUSY/EPERM/EACCES): se reintenta unas veces
// y, si no se logra, se borra el temporal y se avisa; nunca se recurre a sobrescribir sin atomicidad.

import { renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { CliError } from "../cli/errors.ts";

const RETRYABLE = new Set(["EBUSY", "EPERM", "EACCES"]);
const ATTEMPTS = 5;
const WAIT_MS = 40;

/** Espera síncrona corta entre reintentos (sin ocupar la CPU). */
function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Escribe `content` en `path` de forma atómica (UTF-8, tal cual: no toca finales de línea).
 * @throws CliError si no se pudo escribir o renombrar (el original queda intacto)
 */
export function writeFileAtomic(path: string, content: string): void {
  const temp = join(dirname(path), `.${basename(path)}.${process.pid}.${Date.now().toString(36)}.tmp`);
  try {
    writeFileSync(temp, content, "utf8");
    for (let attempt = 1; ; attempt++) {
      try {
        renameSync(temp, path);
        return;
      } catch (caught) {
        const code = (caught as { code?: string }).code;
        if (!code || !RETRYABLE.has(code) || attempt >= ATTEMPTS) throw caught;
        sleep(WAIT_MS * attempt);
      }
    }
  } catch (caught) {
    rmSync(temp, { force: true });
    throw new CliError(`No se pudo escribir ${basename(path)} (${path}): ${(caught as Error).message}. El archivo original quedó intacto.`);
  }
}
