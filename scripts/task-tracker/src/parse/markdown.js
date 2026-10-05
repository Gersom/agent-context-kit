// Utilidades de markdown compartidas por el parseo de handoff.md y backlog.md: comentarios
// HTML y placeholders de plantilla. Funciones puras sobre strings.

const PLACEHOLDER_RE = /\[Placeholder/i;

/**
 * Quita los comentarios HTML (inline y multilínea). Un comentario sin cerrar se descarta
 * hasta el final del texto.
 * @param {string} text
 * @returns {string}
 */
export function stripComments(text) {
  return text.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
}

/** @param {string} value */
export function isPlaceholder(value) {
  return PLACEHOLDER_RE.test(value ?? "");
}

/** Estado "dentro de un comentario HTML" al terminar la línea. */
export function commentStateAfter(line, inComment) {
  let pos = 0;
  let state = inComment;
  while (pos < line.length) {
    if (state) {
      const close = line.indexOf("-->", pos);
      if (close === -1) return true;
      state = false;
      pos = close + 3;
    } else {
      const open = line.indexOf("<!--", pos);
      if (open === -1) return false;
      state = true;
      pos = open + 4;
    }
  }
  return state;
}
