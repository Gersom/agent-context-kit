import { describe, expect, test } from "bun:test";
import { displayProjectName, plainText, progressBar, shortTaskName, truncate } from "../../src/ui/format.ts";

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

describe("nombres para la pantalla", () => {
  test("displayProjectName: mayúsculas y guiones como espacios (los guiones bajos quedan)", () => {
    expect(displayProjectName("agent-context-kit")).toBe("AGENT CONTEXT KIT");
    expect(displayProjectName("mi_proyecto-web")).toBe("MI_PROYECTO WEB");
  });

  test("shortTaskName: `T-N: título`, o `T-N` sin título", () => {
    expect(shortTaskName(4, "Deploy en skills.sh")).toBe("T-4: Deploy en skills.sh");
    expect(shortTaskName(12, null)).toBe("T-12");
  });
});
