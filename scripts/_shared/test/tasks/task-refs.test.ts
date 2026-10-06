import { describe, expect, test } from "bun:test";
import { findTaskRefs, type TaskIndex } from "../../tasks/task-refs.ts";

const index: TaskIndex = {
  titles: new Map([
    [3, "Exportar como skill"],
    [9, "Preparar fixtures"],
  ]),
  closed: new Set([9]),
  labels: new Set(["Tarea"]),
};

describe("findTaskRefs", () => {
  test("encuentra `<Etiqueta> N` y `T-N`, sin duplicados y en orden", () => {
    const refs = findTaskRefs("depende de la Tarea 3 y de T-12; ver también la Tarea 3.", 4, index);
    expect(refs).toEqual([
      { number: 3, title: "Exportar como skill", closed: false },
      { number: 12, title: null, closed: false },
    ]);
  });

  test("marca las que ya están cerradas en history", () => {
    expect(findTaskRefs("espera la Tarea 9", 4, index)).toEqual([{ number: 9, title: "Preparar fixtures", closed: true }]);
  });

  test("excluye la propia tarea y no confunde números sueltos ni palabras parecidas", () => {
    expect(findTaskRefs("la Tarea 4 espera 3 días; Tareas 5 y Subtarea 6", 4, index)).toEqual([]);
  });

  test("sin texto o sin etiquetas conocidas", () => {
    expect(findTaskRefs(null, 1, index)).toEqual([]);
    expect(findTaskRefs("waits for Task 7 and T-8", 1, { ...index, labels: new Set() })).toEqual([{ number: 8, title: null, closed: false }]);
  });
});
