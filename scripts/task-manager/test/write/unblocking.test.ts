// Lo que comparten `unblock` y `close`: veredicto de cada bloqueada y armado de lo que se mueve a
// «Tareas libres». Contra proyectos temporales: nunca se tocan los docs reales.

import { afterAll, describe, expect, test } from "bun:test";
import { CliError } from "../../src/cli/errors.ts";
import { applyEdits } from "../../src/edit/edits.ts";
import { buildState } from "../../src/query/state.ts";
import { STRINGS } from "../../src/write/language.ts";
import { insertIntoFree, judge, planUnblock, reviewBlocked } from "../../src/write/unblocking.ts";
import { BACKLOG_EMPTY, BACKLOG_RICH, HANDOFF_IDLE, HISTORY_RICH } from "../fixtures.ts";
import { loadDocs, makeProject, type Project } from "../helpers.ts";

const projects: Project[] = [];
function docsOf(backlog = BACKLOG_RICH) {
  const p = makeProject({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_IDLE, "backlog.md": backlog, "history.md": HISTORY_RICH } });
  projects.push(p);
  return loadDocs(p, "gersom");
}
afterAll(() => projects.forEach((p) => p.cleanup()));

describe("judge / reviewBlocked", () => {
  test("veredictos según lo que dice history.md (6: auto, 7: espera a la 3, 16: sin bloqueo vigente, 17: texto libre)", () => {
    const { verdicts } = reviewBlocked(buildState(docsOf()).blocked);
    expect([...verdicts]).toEqual([
      [6, "auto"],
      [7, "waiting"],
      [16, "stale"],
      [17, "manual"],
    ]);
  });

  test("una tarea que se está cerrando cuenta como cerrada aunque history.md todavía no la tenga", () => {
    const state = buildState(docsOf());
    const seven = state.blocked.find((info) => info.number === 7)!;
    expect(judge(seven)).toBe("waiting");
    expect(judge(seven, [3])).toBe("auto");
    expect(judge(seven, [4])).toBe("waiting");

    const { infos, verdicts } = reviewBlocked(state.blocked, [3]);
    expect(verdicts.get(7)).toBe("auto");
    expect(infos.find((info) => info.number === 7)!.refs.map((ref) => ref.state)).toEqual(["closed", "closed"]);
  });

  test("una referencia a la tarea de otro operador (`T-N@ana`) se deja para revisión manual aunque esté cerrada", () => {
    const [info] = buildState(docsOf()).blocked;
    expect(judge({ ...info, reason: "depende de T-11@ana" }, [11])).toBe("manual");
  });
});

describe("planUnblock / insertIntoFree", () => {
  test("arma los bloques con `Bloqueos` resuelto y los pone al final de «libres»", () => {
    const docs = docsOf();
    const state = buildState(docs);
    const chosen = state.blocked.filter((info) => info.number === 6);
    const plan = planUnblock(docs.backlog, chosen, "2026-10-07", STRINGS.es);
    expect(plan.blocks).toEqual(["### Tarea 6 — Publicar el sitio\n\n- **Bloqueos:** `[Resuelto el 2026-10-07]` — era `[dependencia]` depende de la Tarea 11."]);

    const out = applyEdits(docs.backlog.raw, docs.backlog.eol, [...plan.removals, insertIntoFree(docs.backlog, plan.blocks)]);
    expect(out).toContain("### Tarea 18 — Revisar los links\n\n- **Disparador:** antes del release.\n\n### Tarea 6 — Publicar el sitio\n\n- **Bloqueos:** `[Resuelto el 2026-10-07]`");
    expect(out).not.toContain("<!-- agent-context-kit:section=blocked -->\n## Tareas bloqueadas / pospuestas\n\n### Tarea 6");
  });

  test("`extraPicked` saca de «bloqueadas» otra tarea en la misma edición", () => {
    const docs = docsOf();
    const state = buildState(docs);
    const six = state.blocked.filter((info) => info.number === 6);
    const extra = docs.backlog.parsed.blocked.filter((task) => task.number === 17);
    const plan = planUnblock(docs.backlog, six, "2026-10-07", STRINGS.es, extra);
    const out = applyEdits(docs.backlog.raw, docs.backlog.eol, plan.removals);
    expect(out).not.toContain("Tarea 6 — Publicar el sitio");
    expect(out).not.toContain("Tarea 17 — Migrar a otro host");
    expect(out).toContain("Tarea 7 — Rehacer el README");
  });

  test("sin tareas libres, el bloque reemplaza el «Ninguna.»", () => {
    const docs = docsOf(BACKLOG_EMPTY);
    const out = applyEdits(docs.backlog.raw, docs.backlog.eol, [insertIntoFree(docs.backlog, ["### Tarea 9 — X\n\n- **Descripción:** x"])]);
    expect(out).toContain("## Tareas libres\n\n### Tarea 9 — X\n\n- **Descripción:** x\n\n<!-- agent-context-kit:section=blocked -->");
  });

  test("falta la sección «bloqueadas» o «libres»: error que no escribe nada", () => {
    const noBlocked = docsOf("# Backlog\n\n**Próximo número de tarea:** 5\n\n<!-- agent-context-kit:section=free -->\n## Tareas libres\n\nNinguna.\n");
    const chosen = [{ number: 1, title: "x", tag: "dependencia", reason: null, refs: [], unblockCandidate: false }];
    expect(() => planUnblock(noBlocked.backlog, chosen, "2026-10-07", STRINGS.es)).toThrow(CliError);
  });
});
