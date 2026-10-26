// Compila el CLI `acsuite` a un único archivo JS para Node en `dist/cli.js`, con las dependencias
// (picocolors, string-width) dentro del bundle. Es lo que se publica en npm (`bun run build`).

import { fileURLToPath } from "node:url";

const result = await Bun.build({
  entrypoints: [fileURLToPath(new URL("./index.ts", import.meta.url))],
  outdir: fileURLToPath(new URL("../../dist/", import.meta.url)),
  naming: "cli.js",
  target: "node",
  banner: "#!/usr/bin/env node",
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
console.log(`dist/cli.js listo (${result.outputs.map((o) => `${(o.size / 1024).toFixed(0)} KB`).join(", ")})`);
