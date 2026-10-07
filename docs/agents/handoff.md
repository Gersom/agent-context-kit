# Handoff

Estado "en caliente": en qué se está ahora. **Se sobrescribe completo** en cada actualización (en cada paso del plan y al cerrar la tarea): es una foto del presente, no un historial, con el próximo paso concreto para que un chat nuevo retome sin depender de la sesión anterior.

- Pendientes → [`./backlog.md`](./backlog.md) · Cerradas (hechas o descartadas) → [`./history.md`](./history.md)
- Sin tarea en curso: "Tarea en progreso" dice "Sin tarea en curso" (no deja el contenido de la última cerrada); "Tareas pausadas" queda en "Ninguna" si no hay.
- **No borres ni muevas los comentarios `<!-- agent-context-kit:section=... -->`** (`in-progress`, `paused`): los lee el script de seguimiento de tareas; como el archivo se reescribe completo, hay que reescribirlos siempre. La tarea en curso va en una línea `Tarea N — título` antes de la primera subsección `###`.
- **Tarea pausada:** un bloque `### Tarea N — título` con `Plan` (opcional: los checkboxes de "Tarea en progreso" tal cual), `Qué falta`, `Decisiones a medio camino`, `Próximo paso concreto`, `Por qué se pausó` y `Qué espera para retomarse`.
- Las reglas para cerrar una tarea están al final de [`rules.md`](./rules.md).

---

<!-- agent-context-kit:section=in-progress -->
## Tarea en progreso

**Tarea:** Tarea 26 — Soportar varios operadores trabajando en paralelo

El kit asume un solo operador y un solo hilo de trabajo. Diseñar e implementar un modo multi-operador (opt-in) donde cada operador tiene su carpeta con su propio `handoff.md`, `backlog.md` y `history.md`, para que varias personas (cada una con su agente) trabajen a la vez y compartan el estado por git sin conflictos de merge ni números repetidos. Rama `feat/multi-operator`.

### Plan

- [x] Paso 1 — Diseño del modo multi-operador, escrito como documento propio `skill/docs/multi-operator.md` (se abre solo al activar el modo; no engorda `template-architecture.md`) y sometido a aprobación del operador: estructura de carpetas, `operators.md` (carpeta con nombre corto ↔ uno o más correos), resolución del operador actual (`git config user.email`; si no está en el mapa, preguntar y registrar), backlog compartido sin números, una tarea vive en un solo backlog, referencias `T-N@operador`, reglas propias vs del proyecto, lectura de carpetas ajenas solo lectura, activación opt-in y pasaje de plano a multi
- [x] Paso 2 — Plantillas: `agents/operators.md`, backlog compartido (formato liviano) y personal, preferencias propias del operador, variante multi de `AGENTS.md` (resolver la carpeta propia) y árbol del `README.md` de `docs/` en modo multi
- [x] Paso 3 — `questions-flow.md`: pregunta opt-in en la Ronda 3 ("¿trabajan varias personas en paralelo?"), generación del layout multi y registro del operador actual
- [x] Paso 4 — `migration-flow.md`: pasar un repo plano a multi (mover `handoff`/`backlog`/`history` a la carpeta del operador actual con `git mv`, crear `operators.md` y el backlog compartido)
- [x] Paso 5 — Reglas del modo multi: bloque "Trabajo en paralelo" en `skill/template/multi/rules.md`, que se agrega a `rules.md` antes de "Enlaces" (aprobado por el operador; no se tocaron las Reglas por defecto fijas), y definición de "operador" en plural en el `README.md` de `docs/`
- [x] Paso 6 — Task-tracker y parser compartido: resolver la carpeta del operador actual (correo de git + `operators.md`) y aceptar la ruta a una carpeta de operador; tests y README del tracker. La vista de todos los operadores queda en la Tarea 30
- [x] Paso 7 — Tests de contenido (`scripts/skill-checks/`), regresión de que el modo plano no cambia, re-medición de tokens (plano igual; costo extra del modo multi), `bun test`, `typecheck` y enlaces
- [ ] Documentar cierre de tarea (Reglas 5, 7 y 8) — solo cuando el operador lo pida

**Modo de ejecución acordado:** un paso a la vez, con confirmación del operador después de cada uno (2026-10-06).

### Qué falta

