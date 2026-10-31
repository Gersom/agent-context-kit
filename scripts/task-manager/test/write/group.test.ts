// Formar un grupo, sacar una tarea de él, sumarle tareas libres, cambiar su título o resumen y deshacerlo: ediciones exactas sobre textos en memoria
// (nunca se tocan los docs reales). Los backlogs se arman con `backlogOf` para que la entrada y el
// resultado esperado se lean lado a lado.

import { describe, expect, test } from "bun:test";
import { parseBacklog } from "../../../_shared/parse/backlog.ts";
import { normalizeEol } from "../../../_shared/parse/positions.ts";
import type { ParsedBacklog } from "../../../_shared/types.ts";
import { CliError } from "../../src/cli/errors.ts";
import { applyEdits, type Edit } from "../../src/edit/edits.ts";
import { addTasks, createGroup, dissolveGroup, editGroup, ejectTask, findGroupOf, groupLabels } from "../../src/write/group.ts";
import { STRINGS } from "../../src/write/language.ts";
import type { Doc } from "../../src/workspace/docs.ts";
import { BACKLOG_RICH } from "../fixtures.ts";

const S = STRINGS.es;

function docOf(text: string): Doc<ParsedBacklog> {
  const eol = normalizeEol(text);
  return { kind: "backlog", fileName: "backlog.md", path: "backlog.md", exists: true, raw: text, eol, text: eol.text, parsed: parseBacklog(eol.text) };
}

const apply = (doc: Doc<ParsedBacklog>, edits: Edit[]) => applyEdits(doc.raw, doc.eol, edits);

/** Falla si no lanza un `CliError` cuyo mensaje contiene `message`. */
function expectError(fn: () => unknown, message: string): void {
  expect(fn).toThrow(CliError);
  expect(fn).toThrow(message);
}

// Piezas: una tarea libre (`###`) o agrupada (`####`), la referencia de un grupo y su contenedor.
const task = (n: number, level: "###" | "####" = "###") => `${level} Tarea ${n} — Título ${n}\n\n- **Descripción:** texto ${n}.`;
const referenceWith = (title: string, numbers: number[], summary: string) => `### Grupo — ${title} (Tareas ${numbers.join(", ")})\n\n- **Resumen:** ${summary}`;
const reference = (title: string, numbers: number[]) => referenceWith(title, numbers, `resumen de ${title}.`);
const container = (title: string, numbers: number[]) => [`### Grupo — ${title}`, ...numbers.map((n) => task(n, "####"))].join("\n\n");
const join = (...blocks: string[]) => blocks.join("\n\n");

/** Un backlog con las tres secciones; la bloqueada es siempre la Tarea 6. */
function backlogOf(free: string, grouped: string): string {
  return `# Backlog

**Próximo número de tarea:** 40

---

<!-- agent-context-skill:section=free -->
## Tareas libres

${free}

<!-- agent-context-skill:section=blocked -->
## Tareas bloqueadas / pospuestas

### Tarea 6 — Bloqueada

- **Bloqueos:** \`[dependencia]\` depende de la Tarea 11.

<!-- agent-context-skill:section=grouped -->
## Tareas agrupadas

${grouped}
`;
}

describe("findGroupOf", () => {
  test("identifica el grupo por cualquiera de sus tareas, con su contenedor y su referencia", () => {
    const doc = docOf(BACKLOG_RICH);
    for (const number of [14, 15]) {
      const at = findGroupOf(doc, number)!;
      expect(at.container.title).toBe("Documentar los planes");
      expect(at.container.tasks.map((t) => t.number)).toEqual([14, 15]);
      expect(at.reference.taskNumbers).toEqual([14, 15]);
    }
  });

  test("una tarea que no está agrupada (libre, bloqueada, inexistente) no tiene grupo", () => {
    const doc = docOf(BACKLOG_RICH);
    for (const number of [1, 6, 99]) expect(findGroupOf(doc, number)).toBeNull();
  });

  test("un contenedor sin referencia en «libres» es un error", () => {
    const doc = docOf(backlogOf(task(1), container("Huérfano", [14, 15])));
    expectError(() => findGroupOf(doc, 14), "no tiene su referencia");
  });
});

