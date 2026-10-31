// `block` y `unblock`: mueven tareas del backlog entre «libres» y «bloqueadas / pospuestas» y
// reescriben su campo `Bloqueos`. Contra proyectos temporales: nunca se tocan los docs reales.

import { afterAll, describe, expect, test } from "bun:test";
import { APPLY_NOTICE } from "../../src/cli/dispatch.ts";
import { BACKLOG_EN, BACKLOG_ONE, BACKLOG_RICH, HANDOFF_EMPTY, HANDOFF_IDLE, HANDOFF_IDLE_EN, HISTORY_EN, HISTORY_RICH, TEAM_RICH } from "../fixtures.ts";
import { exec, makeProject, type Project, readIn, snapshot } from "../helpers.ts";

const projects: Project[] = [];
function project(options: Parameters<typeof makeProject>[0]): Project {
  const p = makeProject(options);
  projects.push(p);
  return p;
}
afterAll(() => projects.forEach((p) => p.cleanup()));

const IDLE = { contents: { "handoff.md": HANDOFF_IDLE, "backlog.md": BACKLOG_RICH, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH };
const backlog = (p: Project) => readIn(p, "gersom", "backlog.md");
const BLOCK = ["block", "1", "--tag", "dependency", "--reason", "depende de la Tarea 2"];

describe("block", () => {
  test("sin --apply muestra el diff y no escribe nada", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    const before = snapshot(p.root);
    const { code, out } = await exec(BLOCK, p);
    expect(code).toBe(0);
    expect(out).toContain("-### Tarea 1 — Probar el flujo completo");
    expect(out).toContain("+- **Bloqueos:** `[dependencia]` depende de la Tarea 2");
    expect(out).toContain(APPLY_NOTICE);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("saca la tarea de «libres» y la pone al final de «bloqueadas» con su `Bloqueos` actualizado", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    const { code, out } = await exec([...BLOCK, "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Tarea 1 bloqueada (dependencia): pasó de «Tareas libres» a «Tareas bloqueadas / pospuestas» de docs/agents/gersom/backlog.md.");
    const tarea1 =
      "### Tarea 1 — Probar el flujo completo\n\n- **Descripción:** CUERPO-1\n- **Bloqueos:** Ninguno.\n- **Disparador:** cuando el operador pregunte por tareas pendientes.\n\n";
    expect(backlog(p)).toBe(
      BACKLOG_RICH.replace(tarea1, "").replace(
        "esperar a la Tarea 11.",
        "esperar a la Tarea 11.",
      ).replace(
        "hasta nuevo aviso del operador.\n",
        "hasta nuevo aviso del operador.\n\n### Tarea 1 — Probar el flujo completo\n\n- **Descripción:** CUERPO-1\n- **Bloqueos:** `[dependencia]` depende de la Tarea 2\n- **Disparador:** cuando el operador pregunte por tareas pendientes.\n",
      ),
    );
    const state = JSON.parse((await exec(["status", "--json"], p)).out);
    expect(state.free.map((t: { number: number }) => t.number)).not.toContain(1);
    expect(state.blocked.at(-1)).toMatchObject({ number: 1, tag: "dependencia", reason: "depende de la Tarea 2", refs: [{ number: 2, state: "closed" }] });
  });

  test("una tarea que traía un `[Resuelto ...]` lo conserva después del bloqueo vigente", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    await exec(["block", "3", "--tag", "[postponed]", "--reason", "esperar el rediseño", "--apply"], p);
    expect(backlog(p)).toContain("- **Bloqueos:** `[postergada]` esperar el rediseño `[Resuelto el 2026-09-24]` — era `[postergada]`.\n- **Disparador:**");
    const state = JSON.parse((await exec(["status", "--json"], p)).out);
    expect(state.blocked.at(-1)).toMatchObject({ number: 3, tag: "postergada", reason: "esperar el rediseño" });
  });

  test("una tarea sin campo `Bloqueos` lo recibe tras la descripción", async () => {
    const raw = BACKLOG_RICH.replace("### Tarea 18 — Revisar los links\n\n- **Disparador:** antes del release.", "### Tarea 18 — Revisar los links\n\n- **Descripción:** links.\n- **Disparador:** antes del release.");
    const p = project({ folders: ["gersom"], ...IDLE, contents: { ...IDLE.contents, "backlog.md": raw } });
    await exec(["block", "18", "--tag", "postponed", "--reason", "después", "--apply"], p);
    expect(backlog(p)).toContain("### Tarea 18 — Revisar los links\n\n- **Descripción:** links.\n- **Bloqueos:** `[postergada]` después\n- **Disparador:** antes del release.");
  });

  test("si era la única libre, «libres» queda con «Ninguna.» y «bloqueadas» deja de estar vacía", async () => {
    const p = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_EMPTY, "backlog.md": BACKLOG_ONE, "history.md": "# History\n" } });
    await exec(["block", "7", "--tag", "dependency", "--reason", "falta la API", "--apply"], p);
    const text = backlog(p);
    expect(text).toContain("## Tareas libres\n\nNinguna.\n\n<!-- agent-context-skill:section=blocked -->\n## Tareas bloqueadas / pospuestas\n\n### Tarea 7 — La única");
    expect(text).toContain("- **Bloqueos:** `[dependencia]` falta la API");
    expect(text).toContain("<!-- agent-context-skill:section=grouped -->");
  });

  test("--json", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    const pending = JSON.parse((await exec([...BLOCK, "--json"], p)).out);
    expect(pending).toMatchObject({ command: "block", applied: false, pending: true, tag: "dependencia", task: { number: 1 } });
    expect(JSON.parse((await exec([...BLOCK, "--json", "--apply"], p)).out)).toMatchObject({ applied: true });
  });

  test("--json: `tag` sigue el idioma del proyecto (`dependency` en inglés, `dependencia` en español)", async () => {
    const en = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_IDLE_EN, "backlog.md": BACKLOG_EN, "history.md": HISTORY_EN } });
    expect(JSON.parse((await exec(["block", "4", "--tag", "dependency", "--reason", "needs Task 5", "--json"], en)).out)).toMatchObject({ command: "block", tag: "dependency", task: { number: 4 } });
    const es = project({ folders: ["gersom"], ...IDLE });
    expect(JSON.parse((await exec([...BLOCK, "--json"], es)).out)).toMatchObject({ command: "block", tag: "dependencia", task: { number: 1 } });
  });

  describe("errores: no se escribe nada", () => {
    test("uso: falta tarea, tag o motivo; tag inválido", async () => {
      const p = project({ folders: ["gersom"], ...IDLE });
      const before = snapshot(p.root);
      expect((await exec(["block", "--tag", "dependency", "--reason", "x", "--apply"], p)).code).toBe(2);
      expect((await exec(["block", "1", "--reason", "x", "--apply"], p)).code).toBe(2);
      expect((await exec(["block", "1", "--tag", "dependency", "--apply"], p)).code).toBe(2);
      const bad = await exec(["block", "1", "--tag", "urgente", "--reason", "x", "--apply"], p);
      expect(bad.code).toBe(2);
      expect(bad.err).toContain("`dependency` o `postponed`");
      expect((await exec(["block", "algo", "--tag", "dependency", "--reason", "x", "--apply"], p)).code).toBe(2);
      expect(snapshot(p.root)).toEqual(before);
    });

    test("la tarea no es libre: bloqueada, agrupada, pausada, cerrada, de otro operador o inexistente", async () => {
      const p = project({ folders: ["gersom", "ana"], ...IDLE });
      const before = snapshot(p.root);
      const run = (n: string) => exec(["block", n, "--tag", "dependency", "--reason", "x", "--apply"], p);
      expect((await run("6")).err).toContain("ya está en «bloqueadas / pospuestas» (dependencia: depende de la Tarea 11.)");
      const grouped = (await run("14")).err;
      expect(grouped).toContain("tarea agrupada (grupo «Documentar los planes»)");
      expect(grouped).toContain("acsuite task group-eject 14");
      expect((await run("8")).err).toContain("está pausada");
      expect((await run("11")).err).toContain("ya está cerrada");
      expect((await run("1@ana")).err).toContain("de otro operador");
      expect((await run("99")).err).toContain("No existe la Tarea 99");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("carpeta de otro operador: se niega", async () => {
      const p = project({ folders: ["gersom", "ana"], ...IDLE, folderContents: { ana: IDLE.contents } });
      expect((await exec([...BLOCK, "--operator", "ana", "--apply"], p)).err).toContain("«ana» no es la tuya");
    });
  });

  test("--tag dependency / postponed escribe el tag en el idioma del proyecto: español en uno en español", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    await exec(["block", "1", "--tag", "dependency", "--reason", "depende de la Tarea 2", "--apply"], p);
    await exec(["block", "18", "--tag", "postponed", "--reason", "después", "--apply"], p);
    expect(backlog(p)).toContain("- **Bloqueos:** `[dependencia]` depende de la Tarea 2\n");
    expect(backlog(p)).toContain("- **Bloqueos:** `[postergada]` después\n");
    expect(backlog(p)).not.toContain("[dependency]");
    expect(backlog(p)).not.toContain("[postponed]");
  });

  test("--tag dependency / postponed escribe el tag en el idioma del proyecto: inglés en uno en inglés", async () => {
    const p = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_IDLE_EN, "backlog.md": BACKLOG_EN, "history.md": HISTORY_EN } });
    expect((await exec(["block", "4", "--tag", "postponed", "--reason", "wait for the redesign", "--apply"], p)).code).toBe(0);
    expect(backlog(p)).toContain("- **Blockers:** `[postponed]` wait for the redesign\n");
    expect(backlog(p)).not.toContain("[postergada]");
  });

  test("un proyecto en inglés: block escribe `[dependency]`, status lo lee y unblock / close la desbloquean", async () => {
    const raw = BACKLOG_EN.replace(
      "- **Added:** 2026-10-01.\n\n<!-- agent-context-skill:section=blocked -->",
      "- **Added:** 2026-10-01.\n\n### Task 3 — Publish the glossary\n\n- **Description:** publish it.\n- **Blockers:** None.\n- **Trigger:** after the translation.\n- **Added:** 2026-10-01.\n\n<!-- agent-context-skill:section=blocked -->",
    );
    const p = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_IDLE_EN, "backlog.md": raw, "history.md": HISTORY_EN } });
    const status = async () => JSON.parse((await exec(["status", "--json"], p)).out);
    const numbers = (tasks: Array<{ number: number }>) => tasks.map((t) => t.number);

    expect((await exec(["block", "3", "--tag", "dependency", "--reason", "needs Task 4", "--apply"], p)).code).toBe(0);
    expect(backlog(p)).toContain("- **Blockers:** `[dependency]` needs Task 4\n");
    expect((await status()).blocked.at(-1)).toMatchObject({ number: 3, tag: "dependency", reason: "needs Task 4" });

    // unblock a mano
    expect((await exec(["unblock", "3", "--apply"], p)).code).toBe(0);
    let state = await status();
    expect(numbers(state.free)).toContain(3);
    expect(numbers(state.blocked)).not.toContain(3);

    // y la desbloquea close al cerrar la tarea de la que depende
    await exec(["block", "3", "--tag", "dependency", "--reason", "needs Task 4", "--apply"], p);
    expect(numbers((await status()).blocked)).toContain(3);
    await exec(["start", "4", "--apply"], p);
    const closed = await exec(["close", "--done", "--summary", "Translated.", "--apply"], p);
    expect(closed.code).toBe(0);
    expect(closed.out).toContain("- Task 3 — Publish the glossary");
    state = await status();
    expect(numbers(state.free)).toContain(3);
    expect(numbers(state.blocked)).not.toContain(3);
  });

  test("--tag con los valores en español (o inventados) es un error de uso y no escribe nada", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    const before = snapshot(p.root);
    for (const value of ["dependencia", "postergada", "[dependencia]", "urgente"]) {
      const { code, err } = await exec(["block", "1", "--tag", value, "--reason", "x", "--apply"], p);
      expect(code).toBe(2);
      expect(err).toContain("`dependency` o `postponed`");
    }
    const spanish = await exec(["block", "1", "--tag", "dependencia", "--reason", "x", "--apply"], p);
    expect(spanish.err).toContain("los valores en español ya no valen");
    expect(snapshot(p.root)).toEqual(before);
  });

  test("los flags en español (--motivo) son desconocidos: código 2 y no se escribe nada", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    const before = snapshot(p.root);
    const { code, err } = await exec(["block", "1", "--tag", "dependency", "--motivo", "x", "--apply"], p);
    expect(code).toBe(2);
    expect(err).toContain("Flag desconocido: --motivo.");
    expect(snapshot(p.root)).toEqual(before);
  });

  test("un proyecto en inglés y CRLF", async () => {
    const crlf = (text: string) => text.replace(/\n/g, "\r\n");
    const p = project({ folders: ["gersom"], contents: { "handoff.md": crlf(HANDOFF_IDLE_EN), "backlog.md": crlf(BACKLOG_EN), "history.md": crlf(HISTORY_EN) } });
    expect((await exec(["block", "4", "--tag", "dependency", "--reason", "needs Task 5", "--apply"], p)).code).toBe(0);
    const text = backlog(p);
    expect(text.replace(/\r\n/g, "")).not.toContain("\n");
    expect(text).toContain("## Free tasks\r\n\r\nNone.\r\n");
    expect(text).toContain("- **Blockers:** `[dependency]` needs Task 5\r\n");
  });
});

