import { describe, expect, test } from "bun:test";
import { hasSuiteBlock, RulesBlockError, SUITE_BLOCK, SUITE_BLOCK_END, SUITE_BLOCK_START, upsertSuiteBlock } from "../rules-block.ts";

const WITH_SPECIFIC = `# Reglas

## Reglas por defecto

1. Una regla.

## Reglas específicas de este proyecto

- Algo propio.

### Si usas el script

- Detalle.

## Al cerrar una tarea (fijas — leer solo al cerrar)

6. Cierre.
`;

const WITHOUT_SPECIFIC = `# Reglas

## Reglas por defecto

1. Una regla.

## Al cerrar una tarea (fijas — leer solo al cerrar)

6. Cierre.
`;

describe("SUITE_BLOCK", () => {
  test("va entre sus marcas y no lleva encabezados de nivel 2", () => {
    const lines = SUITE_BLOCK.split("\n");
    expect(lines[0]).toBe(SUITE_BLOCK_START);
    expect(lines.at(-1)).toBe(SUITE_BLOCK_END);
    expect(lines[1]).toBe("### Herramientas de la suite");
    expect(lines.filter((line) => line.startsWith("## "))).toEqual([]);
  });
});

describe("upsertSuiteBlock: insertar", () => {
  test("al final de «Reglas específicas», antes de «Al cerrar una tarea»", () => {
    const { text, action } = upsertSuiteBlock(WITH_SPECIFIC);
    expect(action).toBe("inserted");
    expect(text).toBe(WITH_SPECIFIC.replace("## Al cerrar", `${SUITE_BLOCK}\n\n## Al cerrar`));
    expect(text.indexOf(SUITE_BLOCK)).toBeGreaterThan(text.indexOf("- Detalle."));
    expect(text.indexOf(SUITE_BLOCK)).toBeLessThan(text.indexOf("## Al cerrar"));
  });

  test("sin la sección específica, la crea antes de «Al cerrar una tarea»", () => {
    const { text, action } = upsertSuiteBlock(WITHOUT_SPECIFIC);
    expect(action).toBe("inserted");
    expect(text).toBe(WITHOUT_SPECIFIC.replace("## Al cerrar", `## Reglas específicas de este proyecto\n\n${SUITE_BLOCK}\n\n## Al cerrar`));
  });

  test("deja una línea en blanco antes y después aunque la sección termine sin ella", () => {
    const { text } = upsertSuiteBlock("## Reglas específicas de este proyecto\n- a\n## Al cerrar una tarea\nx\n");
    expect(text).toBe(`## Reglas específicas de este proyecto\n- a\n\n${SUITE_BLOCK}\n\n## Al cerrar una tarea\nx\n`);
  });

  test("no toca nada más del archivo", () => {
    const { text } = upsertSuiteBlock(WITH_SPECIFIC);
    expect(text.replace(`${SUITE_BLOCK}\n\n`, "")).toBe(WITH_SPECIFIC);
  });

  test("«Al cerrar una tarea» en la primera línea: no antepone una línea en blanco", () => {
    const { text } = upsertSuiteBlock("## Al cerrar una tarea\nx\n");
    expect(text.startsWith("## Reglas específicas de este proyecto\n\n<!--")).toBe(true);
  });
});

describe("upsertSuiteBlock: idempotencia y actualización", () => {
  test("una segunda pasada no cambia nada", () => {
    for (const source of [WITH_SPECIFIC, WITHOUT_SPECIFIC]) {
      const first = upsertSuiteBlock(source);
      const second = upsertSuiteBlock(first.text);
      expect(second.action).toBe("unchanged");
      expect(second.text).toBe(first.text);
    }
  });

  test("reemplaza un bloque desactualizado sin tocar lo de alrededor", () => {
    const stale = WITH_SPECIFIC.replace("## Al cerrar", `${SUITE_BLOCK_START}\n### Herramientas de la suite\n\nTexto viejo.\n${SUITE_BLOCK_END}\n\n## Al cerrar`);
    const { text, action } = upsertSuiteBlock(stale);
    expect(action).toBe("updated");
    expect(text).toBe(WITH_SPECIFIC.replace("## Al cerrar", `${SUITE_BLOCK}\n\n## Al cerrar`));
    expect(upsertSuiteBlock(text).action).toBe("unchanged");
  });

  test("un bloque desactualizado se reemplaza donde esté, aunque falte «Al cerrar una tarea»", () => {
    const { text, action } = upsertSuiteBlock(`# R\n\n${SUITE_BLOCK_START}\nviejo\n${SUITE_BLOCK_END}\n\nfin\n`);
    expect(action).toBe("updated");
    expect(text).toBe(`# R\n\n${SUITE_BLOCK}\n\nfin\n`);
  });
});