describe("ejectTask", () => {
  test("de un grupo de 3 a 2: la tarea pasa al final de «libres» y sale de la lista de la referencia", () => {
    const doc = docOf(backlogOf(join(task(1), reference("Planes", [14, 15, 16]), task(20)), container("Planes", [14, 15, 16])));
    expect(apply(doc, ejectTask(doc, 15, S))).toBe(
      backlogOf(join(task(1), reference("Planes", [14, 16]), task(20), task(15)), container("Planes", [14, 16])),
    );
  });

  test("sacar la primera o la última tarea del contenedor no deja huecos", () => {
    const doc = docOf(backlogOf(join(task(1), reference("Planes", [14, 15, 16])), container("Planes", [14, 15, 16])));
    expect(apply(doc, ejectTask(doc, 14, S))).toBe(backlogOf(join(task(1), reference("Planes", [15, 16]), task(14)), container("Planes", [15, 16])));
    expect(apply(doc, ejectTask(doc, 16, S))).toBe(backlogOf(join(task(1), reference("Planes", [14, 15]), task(16)), container("Planes", [14, 15])));
  });

  test("de 2 a 1: el grupo se desarma, la restante pasa a «libres» tras la sacada y «agrupadas» queda vacía", () => {
    const doc = docOf(backlogOf(join(task(1), reference("Planes", [14, 15]), task(18)), container("Planes", [14, 15])));
    expect(apply(doc, ejectTask(doc, 14, S))).toBe(backlogOf(join(task(1), task(18), task(14), task(15)), "No aplica todavía — ningún grupo formado."));
    expect(apply(doc, ejectTask(doc, 15, S))).toBe(backlogOf(join(task(1), task(18), task(15), task(14)), "No aplica todavía — ningún grupo formado."));
  });

  test("al desarmar con la referencia como último bloque de «libres», las tareas ocupan su lugar; los otros grupos quedan", () => {
    const doc = docOf(
      backlogOf(
        join(task(1), reference("Otro", [30, 31, 32]), reference("Planes", [14, 15])),
        join(container("Otro", [30, 31, 32]), container("Planes", [14, 15])),
      ),
    );
    expect(apply(doc, ejectTask(doc, 15, S))).toBe(
      backlogOf(join(task(1), reference("Otro", [30, 31, 32]), task(15), task(14)), container("Otro", [30, 31, 32])),
    );
  });

  test("al desarmar el primer contenedor, la referencia en medio de «libres» sale y las tareas van al final", () => {
    const doc = docOf(
      backlogOf(
        join(reference("Planes", [14, 15]), reference("Otro", [30, 31, 32])),
        join(container("Planes", [14, 15]), container("Otro", [30, 31, 32])),
      ),
    );
    expect(apply(doc, ejectTask(doc, 15, S))).toBe(
      backlogOf(join(reference("Otro", [30, 31, 32]), task(15), task(14)), container("Otro", [30, 31, 32])),
    );
  });

  test("de 1 a 0: solo se elimina el grupo y la tarea sacada pasa a «libres»", () => {
    const doc = docOf(backlogOf(join(task(1), reference("Planes", [14])), container("Planes", [14])));
    expect(apply(doc, ejectTask(doc, 14, S))).toBe(backlogOf(join(task(1), task(14)), "No aplica todavía — ningún grupo formado."));
  });

  test("con el fixture real (BACKLOG_RICH) el resultado vuelve a parsearse sin grupos", () => {
    const doc = docOf(BACKLOG_RICH);
    const parsed = parseBacklog(apply(doc, ejectTask(doc, 14, S)));
    expect(parsed.free.tasks.map((t) => t.number)).toEqual([1, 3, 18, 14, 15]);
    expect(parsed.free.groups).toEqual([]);
    expect(parsed.grouped).toEqual([]);
  });

  test("conserva el final de línea CRLF del archivo", () => {
    const doc = docOf(backlogOf(join(task(1), reference("Planes", [14, 15, 16])), container("Planes", [14, 15, 16])).replace(/\n/g, "\r\n"));
    const expected = backlogOf(join(task(1), reference("Planes", [14, 16]), task(15)), container("Planes", [14, 16]));
    expect(apply(doc, ejectTask(doc, 15, S))).toBe(expected.replace(/\n/g, "\r\n"));
  });

  test("una tarea que no está agrupada (libre, bloqueada, inexistente) es un error", () => {
    const doc = docOf(backlogOf(join(task(1), reference("Planes", [14, 15])), container("Planes", [14, 15])));
    for (const number of [1, 6, 99]) expectError(() => ejectTask(doc, number, S), `La Tarea ${number} no está en «Tareas agrupadas»`);
  });
});

describe("addTasks", () => {
  const free = join(task(1), reference("Planes", [14, 15]), task(18), task(20));
  const grouped = container("Planes", [14, 15]);

  test("mueve las tareas al final del contenedor y las suma a la referencia, sin tocar el Resumen", () => {
    const doc = docOf(backlogOf(free, grouped));
    expect(apply(doc, addTasks(doc, 14, [18, 20], S))).toBe(backlogOf(join(task(1), reference("Planes", [14, 15, 18, 20])), container("Planes", [14, 15, 18, 20])));
  });

  test("el orden de las nuevas es el pedido; las libres que quedan no dejan huecos", () => {
    const doc = docOf(backlogOf(free, grouped));
    expect(apply(doc, addTasks(doc, 15, [20, 1], S))).toBe(
      backlogOf(join(reference("Planes", [14, 15, 20, 1]), task(18)), container("Planes", [14, 15, 20, 1])),
    );
  });

  test("con otro grupo después en «agrupadas», las tareas entran al final de su contenedor", () => {
    const doc = docOf(backlogOf(join(reference("Planes", [14, 15]), reference("Otro", [30, 31]), task(18)), join(container("Planes", [14, 15]), container("Otro", [30, 31]))));
    expect(apply(doc, addTasks(doc, 14, [18], S))).toBe(
      backlogOf(join(reference("Planes", [14, 15, 18]), reference("Otro", [30, 31])), join(container("Planes", [14, 15, 18]), container("Otro", [30, 31]))),
    );
  });

  test("errores: ya agrupada, repetida, bloqueada, inexistente, sin tareas y grupo que no existe", () => {
    const doc = docOf(backlogOf(free, grouped));
    expectError(() => addTasks(doc, 14, [15], S), "La Tarea 15 ya está en el grupo «Planes»");
    expectError(() => addTasks(doc, 14, [18, 18], S), "La Tarea 18 está repetida");
    expectError(() => addTasks(doc, 14, [6], S), "La Tarea 6 está en «Tareas bloqueadas / pospuestas»");
    expectError(() => addTasks(doc, 14, [99], S), "La Tarea 99 no figura en «Tareas libres»");
    expectError(() => addTasks(doc, 14, [], S), "Indica al menos una tarea libre");
    expectError(() => addTasks(doc, 1, [18], S), "La Tarea 1 no está en «Tareas agrupadas»");
  });
});

