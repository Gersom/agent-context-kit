import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { watchDir } from "../../src/io/watch.ts";

const DEBOUNCE_MS = 100;
// Silencio que se espera después del primer aviso para afirmar que no llega otro.
const QUIET_MS = DEBOUNCE_MS * 4;
// Tope de cada espera: fs.watch en Windows (o una máquina cargada) puede entregar los eventos
// con retraso, así que se espera hasta que se cumpla la condición en vez de un tiempo fijo.
const WAIT_TIMEOUT_MS = 4000;
const TEST_TIMEOUT_MS = 15000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Espera en bucle hasta que `condition()` sea verdadera; falla si se pasa del tope.
 */
async function waitFor(condition: () => boolean, { timeout = WAIT_TIMEOUT_MS, interval = 20 }: { timeout?: number; interval?: number } = {}) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) throw new Error(`waitFor: la condición no se cumplió en ${timeout} ms`);
    await sleep(interval);
  }
}

describe("watchDir", () => {
  let dir: string;
  let stop: () => void;
  let calls: (string | null)[];
  let errors: string[];

  /** Espera hasta que pasen `QUIET_MS` sin avisos nuevos. */
  async function waitForQuiet() {
    let count = calls.length;
    let since = Date.now();
    await waitFor(() => {
      if (calls.length !== count) {
        count = calls.length;
        since = Date.now();
      }
      return Date.now() - since >= QUIET_MS;
    });
  }

  /**
   * "Calienta" el watcher: escribe `file` en bucle hasta recibir el primer aviso (así se sabe
   * que ya está enganchado), espera a que se calme y reinicia el registro de avisos.
   */
  async function warmUp(file = "handoff.md") {
    let n = 0;
    await waitFor(
      () => {
        if (calls.length > 0) return true;
        writeFileSync(join(dir, file), `# calentando ${n++}\n`);
        return false;
      },
      { interval: DEBOUNCE_MS * 2 },
    );
    await waitForQuiet();
    calls.length = 0;
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "task-tracker-watch-"));
    calls = [];
    errors = [];
    stop = watchDir(dir, (file) => calls.push(file), (message) => errors.push(message), DEBOUNCE_MS);
  });

  afterEach(() => {
    stop();
    rmSync(dir, { recursive: true, force: true });
  });

  test(
    "varias escrituras seguidas → un solo aviso con el nombre del archivo",
    async () => {
      await warmUp();
      for (const n of [1, 2, 3]) writeFileSync(join(dir, "handoff.md"), `# Handoff ${n}\n`);
      await waitFor(() => calls.length >= 1);
      await waitForQuiet();
      expect(errors).toEqual([]);
      expect(calls).toEqual(["handoff.md"]);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "ignora archivos que no son handoff.md, backlog.md ni history.md",
    async () => {
      await warmUp();
      writeFileSync(join(dir, "otro.txt"), "x");
      writeFileSync(join(dir, "rules.md"), "x");
      // Se espera el silencio antes del marcador: si no, el debounce agruparía todo y el aviso del
      // marcador taparía el de un archivo ajeno.
      await waitForQuiet();
      expect(calls).toEqual([]);
      writeFileSync(join(dir, "handoff.md"), "# marcador\n");
      await waitFor(() => calls.length >= 1);
      await waitForQuiet();
      expect(calls).toEqual(["handoff.md"]);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "avisa de backlog.md y de history.md, y en una ráfaga informa el último archivo que cambió",
    async () => {
      await warmUp();
      for (const file of ["backlog.md", "history.md"]) {
        writeFileSync(join(dir, file), `# ${file}\n`);
        await waitFor(() => calls.length >= 1);
        await waitForQuiet();
        expect(calls).toEqual([file]);
        calls.length = 0;
      }
      // Ráfaga dentro del debounce: un solo aviso, con el nombre del último archivo escrito.
      writeFileSync(join(dir, "history.md"), "# ráfaga\n");
      writeFileSync(join(dir, "backlog.md"), "# ráfaga\n");
      await waitFor(() => calls.length >= 1);
      await waitForQuiet();
      expect(calls).toEqual(["backlog.md"]);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "con una lista de archivos, solo avisa de los indicados",
    async () => {
      stop();
      stop = watchDir(dir, (file) => calls.push(file), (message) => errors.push(message), DEBOUNCE_MS, ["team-backlog.md"]);
      await warmUp("team-backlog.md");

      writeFileSync(join(dir, "handoff.md"), "# no vigilado\n");
      await waitForQuiet();
      expect(calls).toEqual([]);

      writeFileSync(join(dir, "team-backlog.md"), "# vigilado\n");
      await waitFor(() => calls.length >= 1);
      await waitForQuiet();
      expect(errors).toEqual([]);
      expect(calls).toEqual(["team-backlog.md"]);
    },
    TEST_TIMEOUT_MS,
  );
});
