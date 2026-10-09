// Informe: del conjunto de hallazgos al texto para la terminal o al objeto JSON. Funciones puras.

import type { Finding } from "./types.ts";

/** Qué se revisó: lo que muestra la cabecera y lleva el JSON. */
export interface ReportMeta {
  /** Raíz del proyecto (ruta absoluta; la ruta indicada si no se pudo ubicar la raíz). */
  project: string;
  /** `null` si no se pudo ubicar la documentación. */
  mode: "flat" | "multi" | null;
  /** Carpeta de agentes, relativa a la raíz del proyecto; `null` si no se pudo ubicar. */
  agentsDir: string | null;
  /** Carpeta del operador resuelto; `null` en el repo plano o si no se resolvió. */
  operator: string | null;
}

export interface Report extends ReportMeta {
  /** `false` si hay errores, o avisos con `strict`: el código de salida es 1. */
  ok: boolean;
  strict: boolean;
  errors: number;
  warnings: number;
  findings: Finding[];
}

/** Por archivo, luego por línea (los del archivo entero, primero) y por código. */
export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0) || a.code.localeCompare(b.code),
  );
}

export function buildReport(meta: ReportMeta, findings: Finding[], strict: boolean): Report {
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.length - errors;
  return { ok: errors === 0 && !(strict && warnings > 0), strict, ...meta, errors, warnings, findings: sortFindings(findings) };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** El informe para la terminal: cabecera, hallazgos agrupados por archivo y resumen. */
export function renderText(report: Report): string[] {
  const lines = [
    `Proyecto:  ${report.project}`,
    `Modo:      ${report.mode === "flat" ? "plano" : (report.mode ?? "(sin ubicar)")}`,
    `Agentes:   ${report.agentsDir ?? "(sin ubicar)"}`,
    `Operador:  ${report.operator ?? (report.mode === "flat" ? "(ninguno: repo plano)" : "(sin resolver)")}`,
  ];

  let currentFile: string | null = null;
  for (const finding of report.findings) {
    if (finding.file !== currentFile) {
      lines.push("");
      currentFile = finding.file;
    }
    const where = finding.line === null ? finding.file : `${finding.file}:${finding.line}`;
    lines.push(`${finding.severity === "error" ? "error" : "aviso"}  ${where}  [${finding.code}] ${finding.message}`);
  }

  lines.push("", `${plural(report.errors, "error", "errores")}, ${plural(report.warnings, "aviso", "avisos")}`);
  if (report.errors === 0) {
    lines.push("Listo para trabajar con la skill y con `bun run task`.");
    if (report.warnings > 0) {
      lines.push(
        report.strict
          ? "Con --strict los avisos también hacen fallar: revísalos."
          : "Revisa los avisos: no impiden trabajar, pero parte del contenido no se verá o se editará con menos seguridad.",
      );
    }
  } else {
    lines.push("Corrige los errores: sin eso el seguimiento (`bun run tasks`) y `bun run task` no pueden trabajar bien con este proyecto.");
  }
  return lines;
}

/** El informe como un único objeto JSON. */
export function renderJson(report: Report): string {
  const { ok, strict, project, mode, agentsDir, operator, errors, warnings, findings } = report;
  return JSON.stringify({ ok, strict, project, mode, agentsDir, operator, errors, warnings, findings }, null, 2);
}