describe("createGroup", () => {
  const EMPTY = "No aplica todavía — ningún grupo formado.";
  const resumen = (title: string) => `resumen de ${title}.`;

  test("con 2 tareas del medio de «libres»: salen, la referencia va al final y «agrupadas» deja de estar vacía", () => {
    const doc = docOf(backlogOf(join(task(1), task(14), task(15), task(20)), EMPTY));
    expect(apply(doc, createGroup(doc, [14, 15], "Planes", resumen("Planes"), S))).toBe(
      backlogOf(join(task(1), task(20), reference("Planes", [14, 15])), container("Planes", [14, 15])),
    );
  });

  test("con 3 tareas separadas: el contenedor las trae como `####` y la referencia lista los números", () => {
    const doc = docOf(backlogOf(join(task(1), task(12), task(18), task(23), task(32)), EMPTY));
    expect(apply(doc, createGroup(doc, [12, 23, 32], "Docs", resumen("Docs"), S))).toBe(
      backlogOf(join(task(1), task(18), reference("Docs", [12, 23, 32])), container("Docs", [12, 23, 32])),
    );
  });

  test("el orden de las tareas es el de `numbers`, no el del archivo", () => {
    const doc = docOf(backlogOf(join(task(1), task(18), task(20)), EMPTY));
    expect(apply(doc, createGroup(doc, [20, 1], "Planes", resumen("Planes"), S))).toBe(
      backlogOf(join(task(18), reference("Planes", [20, 1])), container("Planes", [20, 1])),
    );
  });

  test("si las últimas de «libres» son las quitadas, la referencia ocupa su lugar", () => {
    const doc = docOf(backlogOf(join(task(1), task(18), task(14), task(15)), EMPTY));
    expect(apply(doc, createGroup(doc, [15, 14], "Planes", resumen("Planes"), S))).toBe(
      backlogOf(join(task(1), task(18), reference("Planes", [15, 14])), container("Planes", [15, 14])),
    );
    // también si hay quitadas más arriba, separadas de las del final
    expect(apply(doc, createGroup(doc, [1, 15], "Planes", resumen("Planes"), S))).toBe(
      backlogOf(join(task(18), task(14), reference("Planes", [1, 15])), container("Planes", [1, 15])),
    );
  });

  test("agrupando todas las libres, «libres» queda solo con la referencia", () => {
    const doc = docOf(backlogOf(join(task(1), task(18)), EMPTY));
    expect(apply(doc, createGroup(doc, [1, 18], "Todo", resumen("Todo"), S))).toBe(backlogOf(reference("Todo", [1, 18]), container("Todo", [1, 18])));
  });

  test("con otro grupo ya formado: el contenedor va al final de «agrupadas» y la referencia al final de «libres»", () => {
    const doc = docOf(backlogOf(join(reference("Otro", [30, 31]), task(18), task(20)), container("Otro", [30, 31])));
    expect(apply(doc, createGroup(doc, [18, 20], "Planes", resumen("Planes"), S))).toBe(
      backlogOf(join(reference("Otro", [30, 31]), reference("Planes", [18, 20])), join(container("Otro", [30, 31]), container("Planes", [18, 20]))),
    );
  });

  test("con otro grupo ya formado en medio de «libres»", () => {
    const doc = docOf(backlogOf(join(task(18), reference("Otro", [30, 31]), task(20), task(21)), container("Otro", [30, 31])));
    expect(apply(doc, createGroup(doc, [18, 21], "Planes", resumen("Planes"), S))).toBe(
      backlogOf(join(reference("Otro", [30, 31]), task(20), reference("Planes", [18, 21])), join(container("Otro", [30, 31]), container("Planes", [18, 21]))),
    );
  });

  test("copia las palabras del grupo que el archivo ya tiene; sin grupos usa la tabla del idioma", () => {
    const english = "### Group — Other (Tasks 30, 31)\n\n- **Summary:** other.";
    const englishContainer = `### Group — Other\n\n${task(30, "####")}\n\n${task(31, "####")}`;
    const doc = docOf(backlogOf(join(english, task(18), task(20)), englishContainer));
    expect(groupLabels(doc, S)).toEqual({ group: "Group", summary: "Summary", tasks: "Tasks" });
    expect(apply(doc, createGroup(doc, [18, 20], "Plans", "plans.", S))).toBe(
      backlogOf(
        join(english, "### Group — Plans (Tasks 18, 20)\n\n- **Summary:** plans."),
        `${englishContainer}\n\n### Group — Plans\n\n${task(18, "####")}\n\n${task(20, "####")}`,
      ),
    );

    const bare = docOf(backlogOf(join(task(18), task(20)), EMPTY));
    expect(groupLabels(bare, S)).toEqual({ group: "Grupo", summary: "Resumen", tasks: "Tareas" });
    expect(apply(bare, createGroup(bare, [18, 20], "Plans", "plans.", STRINGS.en))).toBe(
      backlogOf("### Group — Plans (Tasks 18, 20)\n\n- **Summary:** plans.", `### Group — Plans\n\n${task(18, "####")}\n\n${task(20, "####")}`),
    );
  });

  test("la etiqueta del resumen solo se copia de una línea de resumen, no del primer campo de la referencia", () => {
    const withNote = (summaryLine: string) => `### Grupo — Otro (Tareas 30, 31)\n\n- **Nota:** aparte.${summaryLine}`;
    // Sin línea de resumen en ningún grupo: la etiqueta del idioma, aunque el primer campo sea `Nota`.
    const noSummary = docOf(backlogOf(join(withNote(""), task(18), task(20)), container("Otro", [30, 31])));
    expect(groupLabels(noSummary, S)).toEqual({ group: "Grupo", summary: "Resumen", tasks: "Tareas" });
    expect(groupLabels(noSummary, STRINGS.en).summary).toBe("Summary");
    expect(apply(noSummary, createGroup(noSummary, [18, 20], "Planes", "Un resumen.", S))).toBe(
      backlogOf(join(withNote(""), reference("Planes", [18, 20]).replace("resumen de Planes.", "Un resumen.")), join(container("Otro", [30, 31]), container("Planes", [18, 20]))),
    );
    // Con una línea de resumen detrás de la `Nota`, se copia su etiqueta.
    const later = docOf(backlogOf(join(withNote("\n- **Summary:** otro."), task(18), task(20)), container("Otro", [30, 31])));
    expect(groupLabels(later, S).summary).toBe("Summary");
  });

  test("con un placeholder de «agrupadas» en otro idioma lo reemplaza", () => {
    const doc = docOf(backlogOf(join(task(18), task(20)), "Not applicable yet."));
    expect(apply(doc, createGroup(doc, [18, 20], "Planes", resumen("Planes"), S))).toBe(backlogOf(reference("Planes", [18, 20]), container("Planes", [18, 20])));
  });

  test("el resultado vuelve a parsearse con el grupo en sus dos lugares (BACKLOG_RICH)", () => {
    const doc = docOf(BACKLOG_RICH);
    const parsed = parseBacklog(apply(doc, createGroup(doc, [3, 1], "Cosas nuevas", "Un resumen.", S)));
    expect(parsed.free.tasks.map((t) => t.number)).toEqual([18]);
    expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Documentar los planes", [14, 15]], ["Cosas nuevas", [3, 1]]]);
    expect(parsed.grouped.map((g) => [g.title, g.tasks.map((t) => t.number)])).toEqual([["Documentar los planes", [14, 15]], ["Cosas nuevas", [3, 1]]]);
    expect(parsed.free.groups[1].body).toContain("- **Resumen:** Un resumen.");
  });

  test("conserva el final de línea CRLF del archivo", () => {
    const doc = docOf(backlogOf(join(task(1), task(14), task(15)), EMPTY).replace(/\n/g, "\r\n"));
    const expected = backlogOf(join(task(1), reference("Planes", [14, 15])), container("Planes", [14, 15]));
    expect(apply(doc, createGroup(doc, [14, 15], "Planes", resumen("Planes"), S))).toBe(expected.replace(/\n/g, "\r\n"));
  });

  describe("errores", () => {
    const doc = docOf(backlogOf(join(task(1), reference("Planes", [14, 15]), task(18), task(20)), container("Planes", [14, 15])));
    const create = (numbers: number[], title = "Nuevo", summary = "Un resumen.") => () => createGroup(doc, numbers, title, summary, S);

    test("menos de 2 tareas, ninguna o repetidas", () => {
      expectError(create([1]), "Un grupo necesita al menos 2 tareas (recibí 1). No se escribió nada.");
      expectError(create([]), "Indica al menos una tarea libre. No se escribió nada.");
      expectError(create([18, 18]), "La Tarea 18 está repetida en la lista. No se escribió nada.");
    });

    test("tarea bloqueada, ya agrupada o inexistente", () => {
      expectError(create([1, 6]), "La Tarea 6 está en «Tareas bloqueadas / pospuestas»: solo se agrupan tareas libres. No se escribió nada.");
      expectError(create([1, 14]), "La Tarea 14 ya está en el grupo «Planes»");
      expectError(create([1, 99]), "La Tarea 99 no figura en «Tareas libres»");
    });

    test("título repetido (también sin mayúsculas ni acentos), en referencias y en contenedores sin referencia", () => {
      expectError(create([1, 18], "Planes"), "Ya hay un grupo con el título «Planes»");
      expectError(create([1, 18], "  PLÁNES "), "Ya hay un grupo con el título «Planes»");
      const orphan = docOf(backlogOf(join(task(1), task(18)), container("Huérfano", [14, 15])));
      expectError(() => createGroup(orphan, [1, 18], "huerfano", "x.", S), "Ya hay un grupo con el título «Huérfano»");
    });

    test("título o resumen vacío o de varias líneas, y título que se leería como referencia", () => {
      expectError(create([1, 18], "  "), "El título del grupo debe ser una sola línea y no estar vacío");
      expectError(create([1, 18], "uno\ndos"), "El título del grupo debe ser una sola línea");
      expectError(create([1, 18], "Fase (2)"), "se leería como la referencia de un grupo");
      expectError(create([1, 18], "Nuevo", ""), "El resumen del grupo debe ser una sola frase");
      expectError(create([1, 18], "Nuevo", "uno\ndos"), "El resumen del grupo debe ser una sola frase");
    });

    test("título con un paréntesis sin cerrar: el header no se releería con el mismo título", () => {
      const message = "El título «%» tiene un paréntesis sin cerrar o algo que confunde al parser";
      for (const title of ["Fase (2", "Fase (beta", "Fase (2 (3"]) expectError(create([1, 18], title), message.replace("%", title));
      expectError(create([1, 18], "Fase (2"), "No se escribió nada.");
      // Con los paréntesis cerrados, y sin dígitos al final, se relee igual y se escribe.
      for (const title of ["Fase (beta)", "Fase (2) final"]) {
        const parsed = parseBacklog(apply(doc, createGroup(doc, [1, 18], title, "Un resumen.", S)));
        expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers]).at(-1)).toEqual([title, [1, 18]]);
      }
    });

    test("el contenedor no lleva lista de números: `Migrar (v2)` no choca con el título `Migrar`", () => {
      const withParens = docOf(backlogOf(join(task(1), task(18)), container("Migrar (v2)", [14, 15])));
      expectError(() => createGroup(withParens, [1, 18], "Migrar (v2)", "x.", S), "termina en una lista entre paréntesis con números");
      const edited = apply(withParens, createGroup(withParens, [1, 18], "Migrar", "x.", S));
      expect(edited).toBe(backlogOf(reference("Migrar", [1, 18]).replace("resumen de Migrar.", "x."), join(container("Migrar (v2)", [14, 15]), container("Migrar", [1, 18]))));
      // Un contenedor sin paréntesis final sí choca.
      const plain = docOf(backlogOf(join(task(1), task(18)), container("Migrar", [14, 15])));
      expectError(() => createGroup(plain, [1, 18], "migrar", "x.", S), "Ya hay un grupo con el título «Migrar»");
    });

    test("título o resumen con `<!--` o `-->`", () => {
      for (const title of ["Fase <!-- x", "Fase --> x", "<!-- Fase -->"]) {
        expectError(create([1, 18], title), "El título del grupo no puede contener «<!--» ni «-->»: abrirían o cerrarían un comentario HTML. No se escribió nada.");
      }
      for (const summary of ["Un <!-- resumen", "Un --> resumen", "<!-- resumen -->"]) {
        expectError(create([1, 18], "Nuevo", summary), "El resumen del grupo no puede contener «<!--» ni «-->»: abrirían o cerrarían un comentario HTML. No se escribió nada.");
      }
    });

    test("sin la sección «Tareas agrupadas»", () => {
      const noSection = docOf(backlogOf(join(task(1), task(18)), EMPTY).replace("<!-- agent-context-skill:section=grouped -->\n", ""));
      expectError(() => createGroup(noSection, [1, 18], "Nuevo", "x.", S), "no tiene la sección «Tareas agrupadas»");
    });
  });
});

