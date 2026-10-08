# Handoff

Estado "en caliente": en qué se está ahora. **Se sobrescribe completo** en cada actualización (en cada paso del plan y al cerrar la tarea): es una foto del presente, no un historial, con el próximo paso concreto para que un chat nuevo retome sin depender de la sesión anterior.

- Pendientes → [`./backlog.md`](./backlog.md) · Cerradas (hechas o descartadas) → [`./history.md`](./history.md)
- Sin tarea en curso: "Tarea en progreso" dice "Sin tarea en curso" (no deja el contenido de la última cerrada); "Tareas pausadas" queda en "Ninguna" si no hay.
- **No borres ni muevas los comentarios `<!-- agent-context-kit:section=... -->`** (`in-progress`, `paused`): los lee el script de seguimiento de tareas; como el archivo se reescribe completo, hay que reescribirlos siempre. La tarea en curso va en una línea `Tarea N — título` antes de la primera subsección `###`.
- **Tarea pausada:** un bloque `### Tarea N — título` con `Plan` (opcional: los checkboxes de "Tarea en progreso" tal cual), `Qué falta`, `Decisiones a medio camino`, `Próximo paso concreto`, `Por qué se pausó` y `Qué espera para retomarse`.
- Las reglas para cerrar una tarea están al final de [`rules.md`](../rules.md).

---

<!-- agent-context-kit:section=in-progress -->
## Tarea en progreso

Sin tarea en curso

<!-- agent-context-kit:section=paused -->
## Tareas pausadas

### Tarea 24 — Script para gestionar las tareas (handoff, backlog, history)

- **Descripción:** Script nuevo `scripts/task-manager/` (comando `bun run task`) que edita de forma quirúrgica `handoff.md`, `backlog.md` e `history.md` (y `team-backlog.md`), en vez de que el agente los edite a mano. Rama `feat/task-manager`. Descripción y decisiones originales: en la entrada de la tarea (ya sacada del backlog; al cerrar va a `history.md`).
- **Plan:**
  - [x] Paso 1 — Posiciones línea/offset de bloques, campos y secciones en el parser compartido (`scripts/_shared/parse/`), con tests
  - [x] Paso 2 — Esqueleto de `scripts/task-manager/`: resolver operador y carpeta, leer archivos, CLI `bun run task`, helper de edición quirúrgica por rangos
  - [x] Paso 3 — Etapa 1 (lectura): `status`, `next`, `show N`
  - [x] Paso 4 — Etapa 2 (escritura mecánica): `add` (con "Próximo número de tarea") y `start` (con `Origen: team-backlog` si corresponde)
  - [x] Paso 5 — Etapa 3 (estado): `step`, `pause`, `resume`, `block`, `unblock`
  - [x] Paso 6 — Etapa 4 (cierre): `close --done|--discarded` con las Reglas 5 a 8 y el reporte de cierre
  - [ ] Paso 7 — Docs: README del script, `architecture.md`, reflejo en `rules.md` y plantillas (script opcional)
  - [ ] Documentar cierre de tarea
