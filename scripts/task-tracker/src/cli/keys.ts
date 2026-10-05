// Atajos de teclado de la terminal interactiva: `q` o Ctrl+C salen, `r` redibuja.

export type KeyAction = "quit" | "redraw" | null;

/** Acción de una tecla recibida en modo raw (un solo carácter). */
export function keyAction(key: string): KeyAction {
  if (key === "\u0003" || key === "q" || key === "Q") return "quit";
  if (key === "r" || key === "R") return "redraw";
  return null;
}
