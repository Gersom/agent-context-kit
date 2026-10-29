import { describe, expect, test } from "bun:test";
import { findSections, ANCHOR_RE, HANDOFF_SECTIONS } from "../parse/sections.ts";
import { ANCHOR_PREFIX_PATTERN, legacyMarkerLines, MARKER_PREFIX, VERSION_MARKER_RE } from "../markers.ts";

describe("marcador de versión", () => {
  test("acepta x.y.z con el prefijo vigente o el anterior, con texto extra o sin él", () => {
    expect("<!-- agent-context-skill:version 2.10.3 -->".match(VERSION_MARKER_RE)?.[1]).toBe("2.10.3");
    expect("<!-- agent-context-skill:version 2.10.3-->".match(VERSION_MARKER_RE)?.[1]).toBe("2.10.3");
    expect("<!-- agent-context-skill:version 1.9.0 · cualquier texto -->".match(VERSION_MARKER_RE)?.[1]).toBe("1.9.0");
    expect("<!-- agent-context-kit:version 1.9.0 -->".match(VERSION_MARKER_RE)?.[1]).toBe("1.9.0");
  });

  test("rechaza versiones incompletas o con v", () => {
    for (const bad of ["1.9", "1.9.x", "v1.9.0"]) {
      expect(`<!-- agent-context-skill:version ${bad} -->`).not.toMatch(VERSION_MARKER_RE);
    }
  });
});

describe("prefijo de los marcadores", () => {
  test("el prefijo vigente coincide con el nombre del repo de la skill", () => {
    expect(MARKER_PREFIX).toBe("agent-context-skill");
    expect(ANCHOR_PREFIX_PATTERN).toContain("agent-context-kit");
  });

  test("las anclas se leen con el prefijo vigente y con el anterior a la 2.0.0", () => {
    expect("<!-- agent-context-skill:section=free -->".match(ANCHOR_RE)?.[1]).toBe("free");
    expect("<!-- agent-context-kit:section=blocked -->".match(ANCHOR_RE)?.[1]).toBe("blocked");
    expect("<!-- agent-docs-skill:section=free -->".match(ANCHOR_RE)).toBeNull();
  });

  test("un handoff con anclas del prefijo anterior se ubica por ancla, sin caer al plan B", () => {
    const text = [
      "# Handoff",
      "",
      "<!-- agent-context-kit:section=in-progress -->",
      "## Tarea en progreso",
      "",
      "Sin tarea en curso",
      "",
      "<!-- agent-context-kit:section=paused -->",
      "## Tareas pausadas",
      "",
      "Ninguna.",
      "",
    ].join("\n");
    const { usedFallback, missing } = findSections(text, HANDOFF_SECTIONS);
    expect(usedFallback).toBe(false);
    expect(missing).toEqual([]);
  });

  test("legacyMarkerLines devuelve las líneas con un prefijo anterior y no las del vigente", () => {
    const text = [
      "<!-- agent-context-kit:version 1.11.0 — x -->",
      "<!-- agent-context-skill:section=free -->",
      "<!-- agent-docs-skill:start -->",
      "texto agent-context-kit:section sin comentario",
      "<!-- agent-docs-skill:end -->",
    ].join("\n");
    expect(legacyMarkerLines(text)).toEqual([1, 3, 5]);
    expect(legacyMarkerLines("<!-- agent-context-skill:start -->\n<!-- agent-context-skill:version 2.0.0 -->")).toEqual([]);
  });
});
