// Seguimiento de tareas: vigila docs/agents/ de un proyecto y muestra en la terminal la tarea
// en progreso, las pausadas, las pendientes y las últimas completadas (handoff.md, backlog.md y
// history.md), redibujando en cada cambio. Pensado para correr en una terminal aparte mientras
// un agente trabaja en otra.
//
// Atajos (terminal interactiva): `q` o Ctrl+C salen, `r` redibuja, `c` compacta o expande los
// recuadros (una sola tarea por recuadro, salvo en progreso y pausadas) y `f` oculta o muestra las
// flechas del flujo. En modo multi-operador, ↑/↓ eligen operador en la vista de equipo, Enter
// abre su panel y `b` o Esc vuelven al equipo.
//
// Uso (desde la raíz de agent-context-suite):
//   bun run board                 → pregunta la ruta a vigilar
//   bun run board <ruta>          → raíz del proyecto (busca docs/agents/ o agent-context/agents/)
//                                   o la carpeta que contiene handoff.md
//   bun run board <ruta> --once   → pinta una sola vez y sale (útil para probar o en CI)
//   bun run board <ruta> --compact --no-arrows
//                                 → arranca con los recuadros compactos y sin flechas
//   bun run board <ruta> <operador>
//                                 → en modo multi-operador, abre de frente el panel de ese
//                                   operador (también `--operator <carpeta>`); sin él, la vista
//                                   de equipo con el operador de `git config user.email` elegido
//
// Cada instancia es independiente (sin lockfiles, puertos ni estado compartido): se puede
// correr una por proyecto en paralelo.

import { main } from "./src/main.ts";

main(process.argv.slice(2));
