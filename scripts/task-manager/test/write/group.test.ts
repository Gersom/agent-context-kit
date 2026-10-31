// Sacar una tarea de su grupo y sumarle tareas libres: ediciones exactas sobre textos en memoria
// (nunca se tocan los docs reales). Los backlogs se arman con `backlogOf` para que la entrada y el
// resultado esperado se lean lado a lado.

import { describe, expect, test } from "bun:test";
import { parseBacklog } from "../../../_shared/parse/backlog.ts";
import { normalizeEol } from "../../../_shared/parse/positions.ts";
import type { ParsedBacklog } from "../../../_shared/types.ts";
import { CliError } from "../../src/cli/errors.ts";
import { applyEdits, type Edit } from "../../src/edit/edits.ts";
import { addTasks, ejectTask, findGroupOf } from "../../src/write/group.ts";
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
const reference = (title: string, numbers: number[]) => `### Grupo — ${title} (Tareas ${numbers.join(", ")})\n\n- **Resumen:** resumen de ${title}.`;
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
