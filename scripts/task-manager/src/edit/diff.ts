// Diff de líneas en formato unificado simple (`-` quita, `+` agrega, con unas líneas de contexto)
// para el modo `--dry-run`. Compara el texto normalizado a LF, así los finales de línea no ensucian
// el resultado. Funciones puras.

interface Op {
  kind: " " | "-" | "+";
  text: string;
  /** Número de línea (1-based) en el texto anterior; en el nuevo para las `+`. */
  oldLine: number;
  newLine: number;
}

/** Tope de celdas de la tabla LCS: más allá, la zona cambiada se muestra entera como quitada y agregada. */
const MAX_CELLS = 4_000_000;

function toLines(text: string): string[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines[lines.length - 1] === "") lines.pop(); // el salto de línea final no es una línea más
  return lines;
}

/** Operaciones línea a línea que llevan `a` a `b` (prefijo y sufijo comunes recortados antes del LCS). */
function lineOps(a: string[], b: string[]): Op[] {
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;

  const midA = a.slice(head, a.length - tail);
  const midB = b.slice(head, b.length - tail);
  const ops: Op[] = [];
  let oldLine = 1;
  let newLine = 1;
  const push = (kind: Op["kind"], text: string) => {
    ops.push({ kind, text, oldLine, newLine });
    if (kind !== "+") oldLine++;
    if (kind !== "-") newLine++;
  };

  for (let i = 0; i < head; i++) push(" ", a[i]);
  if (midA.length * midB.length > MAX_CELLS) {
    for (const line of midA) push("-", line);
    for (const line of midB) push("+", line);
  } else {
    // LCS por programación dinámica: lcs[i][j] = largo de la subsecuencia común de midA[i..] y midB[j..].
    const cols = midB.length + 1;
    const lcs = new Uint32Array((midA.length + 1) * cols);
    for (let i = midA.length - 1; i >= 0; i--) {
      for (let j = midB.length - 1; j >= 0; j--) {
        lcs[i * cols + j] =
          midA[i] === midB[j] ? lcs[(i + 1) * cols + j + 1] + 1 : Math.max(lcs[(i + 1) * cols + j], lcs[i * cols + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < midA.length && j < midB.length) {
      if (midA[i] === midB[j]) {
        push(" ", midA[i]);
        i++;
        j++;
      } else if (lcs[(i + 1) * cols + j] >= lcs[i * cols + j + 1]) {
        push("-", midA[i++]);
      } else {
        push("+", midB[j++]);
      }
    }
    while (i < midA.length) push("-", midA[i++]);
    while (j < midB.length) push("+", midB[j++]);
  }
  for (let i = a.length - tail; i < a.length; i++) push(" ", a[i]);
  return ops;
}

/**
 * Diff unificado de `before` a `after`, con `context` líneas alrededor de cada cambio. Devuelve
 * las líneas (sin salto de línea final): `@@ -a,b +c,d @@` seguido de líneas con prefijo ` `, `-`
 * o `+`. Vacío si no hay diferencia.
 */
export function unifiedDiff(before: string, after: string, context = 2): string[] {
  const ops = lineOps(toLines(before), toLines(after));
  const changed = ops.flatMap((op, index) => (op.kind === " " ? [] : [index]));
  if (!changed.length) {
    // Mismas líneas pero texto distinto: solo cambió el salto de línea final.
    return before.replace(/\r\n?/g, "\n") === after.replace(/\r\n?/g, "\n") ? [] : ["(solo cambia el salto de línea al final del archivo)"];
  }

  // Cambios separados por no más de `2 * context` líneas iguales van en el mismo bloque.
  const groups: Array<[number, number]> = [];
  for (const index of changed) {
    const last = groups[groups.length - 1];
    if (last && index - last[1] <= 2 * context + 1) last[1] = index;
    else groups.push([index, index]);
  }

  const out: string[] = [];
  for (const [first, last] of groups) {
    const from = Math.max(0, first - context);
    const to = Math.min(ops.length - 1, last + context);
    const slice = ops.slice(from, to + 1);
    const oldCount = slice.filter((op) => op.kind !== "+").length;
    const newCount = slice.filter((op) => op.kind !== "-").length;
    // Con cero líneas de un lado, el inicio es la línea anterior (convención de diff).
    const oldStart = oldCount ? slice.find((op) => op.kind !== "+")!.oldLine : slice[0].oldLine - 1;
    const newStart = newCount ? slice.find((op) => op.kind !== "-")!.newLine : slice[0].newLine - 1;
    out.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`);
    for (const op of slice) out.push(op.kind + op.text);
  }
  return out;
}
