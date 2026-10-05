import { describe, expect, test } from "bun:test";
import { plainText, progressBar, truncate } from "../../src/ui/format.ts";

describe("helpers de formato", () => {
  test("truncate agrega … y respeta caracteres multibyte", () => {
    expect(truncate("áéíóú-abc", 5)).toBe("áéíó…");
    expect(truncate("corto", 10)).toBe("corto");
  });

  test("plainText quita negritas y backticks", () => {
    expect(plainText("**sin** `package.json`")).toBe("sin package.json");
  });

  test("progressBar", () => {
    expect(progressBar(0, 0, 4)).toBe("[░░░░]");
    expect(progressBar(2, 4, 4)).toBe("[██░░]");
  });
});
