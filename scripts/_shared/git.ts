// Git: la raíz del repo que contiene una carpeta. Compartido por `board`, `task` y `check` para
// decidir qué proyecto usar cuando no se les pasa una ruta.

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

/** Raíz del repo git que contiene `dir`, o `dir` si no está en un repo (o git no responde). */
export function gitToplevel(dir: string): string {
  try {
    const out = spawnSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], { encoding: "utf8", timeout: 5000 });
    const top = out.status === 0 ? out.stdout.trim() : "";
    return top ? resolve(top) : dir;
  } catch {
    return dir;
  }
}