- **Modo de ejecución acordado:** por etapas — pausa y resumen al terminar cada etapa (Etapa 1 a 4; los Pasos 1 y 2 son la base y van antes de la Etapa 1).
- **Qué falta:** Paso 7 y el cierre. El Paso 6 (Etapa 4) está hecho y commiteado (`4189490`, `a5275b9`, `9ab555e`, `5310627`): `close --done --resumen | --discarded --motivo [--nueva "<título>"]... [N]`, todo-o-nada sobre handoff/history/backlog, con `--apply`/`--dry-run`/`--json`, Regla 7 (desbloqueo con `Bloqueos` → `[Resuelto el <fecha>] — era …`, aviso de >15 libres) y reporte de la Regla 8. `bun test` → 766 pasan; `bun run typecheck` limpio; los `docs/` reales quedaron intactos; ida y vuelta pause → start → step → close probada en copia. Módulos nuevos: `src/write/{unblocking,history,new-task}.ts`; `FlagSpec.multiple` en el CLI. `Origen: team-backlog` viaja a history como primera viñeta `- **Origen:** team-backlog` (ni rules ni plantillas lo fijaban). Límites: si la tarea sigue en «Tareas libres» y hay que insertar ahí, `close` da error y pide sacarla a mano; `close N` solo cubre en curso o pausada. Decisiones abiertas para el operador: (1) una tarea descartada cuenta como cerrada para desbloquear (criterio ya existente en `unblock`/`buildState`); (2) `--nueva` crea tareas mínimas («Surgió al cerrar la Tarea N; falta detallarla.»); (3) `--resumen`/`--motivo` son obligatorios; (4) descartar una tarea del backlog sin empezarla exige `start N` y luego `close`. Para el Paso 7: README del script ya tiene `close`; `docs/architecture.md` debe mencionar `close` y los módulos nuevos; las Reglas 5 a 8 pueden citar `bun run task close` como forma opcional; si se oficializa la convención de `Origen`, agregarla en `skill/template/agents/history.md` (y su copia en `docs/`), `skill/docs/multi-operator.md` y `skill/template/multi/team-backlog.md`; mantener la Regla 1 (menciones con link, no copias). Pasos 1 a 5 (Etapas 1 a 3, base del parser y despachador) hechos: `status`, `next`, `show`, `add`, `start`, `step`, `pause`, `resume`, `block`, `unblock`; las escrituras exigen `--apply` y `ctx.commit()` se niega fuera de una carpeta `own`; `block`/`unblock` no soportan tareas agrupadas ni `team-backlog.md`; `add` y `start` aún no tienen `--json`; `start` de una tarea agrupada da error.
- **Decisiones a medio camino:** - Nombre: `scripts/task-manager/` + `bun run task` (decidido 2026-10-07).
  - Bloqueos: sin formato nuevo; `unblock` reusa la detección de "Tarea N" del motivo (`scripts/_shared/tasks/task-refs.ts`) y consulta `history.md`; el texto libre queda para revisión manual (decidido 2026-10-07).
  - Texto libre: flags para lo corto, stdin (`--detalles -`) para lo largo.
  - Tarea pausada: `pause` conserva `Descripción`, extras (`Origen`, `Detalles`) y modo de ejecución para que `resume` restaure la tarea sin perder datos; `pause` es estricto: se niega y no escribe si «Tarea en progreso» tiene subsecciones desconocidas (decidido 2026-10-07).
  - El script es opcional: sin él se edita a mano (`docs/philosophy.md`, principio 4). Edición quirúrgica, `.md` como fuente de verdad (decidido 2026-10-05).
  - Es multi-operador: la carpeta sale de `git config user.email` + `operators.md`; las tareas de `team-backlog.md` se toman por título.
  - Seguimiento ODD: `odd/tasks/task-manager-script.md`.

  - Para el editor del Paso 2: parsear siempre `normalizeEol(raw).text`, editar el crudo con `rawSpan` y pasar lo insertado por `toEol`. El rango de un bloque incluye las líneas en blanco previas al ancla siguiente (el editor decide qué hacer con ellas). `Section.body` llega hasta el header siguiente pero `bodyRange` hasta antes del ancla siguiente: para posiciones, `bodyRange`. Sin anclas (plan B) `anchorRange` es `null`. `parseBlocks` no distingue fences (como antes).
- **Próximo paso concreto:** Pedir al operador sus respuestas a las 4 decisiones abiertas de `close` (sección «Qué falta»; recomendación del agente: dejar 1, 3 y 4 como están y aceptar 2, o «recomendado» para aceptarlas) y empezar el Paso 7 (docs): README del script, `docs/architecture.md`, reflejo en `rules.md` (Reglas 5 a 8) y plantillas, como menciones con link.
- **Por qué se pausó:** El operador priorizó otra tarea (cambiar preguntas normales a widget con AskUserQuestion).
- **Qué espera para retomarse:** Que termine la tarea nueva; retomar con el Paso 7 (docs) y las 4 decisiones abiertas de close.
