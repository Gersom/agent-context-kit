import { describe, expect, test } from "bun:test";
import { editLine } from "../../src/cli/line-edit.ts";

describe("editLine", () => {
  test("agrega lo escrito, también las letras que son atajos, y un pegado entero", () => {
    expect(editLine("", "qrbpa")).toEqual({ text: "qrbpa", done: null });
    expect(editLine("D:", "/repos/app")).toEqual({ text: "D:/repos/app", done: null });
  });

  test("Retroceso borra el último carácter (sin pasar de vacío)", () => {
    expect(editLine("ab", "\u007f")).toEqual({ text: "a", done: null });
    expect(editLine("a", "\b\u007f")).toEqual({ text: "", done: null });
  });

  test("Enter termina conservando el texto, y lo que venga después no se aplica", () => {
    expect(editLine("ab", "c\rzz")).toEqual({ text: "abc", done: "submit" });
    expect(editLine("", "\n")).toEqual({ text: "", done: "submit" });
  });

  test("Esc suelto cancela; las flechas y otras secuencias se ignoran enteras", () => {
    expect(editLine("ab", "\u001b").done).toBe("cancel");
    expect(editLine("ab", "\u001b[A\u001b[Bc")).toEqual({ text: "abc", done: null });
    expect(editLine("ab", "\u001bOAx")).toEqual({ text: "abx", done: null });
  });

  test("los demás caracteres de control se ignoran", () => {
    expect(editLine("a", "\t\u0001b")).toEqual({ text: "ab", done: null });
  });
});

describe("editLine: casos extra", () => {
  test("Retroceso borra un carácter fuera del BMP entero", () => {
    expect(editLine("a😀", "\u007f")).toEqual({ text: "a", done: null });
  });

  test("un pegado con salto de línea termina en el primero", () => {
    expect(editLine("", "uno\ndos")).toEqual({ text: "uno", done: "submit" });
  });

  test("Esc seguido de una letra (Alt+tecla) cancela", () => {
    expect(editLine("ab", "\u001bx").done).toBe("cancel");
  });
});