describe("unblock", () => {
  test("sin argumentos y sin --apply: lista qué haría y no escribe", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    const before = snapshot(p.root);
    const { code, out } = await exec(["unblock"], p);
    expect(code).toBe(0);
    expect(out).toContain("Se desbloquearían (2):");
    expect(out).toContain("Tarea 6 — Publicar el sitio — Tarea 11 cerrada");
    expect(out).toContain("Tarea 16 — Revisar la licencia — ya no tenía un bloqueo vigente");
    expect(out).toContain("Para revisar a mano");
    expect(out).toContain("Tarea 17 — Migrar a otro host [postergada] → hasta nuevo aviso del operador.");
    expect(out).toContain("Siguen bloqueadas:");
    expect(out).toContain("Tarea 7 — Rehacer el README [postergada] → Tarea 11 (cerrada), Tarea 3 (libre)");
    expect(out).toContain(APPLY_NOTICE);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("sin argumentos: desbloquea solas las que dependían de tareas cerradas (y las sin bloqueo vigente) y deja el resto", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    const { code, out } = await exec(["unblock", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toContain("Desbloqueadas (2), pasaron a «Tareas libres» de docs/agents/gersom/backlog.md:");
    const text = backlog(p);
    // Al final de «libres», con el `Bloqueos` resuelto sin perder el motivo; la 16 ya estaba resuelta y no cambia.
    expect(text).toContain(
      "### Tarea 18 — Revisar los links\n\n- **Disparador:** antes del release.\n\n### Tarea 6 — Publicar el sitio\n\n- **Bloqueos:** `[Resuelto el 2026-10-07]` — era `[dependencia]` depende de la Tarea 11.\n\n### Tarea 16 — Revisar la licencia\n\n- **Bloqueos:** `[Resuelto el 2026-10-01]` — era `[dependencia]` la Tarea 11.\n\n<!-- agent-context-skill:section=blocked -->",
    );
    expect(text).toContain("## Tareas bloqueadas / pospuestas\n\n### Tarea 7 — Rehacer el README\n\n- **Bloqueos:** `[postergada]` esperar a la Tarea 11 y a la Tarea 3.\n\n### Tarea 17 — Migrar a otro host");
    expect(text).not.toMatch(/\n\n\n/);
    const state = JSON.parse((await exec(["status", "--json"], p)).out);
    expect(state.free.map((t: { number: number }) => t.number)).toEqual([1, 14, 15, 3, 18, 6, 16]);
    expect(state.blocked.map((t: { number: number }) => t.number)).toEqual([7, 17]);
    // Repetirlo ya no tiene nada que desbloquear.
    const again = await exec(["unblock", "--apply"], p);
    expect(again.out).toContain("Ninguna tarea bloqueada se puede desbloquear sola.");
    expect(backlog(p)).toBe(text);
  });

  test("`unblock N` desbloquea esa tarea aunque el motivo sea texto libre", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    const { out } = await exec(["unblock", "17", "--apply"], p);
    expect(out).toContain("Tarea 17 — Migrar a otro host — decidido por quien lo pidió");
    expect(backlog(p)).toContain("- **Bloqueos:** `[Resuelto el 2026-10-07]` — era `[postergada]` hasta nuevo aviso del operador.\n\n<!-- agent-context-skill:section=blocked -->");
    expect(backlog(p)).toContain("## Tareas bloqueadas / pospuestas\n\n### Tarea 6 —");
    // Las demás bloqueadas no se tocan ni se listan.
    expect(out).not.toContain("Para revisar a mano");
  });

  test("las tareas con una referencia `T-N@operador` van a revisión manual aunque `T-N` esté cerrada", async () => {
    const raw = BACKLOG_RICH.replace("depende de la Tarea 11.", "depende de T-11@ana.");
    const p = project({ folders: ["gersom"], ...IDLE, contents: { ...IDLE.contents, "backlog.md": raw } });
    const { out } = await exec(["unblock", "--apply"], p);
    expect(out).toContain("Desbloqueadas (1)");
    expect(out).toContain("Para revisar a mano");
    expect(backlog(p)).toContain("### Tarea 6 — Publicar el sitio\n\n- **Bloqueos:** `[dependencia]` depende de T-11@ana.");
  });

  test("si no queda ninguna bloqueada, «bloqueadas» vuelve a «Ninguna.»; si «libres» estaba vacía, la tarea la reemplaza", async () => {
    // La única tarea está en «bloqueadas»; «libres» dice «Ninguna.».
    const taskRe = /### Tarea 7 — La única[^]*?2026-10-01\.\n/;
    const task = BACKLOG_ONE.match(taskRe)![0].replace("- **Bloqueos:** Ninguno.", "- **Bloqueos:** `[dependencia]` depende de la Tarea 11.");
    const blocked = BACKLOG_ONE.replace(taskRe, "Ninguna.\n").replace("## Tareas bloqueadas / pospuestas\n\nNinguna.\n", `## Tareas bloqueadas / pospuestas\n\n${task}`);
    const p = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_EMPTY, "backlog.md": blocked, "history.md": HISTORY_RICH } });
    await exec(["unblock", "--apply"], p);
    const text = backlog(p);
    expect(text).toContain("## Tareas libres\n\n### Tarea 7 — La única");
    expect(text).toContain("## Tareas bloqueadas / pospuestas\n\nNinguna.\n\n<!-- agent-context-skill:section=grouped -->");
    expect(text).toContain("- **Bloqueos:** `[Resuelto el 2026-10-07]` — era `[dependencia]` depende de la Tarea 11.");
  });

  test("block + unblock: ida y vuelta (el historial queda como `Resuelto`)", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    await exec(["block", "1", "--tag", "dependency", "--reason", "depende de la Tarea 11", "--apply"], p);
    await exec(["unblock", "1", "--apply"], p);
    expect(backlog(p)).toContain("### Tarea 1 — Probar el flujo completo\n\n- **Descripción:** CUERPO-1\n- **Bloqueos:** `[Resuelto el 2026-10-07]` — era `[dependencia]` depende de la Tarea 11\n");
    const state = JSON.parse((await exec(["status", "--json"], p)).out);
    expect(state.free.map((t: { number: number }) => t.number)).toContain(1);
    expect(state.blocked.map((t: { number: number }) => t.number)).not.toContain(1);
  });

  test("--json", async () => {
    const p = project({ folders: ["gersom"], ...IDLE });
    const out = JSON.parse((await exec(["unblock", "--json", "--apply"], p)).out);
    expect(out).toMatchObject({ command: "unblock", applied: true });
    expect(out.unblocked.map((t: { number: number }) => t.number)).toEqual([6, 16]);
    expect(out.manualReview.map((t: { number: number }) => t.number)).toEqual([17]);
    expect(out.stillBlocked.map((t: { number: number }) => t.number)).toEqual([7]);
    const none = JSON.parse((await exec(["unblock", "--json"], p)).out);
    expect(none).toMatchObject({ applied: false, unblocked: [] });
  });

  describe("errores: no se escribe nada", () => {
    test("`unblock N` de una tarea que no está bloqueada, inexistente, de otro operador o con dos argumentos", async () => {
      const p = project({ folders: ["gersom", "ana"], ...IDLE });
      const before = snapshot(p.root);
      expect((await exec(["unblock", "1", "--apply"], p)).err).toContain("no está en «bloqueadas / pospuestas» (está en: free)");
      expect((await exec(["unblock", "99", "--apply"], p)).err).toContain("No existe la Tarea 99");
      expect((await exec(["unblock", "6@ana", "--apply"], p)).err).toContain("de otro operador");
      expect((await exec(["unblock", "6", "7", "--apply"], p)).code).toBe(2);
      expect((await exec(["unblock", "algo", "--apply"], p)).code).toBe(2);
      expect(snapshot(p.root)).toEqual(before);
    });

    test("carpeta de otro operador: se niega", async () => {
      const p = project({ folders: ["gersom", "ana"], ...IDLE, folderContents: { ana: IDLE.contents } });
      expect((await exec(["unblock", "--operator", "ana", "--apply"], p)).err).toContain("«ana» no es la tuya");
    });
  });
});
