import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSafe } from "../../src/io/files.ts";

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "task-tracker-"));
  mkdirSync(join(root, "mi-app", "docs", "agents"), { recursive: true });
  writeFileSync(join(root, "mi-app", "docs", "agents", "handoff.md"), "# Handoff\r\n\r\nx\r\n");
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("readFileSafe", () => {
  test("readFileSafe normaliza CRLF y devuelve null si no existe", () => {
    expect(readFileSafe(join(root, "mi-app", "docs", "agents", "handoff.md")).text).toBe("# Handoff\n\nx\n");
    expect(readFileSafe(join(root, "nada.md"))).toEqual({ text: null, error: null, code: null });
  });
});
