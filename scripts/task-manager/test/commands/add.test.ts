// `add`: agrega una tarea al backlog propio o, con `--team`, al team-backlog.md. Contra proyectos
// temporales: nunca se tocan los docs reales.

import { afterAll, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APPLY_NOTICE, run } from "../../src/cli/dispatch.ts";
import {
  BACKLOG_EMPTY,
  BACKLOG_EN,
  BACKLOG_ONE,
  BACKLOG_RICH,
  BACKLOG_TEMPLATE,
  HANDOFF_EMPTY,
  HANDOFF_IDLE,
  HANDOFF_IDLE_EN,
  HISTORY_EN,
  HISTORY_RICH,
  TEAM_RICH,
  TEAM_TEMPLATE,
  TEAM_TWO,
} from "../fixtures.ts";
import { captureIo, makeProject, type Project } from "../helpers.ts";

const projects: Project[] = [];
function project(options: Parameters<typeof makeProject>[0]): Project {
  const p = makeProject(options);
  projects.push(p);
  return p;
}
afterAll(() => projects.forEach((p) => p.cleanup()));

function snapshot(root: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of readdirSync(root, { recursive: true, encoding: "utf8" })) {
    try {
      result[name] = readFileSync(join(root, name), "utf8");
    } catch {
      // carpetas
    }
  }
  return result;
}

/** Hoy, fijo (el reloj se inyecta; hora local). */
const NOW = () => new Date(2026, 9, 7, 15, 30);

async function exec(argv: string[], p: Project, options: { email?: string | null; stdin?: string } = {}) {
  const cap = captureIo();
  const code = await run(argv, {
    io: cap.io,
    email: options.email === undefined ? "gersom@mail.com" : options.email,
    baseDir: p.root,
    now: NOW,
    readStdin: async () => options.stdin ?? "",
  });
  return { code, out: cap.text(), err: cap.err.join("\n") };
}

/** Un operador con ese backlog, sin tareas en el handoff ni en history (para no mezclar números). */
const own = (backlog: string) => ({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_EMPTY, "backlog.md": backlog, "history.md": "# History\n" } });

const RICH = { contents: { "handoff.md": HANDOFF_IDLE, "backlog.md": BACKLOG_RICH, "history.md": HISTORY_RICH }, teamBacklogText: TEAM_RICH };
const read = (p: Project, ...parts: string[]) => readFileSync(join(p.agents, ...parts), "utf8");

