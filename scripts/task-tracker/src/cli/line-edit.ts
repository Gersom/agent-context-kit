// Edición de una línea de texto en la terminal en modo raw (la ruta de un repo que se agrega a la
// lista de proyectos). Es una función pura de texto y bytes recibidos, sin pantalla, para poder
// probarla sola. Mientras se escribe, todas las letras son texto (también `q`, `r`, `b`, `p`...).

export interface LineEdit {
  text: string;
  /** `submit`: Enter; `cancel`: Esc suelto. `null`: se sigue escribiendo. */
  done: "submit" | "cancel" | null;
}

/**
 * Aplica lo que llegó de la terminal a la línea: los caracteres imprimibles se agregan (un pegado
 * llega como un solo bloque), Retroceso borra el último carácter, Enter termina y un Esc suelto cancela.
 * Las secuencias de teclas especiales (flechas, etc.) y los demás caracteres de control se ignoran.
 */
export function editLine(text: string, chunk: string): LineEdit {
  let current = text;
  for (let i = 0; i < chunk.length; i++) {
    const char = chunk[i];
    if (char === "\u001b") {
      const next = chunk[i + 1];
      if (next !== "[" && next !== "O") return { text: current, done: "cancel" };
      let end = i + 2;
      while (end < chunk.length && !/[@-~]/.test(chunk[end])) end++;
      i = end;
    } else if (char === "\r" || char === "\n") {
      return { text: current, done: "submit" };
    } else if (char === "\u007f" || char === "\b") {
      current = Array.from(current).slice(0, -1).join("");
    } else if (char >= " ") {
      current += char;
    }
  }
  return { text: current, done: null };
}
