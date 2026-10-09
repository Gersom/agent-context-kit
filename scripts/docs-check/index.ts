// Verificador de documentación de agentes: se corre contra OTRO proyecto y comprueba que su
// docs/agents cumple lo que necesitan el skill, el seguimiento de tareas (`bun run tasks`) y el
// gestor de tareas (`bun run task`). Solo lee el proyecto revisado: nunca escribe en él.
//
// Uso (desde la raíz de agent-context-kit):
//   bun run check <ruta>               → raíz del proyecto, carpeta de agentes o de un operador
//   bun run check <ruta> --operator <carpeta>
//                                      → en modo multi-operador, revisa a ese operador (por defecto,
//                                        el de `git config user.email` del proyecto revisado)
//   bun run check <ruta> --json        → el informe como un único objeto JSON
//   bun run check <ruta> --strict      → los avisos también hacen fallar
//
// Código de salida: 0 sin errores; 1 con errores (con --strict, también con avisos); 2 mal uso.
// Cada familia de checks vive en `src/checks/` y se registra en `src/checks/index.ts`.

import { run } from "./src/run.ts";

process.exitCode = await run(process.argv.slice(2));