describe("add — backlog propio", () => {
  test("sin --apply muestra el diff y no escribe nada", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    const before = snapshot(p.root);
    const { code, out } = await exec(["add", "--titulo", "Nueva", "--descripcion", "Algo"], p);
    expect(code).toBe(0);
    expect(out).toContain("+### Tarea 20 — Nueva");
    expect(out).toContain("-**Próximo número de tarea:** 20");
    expect(out).toContain("+**Próximo número de tarea:** 21");
    expect(out).toContain(APPLY_NOTICE);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("--dry-run + --apply tampoco escribe", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    const before = snapshot(p.root);
    const { out } = await exec(["add", "--titulo", "Nueva", "--descripcion", "Algo", "--apply", "--dry-run"], p);
    expect(out).toContain("--dry-run: no se escribió nada.");
    expect(snapshot(p.root)).toEqual(before);
  });

  test("libre: al final de «libres» con el espaciado del archivo, con los defaults de la plantilla y la fecha de hoy", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    const { code, out } = await exec(["add", "--titulo", "Nueva tarea", "--descripcion", "Una descripción", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Tarea 20 agregada a «Tareas libres» de docs/agents/gersom/backlog.md (próximo número: 21).");
    const expected = BACKLOG_RICH.replace("**Próximo número de tarea:** 20", "**Próximo número de tarea:** 21").replace(
      "- **Disparador:** antes del release.\n\n",
      [
        "- **Disparador:** antes del release.",
        "",
        "### Tarea 20 — Nueva tarea",
        "",
        "- **Descripción:** Una descripción",
        "- **Decisiones/temas a definir antes de empezar:** Ninguno.",
        "- **Bloqueos:** Ninguno.",
        "- **Disparador:** cuando el operador pregunte por tareas pendientes.",
        "- **Agregada:** 2026-10-07.",
        "",
        "",
      ].join("\n"),
    );
    expect(read(p, "gersom", "backlog.md")).toBe(expected);
    // el resto de archivos, intactos
    expect(read(p, "gersom", "handoff.md")).toBe(HANDOFF_IDLE);
    expect(read(p, "gersom", "history.md")).toBe(HISTORY_RICH);
  });

  test("usa las etiquetas de las tareas que ya tiene el archivo y todos los campos opcionales", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    await exec(
      ["add", "--titulo", "Completa", "--descripcion", "D", "--decisiones", "¿A o B?", "--disparador", "cuando haya tiempo", "--detalles", "Más contexto", "--apply"],
      p,
    );
    const text = read(p, "gersom", "backlog.md");
    expect(text).toContain(
      "### Tarea 20 — Completa\n\n- **Descripción:** D\n- **Decisiones/temas a definir antes de empezar:** ¿A o B?\n- **Bloqueos:** Ninguno.\n- **Disparador:** cuando haya tiempo\n- **Detalles:** Más contexto\n- **Agregada:** 2026-10-07.\n\n<!-- agent-context-kit:section=blocked -->",
    );
  });

  test("con bloqueo `[dependencia]`/`[postergada]` va al final de «bloqueadas»", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    const { out } = await exec(["add", "--titulo", "Bloqueada", "--descripcion", "D", "--bloqueo", "`[dependencia]` espera la Tarea 3", "--apply"], p);
    expect(out).toContain("«Tareas bloqueadas / pospuestas»");
    const text = read(p, "gersom", "backlog.md");
    const blocked = text.slice(text.indexOf("section=blocked"), text.indexOf("section=grouped"));
    expect(blocked).toContain("- **Bloqueos:** `[postergada]` hasta nuevo aviso del operador.\n\n### Tarea 20 — Bloqueada\n\n- **Descripción:** D");
    expect(blocked).toContain("- **Bloqueos:** `[dependencia]` espera la Tarea 3\n");
    expect(text).toContain("**Próximo número de tarea:** 21");
    expect(text.slice(0, text.indexOf("section=free"))).not.toContain("Tarea 20 — Bloqueada");
  });

  test("un bloqueo sin tag conocido va a libres y avisa", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    const { out } = await exec(["add", "--titulo", "T", "--descripcion", "D", "--bloqueo", "esperar al cliente", "--apply"], p);
    expect(out).toContain("Aviso: --bloqueo no empieza con `[dependencia]` ni `[postergada]`");
    const text = read(p, "gersom", "backlog.md");
    expect(text.indexOf("### Tarea 20 — T")).toBeLessThan(text.indexOf("section=blocked"));
    expect(text).toContain("- **Bloqueos:** esperar al cliente");
  });

  test("sección vacía con «Ninguna.»: la tarea la reemplaza; el contador, N+1", async () => {
    const p = project(own(BACKLOG_EMPTY));
    await exec(["add", "--titulo", "Primera", "--descripcion", "D", "--apply"], p);
    const text = read(p, "gersom", "backlog.md");
    expect(text).toContain("## Tareas libres\n\n### Tarea 5 — Primera\n\n- **Descripción:** D");
    expect(text).toContain("- **Agregada:** 2026-10-07.\n\n<!-- agent-context-kit:section=blocked -->\n## Tareas bloqueadas / pospuestas\n\nNinguna.\n");
    expect(text).toContain("**Próximo número de tarea:** 6");
    expect(text).not.toContain("Ninguna.\n\n<!-- agent-context-kit:section=blocked -->");
    // una bloqueada en la sección vacía de bloqueadas: reemplaza el «Ninguna.» de esa sección
    await exec(["add", "--titulo", "Esperando", "--descripcion", "D", "--bloqueo", "`[postergada]` luego", "--apply"], p);
    const after = read(p, "gersom", "backlog.md");
    expect(after).toContain("## Tareas bloqueadas / pospuestas\n\n### Tarea 6 — Esperando");
    expect(after).toContain("<!-- agent-context-kit:section=grouped -->\n## Tareas agrupadas\n\nNo aplica todavía");
    expect(after).toContain("**Próximo número de tarea:** 7");
  });

  test("sección con el placeholder de la plantilla: la tarea lo reemplaza", async () => {
    const p = project(own(BACKLOG_TEMPLATE));
    await exec(["add", "--titulo", "Primera", "--descripcion", "D", "--apply"], p);
    await exec(["add", "--titulo", "Segunda", "--descripcion", "D", "--bloqueo", "`[dependencia]` x", "--apply"], p);
    const text = read(p, "gersom", "backlog.md");
    expect(text).not.toContain("Placeholder");
    expect(text).toContain("## Tareas libres\n\n### Tarea 1 — Primera\n\n");
    expect(text).toContain("## Tareas bloqueadas / pospuestas\n\n### Tarea 2 — Segunda\n\n");
    expect(text).toContain("**Próximo número de tarea:** 3");
  });

  test("respeta el espaciado del archivo: si separa las tareas con dos líneas en blanco, usa dos", async () => {
    const backlog = BACKLOG_ONE.replace("<!-- agent-context-kit:section=blocked -->", "### Tarea 6 — Otra\n\n- **Descripción:** x\n\n<!-- agent-context-kit:section=blocked -->").replace(
      "### Tarea 6 — Otra",
      "\n### Tarea 6 — Otra",
    );
    const p = project(own(backlog));
    await exec(["add", "--titulo", "N", "--descripcion", "D", "--apply"], p);
    // entre «Tarea 7» y «Tarea 6» hay dos líneas en blanco: la nueva se separa igual
    expect(read(p, "gersom", "backlog.md")).toContain("- **Descripción:** x\n\n\n### Tarea 8 — N\n");
  });

  test("las tareas agrupadas no se tocan: el grupo no recibe tareas nuevas", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    await exec(["add", "--titulo", "N", "--descripcion", "D", "--apply"], p);
    const text = read(p, "gersom", "backlog.md");
    expect(text.slice(text.indexOf("section=grouped"))).toBe(BACKLOG_RICH.slice(BACKLOG_RICH.indexOf("section=grouped")));
  });

  test("texto largo por stdin (solo un flag)", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    await exec(["add", "--titulo", "T", "--descripcion", "-", "--apply"], p, { stdin: "Primera línea\n- sublista\nTercera" });
    expect(read(p, "gersom", "backlog.md")).toContain("- **Descripción:** Primera línea\n  - sublista\n  Tercera\n- **Decisiones");
    const two = await exec(["add", "--titulo", "-", "--descripcion", "-"], p, { stdin: "x" });
    expect(two.code).toBe(2);
    expect(two.err).toContain("Solo un flag puede leer la entrada estándar");
  });

  test("la tarea que escribe la lee el parser con el número, los campos y la lista de libres", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    await exec(["add", "--titulo", "Visible", "--descripcion", "D", "--apply"], p);
    const status = await exec(["status", "--json"], p);
    const state = JSON.parse(status.out);
    expect(state.free.map((t: { number: number }) => t.number)).toContain(20);
    expect(state.nextTaskNumber).toBe(21);
    expect(state.warnings.filter((w: string) => w.includes("Tarea 20"))).toEqual([]);
  });

  describe("errores: no se escribe nada", () => {
    test("faltan --titulo o --descripcion", async () => {
      const p = project({ folders: ["gersom"], ...RICH });
      const before = snapshot(p.root);
      const noTitle = await exec(["add", "--descripcion", "D", "--apply"], p);
      expect(noTitle.code).toBe(2);
      expect(noTitle.err).toContain("Falta --titulo");
      const noDescription = await exec(["add", "--titulo", "T", "--apply"], p);
      expect(noDescription.err).toContain("Falta --descripcion");
      expect((await exec(["add", "--titulo", "  ", "--descripcion", "D", "--apply"], p)).err).toContain("Falta --titulo");
      expect((await exec(["add", "--titulo", "-", "--descripcion", "D"], p, { stdin: "uno\ndos" })).err).toContain("una sola línea");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("número ya usado: «Próximo número de tarea» no es mayor que el máximo", async () => {
      const low = BACKLOG_RICH.replace("**Próximo número de tarea:** 20", "**Próximo número de tarea:** 11");
      const p = project({ folders: ["gersom"], ...RICH, contents: { ...RICH.contents, "backlog.md": low } });
      const before = snapshot(p.root);
      const { code, err } = await exec(["add", "--titulo", "T", "--descripcion", "D", "--apply"], p);
      expect(code).toBe(1);
      expect(err).toContain("no es mayor que la tarea más alta que ya existe (la 18)");
      expect(snapshot(p.root)).toEqual(before);
    });

    test("backlog sin la línea del contador, o sin la sección", async () => {
      const noCounter = project(own(BACKLOG_EMPTY.replace("**Próximo número de tarea:** 5\n", "")));
      expect((await exec(["add", "--titulo", "T", "--descripcion", "D", "--apply"], noCounter)).err).toContain("Próximo número de tarea");
      const noSection = project(own(BACKLOG_EMPTY.replace("<!-- agent-context-kit:section=blocked -->", "<!-- otro -->")));
      const { code, err } = await exec(["add", "--titulo", "T", "--descripcion", "D", "--bloqueo", "`[dependencia]` x", "--apply"], noSection);
      expect(code).toBe(1);
      expect(err).toContain("no tiene la sección «blocked»");
    });

    test("backlog.md ausente", async () => {
      const p = project({ folders: ["gersom"], omit: ["backlog.md"] });
      const { code, err } = await exec(["add", "--titulo", "T", "--descripcion", "D", "--apply"], p);
      expect(code).toBe(1);
      expect(err).toContain("Falta backlog.md");
    });

    test("carpeta de otro operador, o sin poder verificar quién es: se niega, con y sin --apply", async () => {
      const p = project({ folders: ["gersom", "ana"], ...RICH, folderContents: { ana: { "backlog.md": BACKLOG_RICH } } });
      const before = snapshot(p.root);
      for (const extra of [[], ["--apply"]]) {
        const other = await exec(["add", "--titulo", "T", "--descripcion", "D", "--operator", "ana", ...extra], p);
        expect(other.code).toBe(1);
        expect(other.err).toContain("«ana» no es la tuya");
        expect(other.out).toBe("");
      }
      const unverified = await exec(["add", "--titulo", "T", "--descripcion", "D", "--operator", "gersom", "--apply"], p, { email: null });
      expect(unverified.err).toContain("No se pudo verificar");
      expect(snapshot(p.root)).toEqual(before);
    });
  });

  describe("finales de línea e idioma", () => {
    test("un archivo CRLF sigue siendo CRLF (y uno LF, LF)", async () => {
      const crlf = BACKLOG_RICH.replace(/\n/g, "\r\n");
      const p = project({ folders: ["gersom"], contents: { "handoff.md": HANDOFF_IDLE, "backlog.md": crlf, "history.md": HISTORY_RICH } });
      await exec(["add", "--titulo", "T", "--descripcion", "Varias\nlíneas", "--apply"], p);
      const text = read(p, "gersom", "backlog.md");
      expect(text).toContain("### Tarea 20 — T\r\n\r\n- **Descripción:** Varias\r\n  líneas\r\n");
      expect(text.replace(/\r\n/g, "")).not.toContain("\n"); // ningún LF suelto
      expect(text.replace(/\r\n/g, "\n").replace("**Próximo número de tarea:** 21", "**Próximo número de tarea:** 20")).toContain("### Tarea 20 — T");

      const lf = project({ folders: ["gersom"], ...RICH });
      await exec(["add", "--titulo", "T", "--descripcion", "D", "--apply"], lf);
      expect(read(lf, "gersom", "backlog.md")).not.toContain("\r");
    });

    test("en un archivo en inglés usa `Task`, sus etiquetas y «None.»", async () => {
      const p = project({
        folders: ["gersom"],
        contents: { "handoff.md": HANDOFF_IDLE_EN, "backlog.md": BACKLOG_EN, "history.md": HISTORY_EN },
      });
      const { out } = await exec(["add", "--titulo", "Write docs", "--descripcion", "Docs for the script", "--apply"], p);
      expect(out).not.toContain("Aviso");
      expect(read(p, "gersom", "backlog.md")).toContain(
        [
          "### Task 6 — Write docs",
          "",
          "- **Description:** Docs for the script",
          "- **Decisions/topics to settle before starting:** None.",
          "- **Blockers:** None.",
          "- **Trigger:** when the operator asks about pending tasks.",
          "- **Added:** 2026-10-07.",
        ].join("\n"),
      );
      expect(read(p, "gersom", "backlog.md")).toContain("**Next task number:** 7");
    });

    test("idioma que no reconoce: usa español, conserva su palabra de header y avisa", async () => {
      const backlog = BACKLOG_ONE.replace("### Tarea 7 — La única", "### Ticket 7 — La única");
      const p = project(own(backlog));
      const { out } = await exec(["add", "--titulo", "T", "--descripcion", "D", "--apply"], p);
      expect(out).toContain("Aviso: No reconozco el idioma de «Ticket»");
      expect(read(p, "gersom", "backlog.md")).toContain("### Ticket 8 — T\n");
    });

    test("sin ninguna pista de idioma: español y aviso", async () => {
      const p = project(own(BACKLOG_EMPTY));
      const { out } = await exec(["add", "--titulo", "T", "--descripcion", "D", "--apply"], p);
      expect(out).toContain("Aviso: No pude determinar el idioma");
      expect(read(p, "gersom", "backlog.md")).toContain("### Tarea 5 — T");
    });
  });

  test("repo plano: agrega a su backlog.md", async () => {
    const p = project({ flat: true, contents: { "backlog.md": BACKLOG_RICH, "handoff.md": HANDOFF_IDLE, "history.md": HISTORY_RICH } });
    const { code } = await exec(["add", "--titulo", "T", "--descripcion", "D", "--apply"], p, { email: null });
    expect(code).toBe(0);
    expect(read(p, "backlog.md")).toContain("### Tarea 20 — T");
    const team = await exec(["add", "--team", "--titulo", "T", "--descripcion", "D", "--apply"], p, { email: null });
    expect(team.code).toBe(1);
    expect(team.err).toContain("el repo es plano");
  });
});

