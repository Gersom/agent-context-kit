import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { invocationDir, watchDir } from "../src/reader.js";

const DEBOUNCE_MS = 50;
// Margen amplio: fs.watch en Windows puede entregar los eventos con algo de retraso.
const SETTLE_MS = 600;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("watchDir", () => {
  let dir;
  let stop;
  let calls;
  let errors;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "task-tracker-watch-"));
    calls = [];
    errors = [];
    stop = watchDir(dir, (file) => calls.push(file), (message) => errors.push(message), DEBOUNCE_MS);
    // Darle tiempo al watcher a engancharse antes de escribir.
    await sleep(100);
  });

  afterEach(() => {
    stop();
    rmSync(dir, { recursive: true, force: true });
  });

  test("varias escrituras seguidas → un solo aviso con el nombre del archivo", async () => {
    for (const n of [1, 2, 3]) writeFileSync(join(dir, "handoff.md"), `# Handoff ${n}\n`);
    await sleep(SETTLE_MS);
    expect(errors).toEqual([]);
    expect(calls).toEqual(["handoff.md"]);
  });

  test("ignora archivos que no son handoff.md ni backlog.md", async () => {
    writeFileSync(join(dir, "otro.txt"), "x");
    writeFileSync(join(dir, "history.md"), "x");
    await sleep(SETTLE_MS);
    expect(calls).toEqual([]);
  });

  test("informa el último archivo vigilado que cambió", async () => {
    writeFileSync(join(dir, "backlog.md"), "# Backlog\n");
    await sleep(SETTLE_MS);
    expect(calls).toEqual(["backlog.md"]);
  });
});

describe("invocationDir", () => {
  const KEYS = ["INIT_CWD", "npm_config_local_prefix"];
  let saved;

  beforeEach(() => {
    saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  test("precedencia: INIT_CWD > npm_config_local_prefix > cwd", () => {
    process.env.INIT_CWD = "/desde-init";
    process.env.npm_config_local_prefix = "/desde-prefix";
    expect(invocationDir()).toBe("/desde-init");

    delete process.env.INIT_CWD;
    expect(invocationDir()).toBe("/desde-prefix");

    delete process.env.npm_config_local_prefix;
    expect(invocationDir()).toBe(process.cwd());
  });
});