Solo el cierre (espera el pedido del operador). Paso 7 hecho (`a94adb9` operators.md recortado y registro movido a `multi/AGENTS.md`, `eb1d51d` architecture.md, `6b33aee` tests de contenido: 163 tests, typecheck limpio, 0 enlaces rotos; modo plano sin cambios: el diff de las plantillas planas contra `main` está vacío). Medición (bytes / 3,1): inicio de sesión en un repo destino plano 6.149 B ≈ 1.980 tokens (igual que antes); en modo multi 8.945 B ≈ 2.890 tokens, +2.796 B ≈ +900 tokens por sesión (AGENTS multi +1.175 B, bloque de reglas 1.104 B, operators.md 517 B), más `preferences.md` opcional 1.217 B; `multi-operator.md` 10,5 KB solo al activar o migrar. Paso 6 hecho (`27add45` parser `operators.md` en `scripts/_shared/`, `289932f` tracker: `io/operator.ts`, `--operator`, elección interactiva, título con el operador, README; 149 tests, typecheck limpio, probado con un repo multi real). Paso 5 hecho (`274d2b6`). Paso 4 hecho (`af78ce1`: sección "Pasar de plano a multi-operador" en `migration-flow.md` y enlace desde `SKILL.md`); deja una referencia pendiente a la sección "Reglas en modo multi-operador" de `multi-operator.md`, que se crea en el paso 5. Hechos antes: paso 1 (diseño, `skill/docs/multi-operator.md`, `dd152ef`); paso 2 (plantillas en `skill/template/multi/`: `AGENTS.md`, `operators.md`, `team-backlog.md`, `preferences.md`, `3941426`, renombrado en `cdc7db8`); flujos agregados al diseño (tomar directo a `handoff`, devolver una tarea, "agrega esta tarea" va al backlog propio, operador sin carpeta `- ana (solo team-backlog): correo`, `69c307f`); paso 3 (`questions-flow.md`: pregunta opt-in en la Ronda 3 y sección "Modo multi-operador", fila en las tablas resumen y bullet en `SKILL.md`, `48d72d5`).

### Decisiones a medio camino

- Alcance (operador, 2026-10-06): soporte completo por carpeta de operador, `docs/agents/<operador>/`, cada uno con su sistema de tareas y numeración; los proyectos de una persona siguen en la estructura plana (predeterminada) y el modo multi es opt-in, así que sería bump **minor**. La vista de equipo del task-tracker pasó a la Tarea 30.
- Ajustes aceptados por el operador: carpeta con nombre corto y `operators.md` en vez del correo en la ruta; backlog compartido para tareas sin dueño; reglas del proyecto compartidas en `rules.md` y solo preferencias de trabajo por operador; referencias `T-N@operador` solo entre operadores.
- Nombres (operador, 2026-10-06): el backlog de tareas sin dueño se llama `team-backlog.md` (`docs/agents/team-backlog.md`, plantilla `multi/team-backlog.md`, campo `Origen: team-backlog`) y el de cada operador sigue siendo `backlog.md`; así la carpeta del operador queda igual al modo plano y las Reglas 5, 7 y 8 no cambian de nombre. Donde este documento dice "backlog compartido" es `team-backlog.md`.
- Diseño aprobado (operador, 2026-10-06): modo multi si existe `docs/agents/operators.md`; backlog compartido sin números (título único; quien toma una tarea la mueve a su backlog con `Origen: backlog compartido`, en el mismo commit); `preferences.md` se queda como opcional, con una tabla explícita de qué va ahí y qué va en `rules.md`; al agregar una regla a `rules.md` en modo multi, el agente le recuerda al operador que se aplica a todo el proyecto y a los demás operadores; si falta `operators.md` pero hay carpetas de operador, el agente avisa y pregunta (restaurar desde HEAD, desde un commit anterior, dejar como plano o que lo restaure el operador) sin tocar nada hasta que responda.
- El historial del proyecto queda repartido por persona (las decisiones técnicas van a `decisions.md`); la línea de tiempo única sería de la vista de equipo (Tarea 30).
- Puntos de choque que resuelve: `handoff.md` único, "Próximo número de tarea" repetido, entradas de `history.md` en el mismo lugar, "operador" en singular en `rules.md`.
- Este repo sigue en estructura plana (un solo operador).
- TDD: no hay modo configurado; verificación con `bun test`, `bun run typecheck` y enlaces. `handoff.md` y `backlog.md` van en el commit de cierre; los commits del trabajo van como `tipo(T-26): ...` por unidad coherente.

### Próximo paso concreto

Esperar la revisión del operador; si pide cerrar: `history.md` (entrada de la Tarea 26), revisar bloqueadas (la Tarea 30 queda `[dependencia]` hasta cerrar la 26: se desbloquea), reporte de la Regla 8, commit de cierre `docs(T-26): close task`, y merge de `feat/multi-operator` si lo autoriza. Pendiente de decidir al publicar: bump de versión (minor, porque el modo es opt-in y no cambia lo que genera el skill en modo plano).

<!-- agent-context-kit:section=paused -->
## Tareas pausadas

Ninguna.
