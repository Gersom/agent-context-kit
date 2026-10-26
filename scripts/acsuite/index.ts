// CLI único del kit: `acsuite <board|task|check> [argumentos]` (en este repo, `bun run acsuite ...`).
// Reúne el seguimiento de tareas (`board`), el gestor de tareas (`task`) y el verificador de
// documentación (`check`); cada uno sigue documentado en el README de su carpeta.

import { dispatch } from "./dispatch.ts";

process.exitCode = await dispatch(process.argv.slice(2));