describe("editGroup", () => {
  const free = join(task(1), reference("Planes", [14, 15]), task(18));
  const grouped = container("Planes", [14, 15]);
  const doc = docOf(backlogOf(free, grouped));

  test("solo el título: se reescribe en la referencia (con su lista) y en el contenedor; el resumen no cambia", () => {
    expect(apply(doc, editGroup(doc, 14, { title: "Documentos" }, S))).toBe(
      backlogOf(join(task(1), referenceWith("Documentos", [14, 15], "resumen de Planes."), task(18)), container("Documentos", [14, 15])),
    );
  });

  test("cualquier tarea del grupo lo identifica", () => {
    for (const number of [14, 15]) {
      expect(apply(doc, editGroup(doc, number, { title: "Documentos" }, S))).toBe(
        backlogOf(join(task(1), referenceWith("Documentos", [14, 15], "resumen de Planes."), task(18)), container("Documentos", [14, 15])),
      );
    }
  });

  test("solo el resumen: cambia el valor de la línea y conserva su etiqueta; los títulos no se tocan", () => {
    expect(apply(doc, editGroup(doc, 15, { summary: "Un resumen nuevo." }, S))).toBe(
      backlogOf(join(task(1), referenceWith("Planes", [14, 15], "Un resumen nuevo."), task(18)), grouped),
    );
    // La etiqueta es la que ya tiene la línea, no la del idioma.
    const english = docOf(backlogOf("### Group — Plans (Tasks 14, 15)\n\n- **Summary:** old.", `### Group — Plans\n\n${task(14, "####")}\n\n${task(15, "####")}`));
    expect(apply(english, editGroup(english, 14, { summary: "new." }, S))).toBe(
      backlogOf("### Group — Plans (Tasks 14, 15)\n\n- **Summary:** new.", `### Group — Plans\n\n${task(14, "####")}\n\n${task(15, "####")}`),
    );
  });

  test("título y resumen a la vez: ediciones sin solaparse y el resultado se vuelve a leer", () => {
    const edits = editGroup(doc, 14, { title: "Documentos", summary: "Un resumen nuevo." }, S);
    const text = apply(doc, edits);
    expect(text).toBe(backlogOf(join(task(1), referenceWith("Documentos", [14, 15], "Un resumen nuevo."), task(18)), container("Documentos", [14, 15])));
    const parsed = parseBacklog(text);
    expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Documentos", [14, 15]]]);
    expect(parsed.free.groups[0].body).toBe("- **Resumen:** Un resumen nuevo.");
    expect(parsed.grouped.map((g) => [g.title, g.tasks.map((t) => t.number)])).toEqual([["Documentos", [14, 15]]]);
  });

  test("los espacios de los extremos se ignoran", () => {
    expect(apply(doc, editGroup(doc, 14, { title: "  Documentos ", summary: " Nuevo. " }, S))).toBe(
      backlogOf(join(task(1), referenceWith("Documentos", [14, 15], "Nuevo."), task(18)), container("Documentos", [14, 15])),
    );
  });

  test("con el grupo en medio de otros dos, solo se tocan sus dos headers y su resumen", () => {
    const three = docOf(
      backlogOf(
        join(reference("Uno", [30, 31]), task(1), reference("Planes", [14, 15]), reference("Tres", [40, 41])),
        join(container("Uno", [30, 31]), container("Planes", [14, 15]), container("Tres", [40, 41])),
      ),
    );
    expect(apply(three, editGroup(three, 15, { title: "Documentos", summary: "Nuevo." }, S))).toBe(
      backlogOf(
        join(reference("Uno", [30, 31]), task(1), referenceWith("Documentos", [14, 15], "Nuevo."), reference("Tres", [40, 41])),
        join(container("Uno", [30, 31]), container("Documentos", [14, 15]), container("Tres", [40, 41])),
      ),
    );
  });

  test("conserva la palabra del grupo y el espaciado del header (`Group`, `–`, espacios antes de la lista)", () => {
    const odd = docOf(backlogOf("### Group –  Plans   (Tasks 14, 15)  \n\n- **Summary:** old.", `### Group –  Plans\n\n${task(14, "####")}\n\n${task(15, "####")}`));
    expect(apply(odd, editGroup(odd, 14, { title: "Docs" }, S))).toBe(
      backlogOf("### Group –  Docs   (Tasks 14, 15)  \n\n- **Summary:** old.", `### Group –  Docs\n\n${task(14, "####")}\n\n${task(15, "####")}`),
    );
  });

  test("un resumen de varias líneas se reemplaza entero; lo que sigue al campo queda", () => {
    const long = docOf(backlogOf(`### Grupo — Planes (Tareas 14, 15)\n\n- **Resumen:** primera\n  continuación.\n- **Nota:** aparte.\n\n${task(18)}`, grouped));
    expect(apply(long, editGroup(long, 14, { summary: "Una sola." }, S))).toBe(
      backlogOf(`### Grupo — Planes (Tareas 14, 15)\n\n- **Resumen:** Una sola.\n- **Nota:** aparte.\n\n${task(18)}`, grouped),
    );
  });

  describe("un grupo sin línea de Resumen", () => {
    const bare = "### Grupo — Planes (Tareas 14, 15)";

    test("se agrega tras el header, con la etiqueta del idioma", () => {
      const noSummary = docOf(backlogOf(join(task(1), bare, task(18)), grouped));
      expect(apply(noSummary, editGroup(noSummary, 14, { summary: "Nuevo." }, S))).toBe(backlogOf(join(task(1), referenceWith("Planes", [14, 15], "Nuevo."), task(18)), grouped));
      expect(apply(noSummary, editGroup(noSummary, 14, { summary: "New." }, STRINGS.en))).toBe(
        backlogOf(join(task(1), "### Grupo — Planes (Tareas 14, 15)\n\n- **Summary:** New.", task(18)), grouped),
      );
    });

    test("sola en «libres» (header en la última línea de su sección), también", () => {
      const only = docOf(backlogOf(bare, grouped));
      expect(apply(only, editGroup(only, 15, { summary: "Nuevo." }, S))).toBe(backlogOf(referenceWith("Planes", [14, 15], "Nuevo."), grouped));
    });

    test("copia el espaciado de los demás grupos del archivo", () => {
      const others = join(`### Group — Otro\n\n${task(30, "####")}\n\n${task(31, "####")}`, grouped);
      const tight = docOf(backlogOf(join("### Group — Otro (Tasks 30, 31)\n- **Summary:** otro.", bare), others));
      expect(apply(tight, editGroup(tight, 14, { summary: "Nuevo." }, S))).toBe(
        backlogOf(join("### Group — Otro (Tasks 30, 31)\n- **Summary:** otro.", "### Grupo — Planes (Tareas 14, 15)\n- **Summary:** Nuevo."), others),
      );
    });

    test("un campo propio que no es el resumen (`Nota`) no se pisa: se agrega el Resumen aparte", () => {
      const withNote = docOf(backlogOf(join(task(1), `${bare}\n\n- **Nota:** y.`, task(18)), grouped));
      expect(apply(withNote, editGroup(withNote, 14, { summary: "Nuevo." }, S))).toBe(
        backlogOf(join(task(1), `${bare}\n\n- **Resumen:** Nuevo.\n\n- **Nota:** y.`, task(18)), grouped),
      );
    });

    test("un `Nota` como primer campo de otro grupo no contamina la etiqueta del Resumen", () => {
      const others = join(`### Grupo — Otro\n\n${task(30, "####")}\n\n${task(31, "####")}`, grouped);
      const other = docOf(backlogOf(join("### Grupo — Otro (Tareas 30, 31)\n\n- **Nota:** aparte.", bare), others));
      expect(apply(other, editGroup(other, 14, { summary: "Nuevo." }, S))).toBe(
        backlogOf(join("### Grupo — Otro (Tareas 30, 31)\n\n- **Nota:** aparte.", referenceWith("Planes", [14, 15], "Nuevo.")), others),
      );
      expect(apply(other, editGroup(other, 14, { summary: "New." }, STRINGS.en))).toContain("### Grupo — Planes (Tareas 14, 15)\n\n- **Summary:** New.");
    });

    test("con título nuevo a la vez, las dos ediciones del header no se solapan", () => {
      const noSummary = docOf(backlogOf(join(task(1), bare), grouped));
      const text = apply(noSummary, editGroup(noSummary, 14, { title: "Docs", summary: "Nuevo." }, S));
      expect(text).toBe(backlogOf(join(task(1), referenceWith("Docs", [14, 15], "Nuevo.")), container("Docs", [14, 15])));
      expect(parseBacklog(text).free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Docs", [14, 15]]]);
    });
  });

  test("solo cambiar la capitalización del título es un cambio (el propio grupo no cuenta como repetido)", () => {
    expect(apply(doc, editGroup(doc, 14, { title: "PLANES" }, S))).toBe(
      backlogOf(join(task(1), referenceWith("PLANES", [14, 15], "resumen de Planes."), task(18)), container("PLANES", [14, 15])),
    );
  });

  test("si referencia y contenedor ya difieren por un desajuste manual, el título de uno de los dos repara los dos headers", () => {
    const mismatch = docOf(backlogOf(join(task(1), reference("Dos", [14, 15])), container("DOS", [14, 15])));
    const fixed = backlogOf(join(task(1), reference("Dos", [14, 15])), container("Dos", [14, 15]));
    expect(apply(mismatch, editGroup(mismatch, 14, { title: "Dos" }, S))).toBe(fixed);
    expect(apply(mismatch, editGroup(mismatch, 14, { title: "DOS" }, S))).toBe(backlogOf(join(task(1), reference("DOS", [14, 15]).replace("resumen de DOS.", "resumen de Dos.")), container("DOS", [14, 15])));
    const text = apply(mismatch, editGroup(mismatch, 14, { title: " Dos ", summary: "Nuevo." }, S));
    expect(text).toBe(backlogOf(join(task(1), referenceWith("Dos", [14, 15], "Nuevo.")), container("Dos", [14, 15])));
    // Ya reparado, no hay nada que cambiar.
    const repaired = docOf(fixed);
    expectError(() => editGroup(repaired, 14, { title: "Dos" }, S), "El grupo «Dos» ya tiene el título que indicas: no hay nada que cambiar.");
  });

  test("si uno de los dos valores ya es el actual, solo se escribe el otro", () => {
    expect(apply(doc, editGroup(doc, 14, { title: "Planes", summary: "Nuevo." }, S))).toBe(apply(doc, editGroup(doc, 14, { summary: "Nuevo." }, S)));
    expect(apply(doc, editGroup(doc, 14, { title: "Docs", summary: "resumen de Planes." }, S))).toBe(apply(doc, editGroup(doc, 14, { title: "Docs" }, S)));
  });

  test("con el fixture real (BACKLOG_RICH) el resultado vuelve a parsearse", () => {
    const rich = docOf(BACKLOG_RICH);
    const parsed = parseBacklog(apply(rich, editGroup(rich, 15, { title: "Planes de costos", summary: "Un resumen." }, S)));
    expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Planes de costos", [14, 15]]]);
    expect(parsed.free.groups[0].body).toBe("- **Resumen:** Un resumen.");
    expect(parsed.grouped.map((g) => [g.title, g.tasks.map((t) => t.number)])).toEqual([["Planes de costos", [14, 15]]]);
    expect(parsed.free.tasks.map((t) => t.number)).toEqual([1, 3, 18]);
  });

  test("conserva el final de línea CRLF del archivo", () => {
    const crlf = docOf(backlogOf(free, grouped).replace(/\n/g, "\r\n"));
    const expected = backlogOf(join(task(1), referenceWith("Documentos", [14, 15], "Nuevo."), task(18)), container("Documentos", [14, 15]));
    const text = apply(crlf, editGroup(crlf, 14, { title: "Documentos", summary: "Nuevo." }, S));
    expect(text).toBe(expected.replace(/\n/g, "\r\n"));
    expect(text.replace(/\r\n/g, "")).not.toContain("\n");
    // También al agregar la línea de resumen.
    const noSummary = docOf(backlogOf(join(task(1), "### Grupo — Planes (Tareas 14, 15)"), grouped).replace(/\n/g, "\r\n"));
    expect(apply(noSummary, editGroup(noSummary, 14, { summary: "Nuevo." }, S))).toBe(backlogOf(join(task(1), referenceWith("Planes", [14, 15], "Nuevo.")), grouped).replace(/\n/g, "\r\n"));
  });

  describe("errores", () => {
    const other = docOf(backlogOf(join(reference("Otro", [30, 31]), reference("Planes", [14, 15]), task(1), task(18)), join(container("Otro", [30, 31]), container("Planes", [14, 15]))));
    const edit = (values: { title?: string; summary?: string }) => () => editGroup(other, 14, values, S);

    test("sin nada que cambiar", () => {
      expectError(edit({}), "Indica qué cambiar del grupo: el título, el resumen o ambos. No se escribió nada.");
    });

    test("la tarea no está agrupada (libre, bloqueada, inexistente)", () => {
      for (const number of [1, 6, 99]) expectError(() => editGroup(other, number, { title: "X" }, S), `La Tarea ${number} no está en «Tareas agrupadas»`);
    });

    test("el valor es el actual: no hay nada que cambiar", () => {
      expectError(edit({ title: "Planes" }), "El grupo «Planes» ya tiene el título que indicas: no hay nada que cambiar. No se escribió nada.");
      expectError(edit({ title: " Planes " }), "ya tiene el título que indicas");
      expectError(edit({ summary: "resumen de Planes." }), "El grupo «Planes» ya tiene el resumen que indicas: no hay nada que cambiar. No se escribió nada.");
      expectError(edit({ title: "Planes", summary: "resumen de Planes." }), "El grupo «Planes» ya tiene el título y el resumen que indicas: no hay nada que cambiar.");
    });

    test("título repetido (sin mayúsculas ni acentos), en referencias y en contenedores sin referencia", () => {
      expectError(edit({ title: "Otro" }), "Ya hay un grupo con el título «Otro»: el título identifica al grupo y debe ser único. No se escribió nada.");
      expectError(edit({ title: "  ÓTRO " }), "Ya hay un grupo con el título «Otro»");
      const orphan = docOf(backlogOf(join(reference("Planes", [14, 15]), task(1)), join(container("Planes", [14, 15]), container("Huérfano", [30, 31]))));
      expectError(() => editGroup(orphan, 14, { title: "huerfano" }, S), "Ya hay un grupo con el título «Huérfano»");
    });

    test("título o resumen vacío, de varias líneas, con comentario HTML o que se leería como referencia", () => {
      expectError(edit({ title: "  " }), "El título del grupo debe ser una sola línea y no estar vacío");
      expectError(edit({ title: "uno\ndos" }), "El título del grupo debe ser una sola línea");
      expectError(edit({ summary: "" }), "El resumen del grupo debe ser una sola frase");
      expectError(edit({ summary: "uno\ndos" }), "El resumen del grupo debe ser una sola frase");
      expectError(edit({ title: "Fase <!-- x" }), "El título del grupo no puede contener «<!--» ni «-->»");
      expectError(edit({ summary: "Un --> resumen" }), "El resumen del grupo no puede contener «<!--» ni «-->»");
      expectError(edit({ title: "Fase (2)" }), "termina en una lista entre paréntesis con números");
    });

    test("título con un paréntesis sin cerrar: el header no se releería con el mismo título", () => {
      for (const title of ["Fase (2", "Fase (beta", "Fase (2 (3"]) {
        expectError(edit({ title }), `El título «${title}» tiene un paréntesis sin cerrar o algo que confunde al parser`);
      }
      for (const title of ["Fase (beta)", "Fase (2) final"]) {
        const parsed = parseBacklog(apply(other, editGroup(other, 14, { title }, S)));
        expect(parsed.free.groups.map((g) => [g.title, g.taskNumbers])).toEqual([["Otro", [30, 31]], [title, [14, 15]]]);
        expect(parsed.grouped.map((g) => g.tasks.map((t) => t.number))).toEqual([[30, 31], [14, 15]]);
      }
    });

    test("un comentario HTML en el header de la referencia o del contenedor: pide quitarlo a mano", () => {
      const message = (header: string) => `El header del grupo (${header}) tiene un comentario HTML: quita el comentario del header a mano. No se escribió nada.`;
      const inReference = docOf(backlogOf(join(task(1), "### Grupo — Dos (Tareas 14, 15) <!-- x -->\n\n- **Resumen:** dos."), container("Dos", [14, 15])));
      expectError(() => editGroup(inReference, 14, { title: "Tres" }, S), message("### Grupo — Dos (Tareas 14, 15) <!-- x -->"));
      const inContainer = docOf(backlogOf(join(task(1), reference("Dos", [14, 15])), container("Dos", [14, 15]).replace("### Grupo — Dos", "### Grupo — Dos <!-- x -->")));
      expectError(() => editGroup(inContainer, 14, { title: "Tres" }, S), message("### Grupo — Dos <!-- x -->"));
      // Solo el resumen no toca los headers: se escribe.
      expect(apply(inReference, editGroup(inReference, 14, { summary: "Nuevo." }, S))).toContain("- **Resumen:** Nuevo.");
    });

    test("un contenedor sin referencia es un error", () => {
      const orphan = docOf(backlogOf(task(1), container("Huérfano", [14, 15])));
      expectError(() => editGroup(orphan, 14, { title: "X" }, S), "no tiene su referencia");
    });
  });
});

describe("dissolveGroup", () => {
  const EMPTY = "No aplica todavía — ningún grupo formado.";

  test("grupo de 2: las tareas pasan al final de «libres», en el orden del contenedor, y «agrupadas» queda vacía", () => {
    const doc = docOf(backlogOf(join(task(1), reference("Planes", [14, 15]), task(18)), container("Planes", [14, 15])));
    const expected = backlogOf(join(task(1), task(18), task(14), task(15)), EMPTY);
    expect(apply(doc, dissolveGroup(doc, 14, S))).toBe(expected);
    expect(apply(doc, dissolveGroup(doc, 15, S))).toBe(expected);
  });

  test("grupo de 3, con la referencia como último bloque de «libres»: las tareas ocupan su lugar", () => {
    const doc = docOf(backlogOf(join(task(1), reference("Planes", [14, 15, 16])), container("Planes", [14, 15, 16])));
    expect(apply(doc, dissolveGroup(doc, 15, S))).toBe(backlogOf(join(task(1), task(14), task(15), task(16)), EMPTY));
  });

  test("el orden es el del contenedor, no el de la lista de la referencia", () => {
    const doc = docOf(backlogOf(join(reference("Planes", [16, 14, 15]), task(1)), container("Planes", [14, 15, 16])));
    expect(apply(doc, dissolveGroup(doc, 16, S))).toBe(backlogOf(join(task(1), task(14), task(15), task(16)), EMPTY));
  });

  test("con otro grupo después: ese queda con su referencia y su contenedor", () => {
    const doc = docOf(
      backlogOf(
        join(reference("Planes", [14, 15]), task(1), reference("Otro", [30, 31, 32])),
        join(container("Planes", [14, 15]), container("Otro", [30, 31, 32])),
      ),
    );
    expect(apply(doc, dissolveGroup(doc, 14, S))).toBe(
      backlogOf(join(task(1), reference("Otro", [30, 31, 32]), task(14), task(15)), container("Otro", [30, 31, 32])),
    );
  });

  test("con otro grupo antes, y la referencia al final de «libres»", () => {
    const doc = docOf(
      backlogOf(
        join(reference("Otro", [30, 31]), task(1), reference("Planes", [14, 15])),
        join(container("Otro", [30, 31]), container("Planes", [14, 15])),
      ),
    );
    expect(apply(doc, dissolveGroup(doc, 15, S))).toBe(backlogOf(join(reference("Otro", [30, 31]), task(1), task(14), task(15)), container("Otro", [30, 31])));
  });

  test("con otro grupo en medio de dos más", () => {
    const doc = docOf(
      backlogOf(
        join(reference("Uno", [30, 31]), reference("Planes", [14, 15]), reference("Tres", [40, 41])),
        join(container("Uno", [30, 31]), container("Planes", [14, 15]), container("Tres", [40, 41])),
      ),
    );
    expect(apply(doc, dissolveGroup(doc, 14, S))).toBe(
      backlogOf(join(reference("Uno", [30, 31]), reference("Tres", [40, 41]), task(14), task(15)), join(container("Uno", [30, 31]), container("Tres", [40, 41]))),
    );
  });

  test("el último grupo deja el texto de vacío del idioma", () => {
    const doc = docOf(backlogOf(join(task(1), reference("Planes", [14, 15])), container("Planes", [14, 15])));
    expect(apply(doc, dissolveGroup(doc, 14, STRINGS.es))).toBe(backlogOf(join(task(1), task(14), task(15)), EMPTY));
    expect(apply(doc, dissolveGroup(doc, 14, STRINGS.en))).toBe(backlogOf(join(task(1), task(14), task(15)), "Not applicable yet — no groups formed."));
  });

  test("con el fixture real (BACKLOG_RICH) el resultado vuelve a parsearse sin grupos", () => {
    const doc = docOf(BACKLOG_RICH);
    const parsed = parseBacklog(apply(doc, dissolveGroup(doc, 15, S)));
    expect(parsed.free.tasks.map((t) => t.number)).toEqual([1, 3, 18, 14, 15]);
    expect(parsed.free.groups).toEqual([]);
    expect(parsed.grouped).toEqual([]);
  });

  test("conserva el final de línea CRLF del archivo", () => {
    const doc = docOf(backlogOf(join(task(1), reference("Planes", [14, 15, 16]), task(18)), container("Planes", [14, 15, 16])).replace(/\n/g, "\r\n"));
    const text = apply(doc, dissolveGroup(doc, 15, S));
    expect(text).toBe(backlogOf(join(task(1), task(18), task(14), task(15), task(16)), EMPTY).replace(/\n/g, "\r\n"));
    expect(text.replace(/\r\n/g, "")).not.toContain("\n");
  });

  test("una tarea que no está agrupada (libre, bloqueada, inexistente) es un error", () => {
    const doc = docOf(backlogOf(join(task(1), reference("Planes", [14, 15])), container("Planes", [14, 15])));
    for (const number of [1, 6, 99]) expectError(() => dissolveGroup(doc, number, S), `La Tarea ${number} no está en «Tareas agrupadas»`);
  });

  test("un contenedor sin referencia es un error", () => {
    const doc = docOf(backlogOf(task(1), container("Huérfano", [14, 15])));
    expectError(() => dissolveGroup(doc, 14, S), "no tiene su referencia");
  });
});
