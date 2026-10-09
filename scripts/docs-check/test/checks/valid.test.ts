import { describe, expect, test } from "bun:test";
import { runChecks } from "../../src/checks/index.ts";
import { BACKLOG_WITH_GROUP, HANDOFF_IDLE } from "../fixtures.ts";
import { makeCtx } from "../helpers.ts";

describe("documentos válidos (derivados de las plantillas)", () => {
  test("repo plano: sin hallazgos", () => {
    expect(runChecks(makeCtx())).toEqual([]);
  });

  test("repo multi-operador con team-backlog: sin hallazgos", () => {
    expect(runChecks(makeCtx({ mode: "multi" }))).toEqual([]);
  });

  test("sin tarea en curso: sin hallazgos", () => {
    expect(runChecks(makeCtx({ handoff: HANDOFF_IDLE }))).toEqual([]);
  });

  test("backlog con un grupo: sin hallazgos", () => {
    expect(runChecks(makeCtx({ backlog: BACKLOG_WITH_GROUP }))).toEqual([]);
  });
});
