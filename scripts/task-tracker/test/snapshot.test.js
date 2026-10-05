import { describe, expect, test } from "bun:test";
import { basename } from "node:path";
import { createSnapshotReader } from "../src/snapshot.js";

/**
 * readFile falso: `files[name]` puede ser un string (contenido), null (no existe), o
 * `{ code }` (error de lectura, ej. EBUSY). Se puede cambiar entre lecturas.
 */
function fakeFs(initial) {
  const files = { ...initial };
  const readFile = (path) => {
    const value = files[basename(path)];
    if (value == null) return { text: null, error: null, code: null };
    if (typeof value === "object") return { text: null, error: `No se pudo leer ${basename(path)}: ${value.code}`, code: value.code };
    return { text: value, error: null, code: null };
  };
  return { files, readFile };
}

const options = (readFile) => ({ readFile, now: () => new Date(2026, 9, 5, 16, 20, 0), formatTime: () => "16:20:00" });

describe("createSnapshotReader", () => {
  test("primera lectura buena: devuelve el contenido sin avisos", () => {
    const fs = fakeFs({ "handoff.md": "# H", "backlog.md": "# B" });
    const snap = createSnapshotReader("/x", options(fs.readFile)).read();
    expect(snap).toEqual({ handoffText: "# H", backlogText: "# B", warnings: [], needsRetry: false });
  });

  test("fallo transitorio de un archivo que ya se leyó bien: pide reintento", () => {
    const fs = fakeFs({ "handoff.md": "# H", "backlog.md": "# B" });
    const reader = createSnapshotReader("/x", options(fs.readFile));
    reader.read();
    fs.files["backlog.md"] = null;
    expect(reader.read().needsRetry).toBe(true);
  });

  test("fallo persistente: última versión buena con aviso, para ambos archivos por igual", () => {
    const fs = fakeFs({ "handoff.md": "# H", "backlog.md": "# B" });
    const reader = createSnapshotReader("/x", options(fs.readFile));
    reader.read();
    fs.files["backlog.md"] = null;
    fs.files["handoff.md"] = "  \n";
    const snap = reader.read({ allowRetry: false });
    expect(snap.needsRetry).toBe(false);
    expect(snap.handoffText).toBe("# H");
    expect(snap.backlogText).toBe("# B");
    expect(snap.warnings).toEqual([
      "handoff.md no se pudo leer (está vacío): mostrando la versión de las 16:20:00.",
      "backlog.md no se pudo leer (no existe): mostrando la versión de las 16:20:00.",
    ]);
  });

  test("EBUSY se trata igual que un fallo transitorio", () => {
    const fs = fakeFs({ "handoff.md": "# H", "backlog.md": "# B" });
    const reader = createSnapshotReader("/x", options(fs.readFile));
    reader.read();
    fs.files["backlog.md"] = { code: "EBUSY" };
    expect(reader.read().needsRetry).toBe(true);
    const snap = reader.read({ allowRetry: false });
    expect(snap.backlogText).toBe("# B");
    expect(snap.warnings).toEqual(["backlog.md no se pudo leer (error EBUSY): mostrando la versión de las 16:20:00."]);
  });

  test("backlog.md que nunca existió (set mínimo): null, sin aviso ni reintento", () => {
    const fs = fakeFs({ "handoff.md": "# H", "backlog.md": null });
    const reader = createSnapshotReader("/x", options(fs.readFile));
    reader.read();
    const snap = reader.read();
    expect(snap).toEqual({ handoffText: "# H", backlogText: null, warnings: [], needsRetry: false });
  });

  test("error de lectura de un archivo nunca leído: se informa tal cual", () => {
    const fs = fakeFs({ "handoff.md": { code: "EPERM" }, "backlog.md": null });
    const snap = createSnapshotReader("/x", options(fs.readFile)).read();
    expect(snap.handoffText).toBeNull();
    expect(snap.needsRetry).toBe(false);
    expect(snap.warnings).toEqual(["No se pudo leer handoff.md: EPERM"]);
  });

  test("cuando el archivo vuelve, se usa el contenido nuevo y se actualiza la memoria", () => {
    const fs = fakeFs({ "handoff.md": "# H", "backlog.md": "# B" });
    const reader = createSnapshotReader("/x", options(fs.readFile));
    reader.read();
    fs.files["backlog.md"] = null;
    reader.read({ allowRetry: false });
    fs.files["backlog.md"] = "# B2";
    expect(reader.read()).toMatchObject({ backlogText: "# B2", warnings: [], needsRetry: false });
  });
});
