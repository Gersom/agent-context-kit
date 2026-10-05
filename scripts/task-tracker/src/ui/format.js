// Utilidades de formato para la terminal: texto plano sin markdown, barra de progreso,
// recorte al ancho visible y hora.

const BAR_WIDTH = 12;

/** Quita el formato markdown inline que en la terminal solo ensucia (negritas y backticks). */
export function plainText(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]*)`/g, "$1");
}

/**
 * Barra de progreso `[█████░░░░░░░]`.
 * @param {number} done
 * @param {number} total
 */
export function progressBar(done, total, width = BAR_WIDTH) {
  const filled = total ? Math.round((done / total) * width) : 0;
  return `[${"█".repeat(filled)}${"░".repeat(width - filled)}]`;
}

/**
 * Recorta texto plano (sin códigos de color) a un ancho visible, agregando "…".
 * @param {string} text
 * @param {number} max
 */
export function truncate(text, max) {
  const chars = [...text.replace(/\s*\n\s*/g, " ")];
  if (chars.length <= max) return chars.join("");
  return chars.slice(0, Math.max(1, max - 1)).join("") + "…";
}

/** Hora `HH:MM:SS` para el encabezado. */
export function formatTime(date) {
  return date.toLocaleTimeString("es", { hour12: false });
}
