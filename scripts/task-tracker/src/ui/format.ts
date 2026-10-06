// Utilidades de formato para la terminal: texto plano sin markdown, barra de progreso, recorte
// al ancho visible, nombres cortos de tarea y del proyecto. La hora vive en src/shared/time.ts
// (también la usa io/).

const BAR_WIDTH = 12;

/** Quita el formato markdown inline que en la terminal solo ensucia (negritas y backticks). */
export function plainText(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]*)`/g, "$1");
}

/** Barra de progreso `[█████░░░░░░░]`. */
export function progressBar(done: number, total: number, width = BAR_WIDTH): string {
  const filled = total ? Math.round((done / total) * width) : 0;
  return `[${"█".repeat(filled)}${"░".repeat(width - filled)}]`;
}

/** Recorta texto plano (sin códigos de color) a un ancho visible, agregando "…". */
export function truncate(text: string, max: number): string {
  const flat = text.replace(/\s*\n\s*/g, " ");
  if (visibleLength(flat) <= max) return flat;
  const room = Math.max(1, max - 1);
  let out = "";
  let used = 0;
  for (const char of flat) {
    const w = visibleLength(char);
    if (used + w > room) break;
    out += char;
    used += w;
  }
  return out + "…";
}

/**
 * Columnas que ocupa un texto en la terminal: ignora los códigos ANSI de color y cuenta los
 * caracteres anchos (ej. CJK) como 2, con `Bun.stringWidth`.
 */
export function visibleLength(text: string): number {
  return Bun.stringWidth(text);
}

/** Nombre del proyecto para el encabezado: en mayúsculas y con los guiones como espacios. */
export function displayProjectName(folderName: string): string {
  return folderName.toUpperCase().replace(/-/g, " ");
}

/** Forma corta de una tarea en las listas compactas: `T-4: título` (o `T-4` sin título). */
export function shortTaskName(number: number, title: string | null): string {
  return title ? `T-${number}: ${title}` : `T-${number}`;
}
