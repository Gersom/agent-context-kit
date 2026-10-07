// Teclas de la terminal interactiva: `q` o Ctrl+C salen, `r` redibuja, `c` compacta o expande los
// recuadros y `f` oculta o muestra las flechas del flujo. En la vista de equipo (modo
// multi-operador), ↑/↓ eligen operador, Enter lo abre y `b`, Esc o Retroceso vuelven.

export type NavKey = "quit" | "redraw" | "up" | "down" | "enter" | "back" | "compact" | "flow";

/**
 * Teclas de lo que llegó de la terminal en modo raw. Las flechas llegan como secuencias de varios
 * caracteres (`ESC [ A`, o `ESC O A` en algunas terminales); un Esc suelto (sin nada después) es
 * "volver". Las secuencias que no se conocen (otras teclas especiales) se ignoran enteras.
 */
export function parseKeys(chunk: string): NavKey[] {
  const keys: NavKey[] = [];
  for (let i = 0; i < chunk.length; i++) {
    const char = chunk[i];
    if (char === "\u001b") {
      const next = chunk[i + 1];
      if (next !== "[" && next !== "O") {
        keys.push("back");
        continue;
      }
      let end = i + 2;
      while (end < chunk.length && !/[@-~]/.test(chunk[end])) end++;
      const final = chunk[end];
      if (final === "A") keys.push("up");
      else if (final === "B") keys.push("down");
      i = end;
      continue;
    }
    const key = singleKey(char);
    if (key) keys.push(key);
  }
  return keys;
}

function singleKey(char: string): NavKey | null {
  if (char === "\u0003" || char === "q" || char === "Q") return "quit";
  if (char === "r" || char === "R") return "redraw";
  if (char === "c" || char === "C") return "compact";
  if (char === "f" || char === "F") return "flow";
  if (char === "\r" || char === "\n") return "enter";
  if (char === "b" || char === "B" || char === "\u007f" || char === "\b") return "back";
  return null;
}
