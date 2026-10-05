// Utilidades de formato para la terminal: texto plano sin markdown, barra de progreso y
// recorte al ancho visible. La hora vive en src/shared/time.ts (también la usa io/).

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
  const chars = [...text.replace(/\s*\n\s*/g, " ")];
  if (chars.length <= max) return chars.join("");
  return chars.slice(0, Math.max(1, max - 1)).join("") + "…";
}