describe("upsertSuiteBlock: errores (no escribe ni adivina)", () => {
  const fails = (text: string) => {
    try {
      upsertSuiteBlock(text);
    } catch (error) {
      expect(error).toBeInstanceOf(RulesBlockError);
      return (error as Error).message;
    }
    throw new Error("debía lanzar");
  };

  test("solo la marca de inicio", () => {
    expect(fails(`${SUITE_BLOCK_START}\n${WITH_SPECIFIC}`)).toContain("Falta la marca de cierre");
  });

  test("solo la marca de cierre", () => {
    expect(fails(`${WITH_SPECIFIC}${SUITE_BLOCK_END}\n`)).toContain("Falta la marca de inicio");
  });

  test("marcas invertidas", () => {
    expect(fails(`${SUITE_BLOCK_END}\n${WITH_SPECIFIC}${SUITE_BLOCK_START}\n`)).toContain("está antes que la de inicio");
  });

  test("marcas duplicadas", () => {
    const message = fails(`${SUITE_BLOCK}\n\n${SUITE_BLOCK}\n\n${WITH_SPECIFIC}`);
    expect(message).toContain("2 marca(s) de inicio y 2 de cierre");
  });

  test("sin la sección «Al cerrar una tarea»", () => {
    expect(fails("# Reglas\n\n## Reglas específicas de este proyecto\n\n- a\n")).toContain("No encuentro la sección «Al cerrar una tarea»");
  });
});

describe("upsertSuiteBlock: lo que está en bloques de código o comentarios no cuenta", () => {
  test("un «## Al cerrar una tarea» dentro de ``` se ignora", () => {
    const text = "```md\n## Al cerrar una tarea\n```\n\n## Al cerrar una tarea (fijas)\nx\n";
    const { text: out } = upsertSuiteBlock(text);
    expect(out).toBe(`\`\`\`md\n## Al cerrar una tarea\n\`\`\`\n\n## Reglas específicas de este proyecto\n\n${SUITE_BLOCK}\n\n## Al cerrar una tarea (fijas)\nx\n`);
  });

  test("un «## Al cerrar una tarea» dentro de un comentario se ignora (y sin el real, es error)", () => {
    expect(() => upsertSuiteBlock("<!--\n## Al cerrar una tarea\n-->\n")).toThrow(RulesBlockError);
    const real = upsertSuiteBlock("<!--\n## Al cerrar una tarea\n-->\n\n## Al cerrar una tarea\nx\n");
    expect(real.text.indexOf(SUITE_BLOCK)).toBeGreaterThan(real.text.indexOf("-->"));
    expect(real.text.indexOf(SUITE_BLOCK)).toBeLessThan(real.text.lastIndexOf("## Al cerrar una tarea"));
  });

  test("un «## Reglas específicas…» dentro de ``` o de un comentario no cuenta como la sección", () => {
    for (const fake of ["```\n## Reglas específicas de este proyecto\n```", "<!--\n## Reglas específicas de este proyecto\n-->"]) {
      const { text } = upsertSuiteBlock(`${fake}\n\n## Al cerrar una tarea\nx\n`);
      expect(text).toContain(`\n## Reglas específicas de este proyecto\n\n${SUITE_BLOCK}\n\n## Al cerrar`);
    }
  });

  test("marcas dentro de un bloque de código no cuentan", () => {
    const fenced = `\`\`\`\n${SUITE_BLOCK}\n\`\`\`\n\n## Al cerrar una tarea\nx\n`;
    expect(hasSuiteBlock(fenced)).toBe(false);
    expect(upsertSuiteBlock(fenced).action).toBe("inserted");
  });
});

describe("hasSuiteBlock", () => {
  test("detecta el bloque, también desactualizado", () => {
    expect(hasSuiteBlock(upsertSuiteBlock(WITH_SPECIFIC).text)).toBe(true);
    expect(hasSuiteBlock(`${SUITE_BLOCK_START}\nviejo\n${SUITE_BLOCK_END}\n`)).toBe(true);
  });

  test("sin marcas, con una sola o invertidas: no", () => {
    expect(hasSuiteBlock(WITH_SPECIFIC)).toBe(false);
    expect(hasSuiteBlock(`${SUITE_BLOCK_START}\nx\n`)).toBe(false);
    expect(hasSuiteBlock(`${SUITE_BLOCK_END}\nx\n${SUITE_BLOCK_START}\n`)).toBe(false);
    expect(hasSuiteBlock("")).toBe(false);
  });
});
