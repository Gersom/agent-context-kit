// CLI único de la suite: `acsuite <board|task|check|init> [argumentos]` (en este repo, `bun run acsuite ...`).
// Reúne el seguimiento de tareas (`board`), el gestor de tareas (`task`), el verificador de
// documentación (`check`) y `init`, que agrega a rules.md la sección que enseña al agente a usar la
// suite; cada uno sigue documentado en el README de su carpeta.

import { dispatch } from "./dispatch.ts";

process.exitCode = await dispatch(process.argv.slice(2));