describe("add --team", () => {
  test("agrega a «libres» del team-backlog.md, sin número ni contador, con `Agregada: <fecha> por <operador>`", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    const backlogBefore = read(p, "gersom", "backlog.md");
    const { code, out } = await exec(["add", "--team", "--titulo", "Nueva del equipo", "--descripcion", "Algo para todos", "--apply"], p);
    expect(code).toBe(0);
    expect(out).toBe("Tarea «Nueva del equipo» agregada a «Tareas libres» de docs/agents/team-backlog.md (por gersom).");
    expect(read(p, "team-backlog.md")).toBe(
      TEAM_RICH.replace(
        "- **Descripción:** CUERPO-TEAM-2\n",
        [
          "- **Descripción:** CUERPO-TEAM-2",
          "",
          "### Nueva del equipo",
          "",
          "- **Descripción:** Algo para todos",
          "- **Decisiones/temas a definir antes de empezar:** Ninguno.",
          "- **Bloqueos:** Ninguno.",
          "- **Agregada:** 2026-10-07 por gersom",
          "",
        ].join("\n"),
      ),
    );
    expect(read(p, "gersom", "backlog.md")).toBe(backlogBefore); // ni número ni contador
  });

  test("sin --apply solo muestra el diff", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    const before = snapshot(p.root);
    const { out } = await exec(["add", "--team", "--titulo", "X", "--descripcion", "D"], p);
    expect(out).toContain("+### X");
    expect(out).toContain(APPLY_NOTICE);
    expect(snapshot(p.root)).toEqual(before);
  });

  test("con bloqueo va a «bloqueadas»; usa las etiquetas del archivo y `Detalles` opcional", async () => {
    const p = project({ folders: ["gersom"], teamBacklogText: TEAM_TWO });
    await exec(["add", "--team", "--titulo", "Esperando", "--descripcion", "D", "--bloqueo", "`[postergada]` luego", "--detalles", "ver el wiki", "--apply"], p);
    const text = read(p, "team-backlog.md");
    expect(text.endsWith("- **Agregada:** 2026-10-04 por ana\n\n### Esperando\n\n- **Descripción:** D\n- **Decisiones/temas a definir antes de empezar:** Ninguno.\n- **Bloqueos:** `[postergada]` luego\n- **Detalles:** ver el wiki\n- **Agregada:** 2026-10-07 por gersom\n")).toBe(true);
  });

  test("respeta el espaciado: dos líneas en blanco entre las tareas del archivo", async () => {
    const p = project({ folders: ["gersom"], teamBacklogText: TEAM_TWO });
    await exec(["add", "--team", "--titulo", "N", "--descripcion", "D", "--apply"], p);
    expect(read(p, "team-backlog.md")).toContain("2026-10-03 por ana\n\n\n### N\n\n- **Descripción:** D");
  });

  test("team-backlog recién generado: reemplaza los placeholders de las dos secciones", async () => {
    const p = project({ folders: ["gersom"], teamBacklogText: TEAM_TEMPLATE });
    await exec(["add", "--team", "--titulo", "Libre", "--descripcion", "D", "--apply"], p);
    await exec(["add", "--team", "--titulo", "Bloqueada", "--descripcion", "D", "--bloqueo", "`[dependencia]` algo", "--apply"], p);
    const text = read(p, "team-backlog.md");
    expect(text).not.toContain("Placeholder");
    expect(text).toContain("## Tareas libres\n\n### Libre\n\n- **Descripción:** D");
    expect(text).toContain("## Tareas bloqueadas / pospuestas\n\n### Bloqueada\n\n- **Descripción:** D");
  });

  test("título repetido (sin distinguir mayúsculas ni acentos), en libres o bloqueadas: error", async () => {
    const p = project({ folders: ["gersom"], teamBacklogText: TEAM_TWO });
    const before = snapshot(p.root);
    for (const title of ["migrar el ci", "Revisar el COPY del onboarding", "cambiar de PROVEEDOR"]) {
      const { code, err } = await exec(["add", "--team", "--titulo", title, "--descripcion", "D", "--apply"], p);
      expect(code).toBe(1);
      expect(err).toContain("debe ser único");
    }
    expect(snapshot(p.root)).toEqual(before);
  });

  test("--disparador no aplica con --team", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    const { code, err } = await exec(["add", "--team", "--titulo", "X", "--descripcion", "D", "--disparador", "ya", "--apply"], p);
    expect(code).toBe(2);
    expect(err).toContain("--disparador no aplica con --team");
  });

  test("el operador «solo team-backlog» (sin carpeta) puede agregar", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    const { code } = await exec(["add", "--team", "--titulo", "Del cliente", "--descripcion", "Pidió esto", "--apply"], p, { email: "luis@mail.com" });
    expect(code).toBe(0);
    expect(read(p, "team-backlog.md")).toContain("- **Agregada:** 2026-10-07 por luis\n");
  });

  test("el operador sin carpeta no puede agregar a un backlog propio que no tiene", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    const before = snapshot(p.root);
    const { code, err } = await exec(["add", "--titulo", "X", "--descripcion", "D", "--apply"], p, { email: "luis@mail.com" });
    expect(code).toBe(1);
    expect(err).toContain("solo team-backlog");
    expect(err).toContain("Operadores con carpeta: gersom");
    expect(snapshot(p.root)).toEqual(before);
  });

  test("sin saber quién es (sin correo de git y sin --operator): pide --operator", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    const before = snapshot(p.root);
    const { code, err } = await exec(["add", "--team", "--titulo", "X", "--descripcion", "D", "--apply"], p, { email: null });
    expect(code).toBe(1);
    expect(err).toContain("indica uno con --operator");
    expect((await exec(["add", "--team", "--titulo", "X", "--descripcion", "D", "--apply", "--operator", "luis"], p, { email: null })).code).toBe(0);
    expect(snapshot(p.root)).not.toEqual(before);
    expect(read(p, "team-backlog.md")).toContain("por luis");
  });

  test("agregar al team-backlog.md no exige que la carpeta resuelta sea la propia", async () => {
    const p = project({ folders: ["gersom", "ana"], ...RICH });
    const { code } = await exec(["add", "--team", "--titulo", "X", "--descripcion", "D", "--operator", "ana", "--apply"], p);
    expect(code).toBe(0);
    expect(read(p, "team-backlog.md")).toContain("por ana");
  });

  test("team-backlog.md ausente: error (el script no lo crea)", async () => {
    const p = project({ folders: ["gersom"], ...RICH, teamBacklogText: undefined });
    const { code, err } = await exec(["add", "--team", "--titulo", "X", "--descripcion", "D", "--apply"], p);
    expect(code).toBe(1);
    expect(err).toContain("Falta team-backlog.md");
  });

  test("un team-backlog en inglés (por sus etiquetas) se escribe en inglés", async () => {
    const english = TEAM_TWO.replace(/Descripción/g, "Description")
      .replace(/Bloqueos/g, "Blockers")
      .replace(/Agregada/g, "Added")
      .replace(/Detalles/g, "Details")
      .replace("Decisiones/temas a definir antes de empezar", "Decisions/topics to settle before starting");
    const p = project({ folders: ["gersom"], teamBacklogText: english });
    await exec(["add", "--team", "--titulo", "N", "--descripcion", "D", "--apply"], p);
    expect(read(p, "team-backlog.md")).toContain("### N\n\n- **Description:** D\n- **Decisions/topics to settle before starting:** None.\n- **Blockers:** None.\n- **Added:** 2026-10-07 by gersom\n");
  });

  test("team-backlog con CRLF", async () => {
    const p = project({ folders: ["gersom"], ...RICH });
    writeFileSync(join(p.agents, "team-backlog.md"), TEAM_RICH.replace(/\n/g, "\r\n"));
    await exec(["add", "--team", "--titulo", "X", "--descripcion", "D", "--apply"], p);
    const text = read(p, "team-backlog.md");
    expect(text).toContain("### X\r\n\r\n- **Descripción:** D\r\n");
    expect(text.replace(/\r\n/g, "")).not.toContain("\n");
  });
});
