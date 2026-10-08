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

Tarea 24 — Script para gestionar las tareas (handoff, backlog, history)

Script nuevo `scripts/task-manager/` (comando `bun run task`) que edita de forma quirúrgica `handoff.md`, `backlog.md` e `history.md` (y `team-backlog.md`), en vez de que el agente los edite a mano. Rama `feat/task-manager`. Descripción y decisiones originales: en la entrada de la tarea (ya sacada del backlog; al cerrar va a `history.md`).

### Plan

- [x] Paso 1 — Posiciones línea/offset de bloques, campos y secciones en el parser compartido (`scripts/_shared/parse/`), con tests
- [x] Paso 2 — Esqueleto de `scripts/task-manager/`: resolver operador y carpeta, leer archivos, CLI `bun run task`, helper de edición quirúrgica por rangos
- [x] Paso 3 — Etapa 1 (lectura): `status`, `next`, `show N`
- [x] Paso 4 — Etapa 2 (escritura mecánica): `add` (con "Próximo número de tarea") y `start` (con `Origen: team-backlog` si corresponde)
- [x] Paso 5 — Etapa 3 (estado): `step`, `pause`, `resume`, `block`, `unblock`
- [x] Paso 6 — Etapa 4 (cierre): `close --done|--discarded` con las Reglas 5 a 8 y el reporte de cierre
- [x] Paso 7 — Docs: README del script, `architecture.md`, reflejo en `rules.md` y plantillas (script opcional)
- [ ] Documentar cierre de tarea

**Modo de ejecución acordado:** por etapas — pausa y resumen al terminar cada etapa (Etapa 1 a 4; los Pasos 1 y 2 son la base y van antes de la Etapa 1).

### Qué falta

Solo el cierre, cuando el operador lo pida. Pasos 1 a 7 hechos y commiteados. Paso 7: README raíz y `docs/architecture.md` mencionan el task-manager; sección «Si usas el script de tareas» en `docs/agents/rules.md` (el script no exime de las Reglas 5 a 8; las reglas fijas y la plantilla no se tocaron); `Origen: team-backlog` explícita en `skill/docs/multi-operator.md` y las dos `team-backlog.md` (la plantilla plana de history no la menciona: un test lo prohíbe). Decisiones de `close` confirmadas (2026-10-07): descartada desbloquea; `--nueva` mínima; `--resumen`/`--motivo` obligatorios; `close --discarded N` descarta directo del backlog (con `--done` pide `start N`). Límites: la en curso o pausada que sigue en «libres» y requiere insertar ahí da error; agrupadas no soportadas; `block`/`unblock` no soportan agrupadas ni `team-backlog.md`; `add` y `start` sin `--json`. `bun test` → 779 pasan; typecheck limpio. Pendiente del operador: tag/release (la T-32 subió `package.json` a 1.4.0).

### Decisiones a medio camino

- Nombre: `scripts/task-manager/` + `bun run task` (decidido 2026-10-07).
- Bloqueos: sin formato nuevo; `unblock` reusa la detección de "Tarea N" del motivo (`scripts/_shared/tasks/task-refs.ts`) y consulta `history.md`; el texto libre queda para revisión manual (decidido 2026-10-07).
- Texto libre: flags para lo corto, stdin (`--detalles -`) para lo largo.
- Tarea pausada: `pause` conserva `Descripción`, extras (`Origen`, `Detalles`) y modo de ejecución para que `resume` restaure la tarea sin perder datos; `pause` es estricto: se niega y no escribe si «Tarea en progreso» tiene subsecciones desconocidas (decidido 2026-10-07).
- El script es opcional: sin él se edita a mano (`docs/philosophy.md`, principio 4). Edición quirúrgica, `.md` como fuente de verdad (decidido 2026-10-05).
- Es multi-operador: la carpeta sale de `git config user.email` + `operators.md`; las tareas de `team-backlog.md` se toman por título.
- Seguimiento ODD: `odd/tasks/task-manager-script.md`.

- Para el editor del Paso 2: parsear siempre `normalizeEol(raw).text`, editar el crudo con `rawSpan` y pasar lo insertado por `toEol`. El rango de un bloque incluye las líneas en blanco previas al ancla siguiente (el editor decide qué hacer con ellas). `Section.body` llega hasta el header siguiente pero `bodyRange` hasta antes del ancla siguiente: para posiciones, `bodyRange`. Sin anclas (plan B) `anchorRange` es `null`. `parseBlocks` no distingue fences (como antes).

### Próximo paso concreto

Mandar el resumen al operador y esperar: si pide correcciones, se hacen; solo cuando pida cerrar, documentar el cierre (Reglas 5 y 7) y el reporte (Regla 8).

<!-- agent-context-kit:section=paused -->
## Tareas pausadas

Ninguna.
