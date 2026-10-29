import { describe, expect, test } from "bun:test";
import { makeRules } from "../src/context.ts";

describe("makeRules", () => {
  test("guarda la cabecera y el texto completo (en LF)", () => {
    const rules = makeRules("docs/agents/rules.md", "a\r\nb\r\nc\r\nd\r\ne\r\n");
    expect(rules).toEqual({ file: "docs/agents/rules.md", exists: true, head: "a\nb\nc", text: "a\nb\nc\nd\ne\n" });
    expect(makeRules("docs/agents/rules.md", null)).toEqual({ file: "docs/agents/rules.md", exists: false, head: "", text: "" });
  });
});
