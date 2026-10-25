import { describe, expect, test } from "bun:test";
import { checkDecisionsIndex } from "../../src/checks/decisions.ts";
import { brief, makeCtx } from "../helpers.ts";

const DIR = "docs/project/decisions";
const README = `# Decisiones

## Índice

<!-- Una línea por tema: \`- [tema.md](./tema.md) — cuándo leerlo\`. -->

- [stack.md](./stack.md) — antes de agregar una librería
- [auth.md](./auth.md) — antes de tocar el login

## Crear un tema nuevo

\`\`\`
- [ejemplo.md](./ejemplo.md) — esto está en un bloque de código
\`\`\`
`;

const folder = (over: object = {}) => ({ exists: true, readme: README, files: ["auth.md", "stack.md"], ...over });

describe("decisions-index", () => {
  test("sin carpeta ni archivos del formato anterior: sin hallazgos", () => {
    expect(checkDecisionsIndex(makeCtx())).toEqual([]);
  });

  test("índice completo: sin hallazgos (ignora comentarios y bloques de código)", () => {
    expect(checkDecisionsIndex(makeCtx({ decisions: folder() }))).toEqual([]);
  });

  test("carpeta sin README.md: aviso sobre la carpeta", () => {
    const findings = checkDecisionsIndex(makeCtx({ decisions: folder({ readme: null }) }));
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "decisions-index", file: DIR, line: null }]);
    expect(findings[0].message).toContain("README.md");
  });

  test("un tema que no figura en el índice: aviso con la línea que falta", () => {
    const findings = checkDecisionsIndex(makeCtx({ decisions: folder({ files: ["auth.md", "base-de-datos.md", "stack.md"] }) }));
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "decisions-index", file: `${DIR}/README.md`, line: null }]);
    expect(findings[0].message).toContain("base-de-datos.md");
  });

  test("una línea del índice que apunta a un archivo inexistente: aviso en esa línea", () => {
    const findings = checkDecisionsIndex(makeCtx({ decisions: folder({ files: ["stack.md"] }) }));
    expect(findings.map(brief)).toEqual([{ severity: "warning", code: "decisions-index", file: `${DIR}/README.md`, line: 8 }]);
    expect(findings[0].message).toContain("auth.md");
  });

  test("enlaces con ancla y sin ./ también cuentan como listados", () => {
    const readme = "# D\n\n- [stack](stack.md#estado) — x\n- [auth](./auth.md) — y\n";
    expect(checkDecisionsIndex(makeCtx({ decisions: folder({ readme }) }))).toEqual([]);
  });

  test("decisions.md o stack.md sueltos: aviso de formato anterior por cada uno", () => {
    const findings = checkDecisionsIndex(makeCtx({ decisions: { legacy: ["docs/project/decisions.md", "docs/project/stack.md"] } }));
    expect(findings.map(brief)).toEqual([
      { severity: "warning", code: "decisions-legacy", file: "docs/project/decisions.md", line: null },
      { severity: "warning", code: "decisions-legacy", file: "docs/project/stack.md", line: null },
    ]);
    expect(findings[0].message).toContain(DIR);
  });
});
