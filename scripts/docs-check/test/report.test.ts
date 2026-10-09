import { describe, expect, test } from "bun:test";
import { buildReport, type ReportMeta, renderJson, renderText, sortFindings } from "../src/report.ts";
import { finding } from "./helpers.ts";

const META: ReportMeta = { project: "D:/proyecto", mode: "multi", agentsDir: "docs/agents", operator: "gersom" };

describe("sortFindings", () => {
  test("por archivo, luego por línea (los del archivo entero primero) y por código", () => {
    const sorted = sortFindings([
      finding({ code: "b", file: "b.md", line: 1 }),
      finding({ code: "z", file: "a.md", line: 9 }),
      finding({ code: "y", file: "a.md", line: 2 }),
      finding({ code: "x", file: "a.md", line: null }),
      finding({ code: "a", file: "a.md", line: 2 }),
    ]);
    expect(sorted.map((f) => `${f.file}:${f.line}:${f.code}`)).toEqual(["a.md:null:x", "a.md:2:a", "a.md:2:y", "a.md:9:z", "b.md:1:b"]);
  });

  test("no modifica la lista original", () => {
    const original = [finding({ code: "b", file: "b.md" }), finding({ code: "a", file: "a.md" })];
    sortFindings(original);
    expect(original.map((f) => f.code)).toEqual(["b", "a"]);
  });
});

describe("buildReport", () => {
  test("cuenta errores y avisos", () => {
    const report = buildReport(META, [finding({ code: "a" }), finding({ code: "b", severity: "warning" }), finding({ code: "c", severity: "warning" })], false);
    expect(report).toMatchObject({ errors: 1, warnings: 2, ok: false, strict: false, ...META });
  });

  test("sin hallazgos: ok", () => {
    expect(buildReport(META, [], false)).toMatchObject({ ok: true, errors: 0, warnings: 0, findings: [] });
  });

  test("solo avisos: ok, salvo con --strict", () => {
    const warnings = [finding({ code: "w", severity: "warning" })];
    expect(buildReport(META, warnings, false).ok).toBe(true);
    expect(buildReport(META, warnings, true)).toMatchObject({ ok: false, strict: true });
  });

  test("con errores: no ok aunque sea --strict o no", () => {
    expect(buildReport(META, [finding({ code: "e" })], false).ok).toBe(false);
    expect(buildReport(META, [finding({ code: "e" })], true).ok).toBe(false);
  });

  test("ordena los hallazgos", () => {
    const report = buildReport(META, [finding({ code: "b", file: "b.md" }), finding({ code: "a", file: "a.md" })], false);
    expect(report.findings.map((f) => f.file)).toEqual(["a.md", "b.md"]);
  });
});

describe("renderText", () => {
  test("la cabecera dice proyecto, modo, carpeta de agentes y operador", () => {
    const lines = renderText(buildReport(META, [], false));
    expect(lines.slice(0, 4)).toEqual(["Proyecto:  D:/proyecto", "Modo:      multi", "Agentes:   docs/agents", "Operador:  gersom"]);
  });

  test("repo plano: «plano» y sin operador", () => {
    const lines = renderText(buildReport({ ...META, mode: "flat", operator: null }, [], false));
    expect(lines[1]).toBe("Modo:      plano");
    expect(lines[3]).toBe("Operador:  (ninguno: repo plano)");
  });

  test("sin ubicar la documentación", () => {
    const lines = renderText(buildReport({ project: "x", mode: null, agentsDir: null, operator: null }, [], false));
    expect(lines.slice(1, 4)).toEqual(["Modo:      (sin ubicar)", "Agentes:   (sin ubicar)", "Operador:  (sin resolver)"]);
  });

  test("agrupa por archivo, con una línea en blanco entre archivos, y marca error/aviso", () => {
    const report = buildReport(
      META,
      [
        finding({ code: "anchor-missing", file: "a.md", line: null, message: "falta" }),
        finding({ code: "placeholder", file: "a.md", line: 12, severity: "warning", message: "quedó" }),
        finding({ code: "next-number", file: "b.md", line: 3, message: "repite" }),
      ],
      false,
    );
    const lines = renderText(report);
    expect(lines.slice(4, 9)).toEqual([
      "",
      "error  a.md  [anchor-missing] falta",
      "aviso  a.md:12  [placeholder] quedó",
      "",
      "error  b.md:3  [next-number] repite",
    ]);
  });

  test("resumen con singular y plural", () => {
    const one = renderText(buildReport(META, [finding({ code: "e" }), finding({ code: "w", severity: "warning" })], false));
    expect(one).toContain("1 error, 1 aviso");
    const many = renderText(buildReport(META, [finding({ code: "e" }), finding({ code: "f" }), finding({ code: "w", severity: "warning" })], false));
    expect(many).toContain("2 errores, 1 aviso");
    expect(renderText(buildReport(META, [], false))).toContain("0 errores, 0 avisos");
  });

  test("sin errores: «Listo para trabajar…»", () => {
    const lines = renderText(buildReport(META, [], false));
    expect(lines.at(-1)).toBe("Listo para trabajar con la skill y con `bun run task`.");
  });

  test("con errores: no dice «Listo» y pide corregir", () => {
    const text = renderText(buildReport(META, [finding({ code: "e" })], false)).join("\n");
    expect(text).not.toContain("Listo para trabajar");
    expect(text).toContain("Corrige los errores");
  });

  test("solo avisos sin --strict: «Listo» y una nota de que no impiden trabajar", () => {
    const text = renderText(buildReport(META, [finding({ code: "w", severity: "warning" })], false)).join("\n");
    expect(text).toContain("Listo para trabajar");
    expect(text).toContain("Revisa los avisos: no impiden trabajar");
    expect(text).not.toContain("--strict");
  });

  test("solo avisos con --strict: la nota dice que los avisos también hacen fallar", () => {
    const text = renderText(buildReport(META, [finding({ code: "w", severity: "warning" })], true)).join("\n");
    expect(text).toContain("Con --strict los avisos también hacen fallar");
    expect(text).not.toContain("no impiden trabajar");
  });

  test("sin avisos: sin nota de revisión", () => {
    const text = renderText(buildReport(META, [], true)).join("\n");
    expect(text).not.toContain("avisos también");
    expect(text).not.toContain("Revisa los avisos");
  });
});

describe("renderJson", () => {
  test("un único objeto con los campos del informe y nada más", () => {
    const report = buildReport(META, [finding({ code: "e", file: "a.md", line: 4, message: "m" })], true);
    const parsed = JSON.parse(renderJson(report));
    expect(Object.keys(parsed)).toEqual(["ok", "strict", "project", "mode", "agentsDir", "operator", "errors", "warnings", "findings"]);
    expect(parsed).toEqual({
      ok: false,
      strict: true,
      project: "D:/proyecto",
      mode: "multi",
      agentsDir: "docs/agents",
      operator: "gersom",
      errors: 1,
      warnings: 0,
      findings: [{ severity: "error", code: "e", file: "a.md", line: 4, message: "m" }],
    });
  });

  test("un informe sin ubicar lleva null en modo, carpeta y operador", () => {
    const parsed = JSON.parse(renderJson(buildReport({ project: "x", mode: null, agentsDir: null, operator: null }, [], false)));
    expect(parsed).toMatchObject({ ok: true, mode: null, agentsDir: null, operator: null, findings: [] });
  });
});
