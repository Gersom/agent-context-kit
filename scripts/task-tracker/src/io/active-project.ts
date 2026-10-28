// Proyecto activo: el archivo `active-project.json` que escribe el mod de Claude
// `acsuite-active-project` en la carpeta de config (ver `configDir()`). Formato:
// `{ "path": "<carpeta>", "at": "<fecha ISO>" }`. Nada de acá lanza: un archivo ausente, a medias
// o con otra forma se lee como «sin proyecto activo».

import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { configDir } from "./user-config.ts";

export const ACTIVE_PROJECT_FILE = "active-project.json";

/** El proyecto marcado: su carpeta y el momento (ms desde la época) en que se marcó. */
export interface ActiveProject {
  path: string;
  at: number;
}

/** Ruta del archivo del proyecto activo, dentro de la carpeta de config. */
export function activeProjectPath(): string {
  return join(configDir(), ACTIVE_PROJECT_FILE);
}

/** Borra el archivo del proyecto activo. Ignora cualquier error (no existe, está bloqueado...). */
export function clearActiveProject(): void {
  try {
    rmSync(activeProjectPath(), { force: true });
  } catch {
    // Sin más que hacer: el observador sigue funcionando con un archivo viejo.
  }
}

/**
 * Interpreta el texto de `active-project.json`. Pura y tolerante: quita el BOM y devuelve `null`
 * si el texto está vacío o cortado, no es un objeto, o `path` no es un texto con contenido o `at`
 * no es una fecha válida.
 */
export function parseActiveProject(text: string): ActiveProject | null {
  let data: unknown;
  try {
    // Editores y PowerShell en Windows pueden guardar el JSON con BOM.
    data = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const { path, at } = data as { path?: unknown; at?: unknown };
  if (typeof path !== "string" || path.trim() === "" || typeof at !== "string") return null;
  const time = Date.parse(at);
  return Number.isFinite(time) ? { path, at: time } : null;
}

/** El proyecto activo guardado, o `null` si no hay, no se pudo leer o no tiene la forma esperada. */
export function readActiveProject(): ActiveProject | null {
  try {
    return parseActiveProject(readFileSync(activeProjectPath(), "utf8"));
  } catch {
    return null;
  }
}
