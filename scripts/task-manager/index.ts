// Gestión de tareas: edita de forma quirúrgica handoff.md, backlog.md, history.md y
// team-backlog.md del operador, en lugar de que un agente (o una persona) los edite a mano.
// Es opcional: sin este script los archivos se editan a mano igual (docs/philosophy.md, principio 4).
//
// Uso (desde la raíz de agent-context-kit):
//   bun run task                       → lista los comandos
//   bun run task <comando> --help      → ayuda de un comando
//   bun run task whoami                → operador, carpeta y archivos resueltos
//   bun run task anchors               → verifica las anclas de sección de cada archivo
//   bun run task add --titulo ... --descripcion ...   → muestra el diff (no escribe)
//   bun run task add ... --apply       → escribe (los comandos de escritura exigen --apply)
//   bun run task start 24 --apply      → empieza la Tarea 24
//   bun run task <comando> --dry-run   → muestra el diff sin escribir nada
//   bun run task <comando> --agents <ruta> --operator <carpeta>
//                                      → otro proyecto / otro operador (por defecto: el repo
//                                        actual y el de `git config user.email`)
//
// Cada comando vive en `src/commands/` y se registra en `src/commands/index.ts`.

import { run } from "./src/cli/dispatch.ts";

process.exitCode = await run(process.argv.slice(2));
