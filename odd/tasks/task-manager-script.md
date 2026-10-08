# task-manager-script — Tarea 24 (script de gestión de tareas)

Seguimiento ODD de la Tarea 24 de `docs/agents/gersom/`. El estado del proyecto (plan por pasos, decisiones, próximo paso) vive en `docs/agents/gersom/handoff.md`; este archivo solo guarda el seguimiento de enrutado, evidencia y commits.

- **Rama:** `feat/task-manager` (desde `main`, 0e98a8a)
- **Mirror Engram:** pendiente — las herramientas `mem_*` no están disponibles en esta sesión.
- **TDD:** sin configurar (sin `gentle-ai.tdd` ni decisión del operador); tener `bun test` no lo activa. Se corren checks funcionales: `bun test` y `bun run typecheck` (raíz).
- **Alcance autorizado:** crear `scripts/task-manager/`, ampliar `scripts/_shared/parse/` con posiciones, tocar docs/plantillas del paso 7 y los archivos de `docs/agents/gersom/`. Sin push, PR ni merge.
- **Ejecución:** por etapas, con pausa y resumen al final de cada una.
- **Presupuesto de entrega:** pronóstico > 400 líneas cambiadas; estrategia `ask-on-risk` (pendiente de elegir cadena de PRs si se llega a abrir PR).

## Tareas

Los IDs coinciden con los pasos del plan de `handoff.md`.

- [x] P1 — Posiciones línea/offset en `_shared/parse/` + tests · ruta: delegada (toca ≥2 archivos no triviales) · commit `ffb28d1` · checks: `bun test` 311 pass / 0 fail, `bun run typecheck` limpio (corridos por el orquestador) · revisión nativa: sin evaluar (`gentle-ai review assess` no corrido)
- [x] P2 — Esqueleto de `scripts/task-manager/` + helper de edición quirúrgica · ruta: delegada · commit en `feat/task-manager` tras `ffb28d1` · checks: `bun test` 434 pass / 0 fail, `bun run typecheck` limpio, `bun run task whoami|anchors` sobre los docs reales OK (orquestador) · revisión nativa: sin evaluar
- [x] P3 — Etapa 1: `status`, `next`, `show N` · ruta: delegada · commit en `feat/task-manager` tras `26dcb35` · checks: `bun test` 528 pass / 0 fail, `bun run typecheck` limpio, `status`/`next`/`show 4`/`show 999` sobre los docs reales OK (orquestador) · revisión nativa: sin evaluar
- [x] P4 — Etapa 2: `add`, `start` · ruta: delegada · commit en `feat/task-manager` tras `cd296b7` · checks: `bun test` 657 pass / 0 fail, `bun run typecheck` limpio, `add`/`start` sin `--apply` y con `--apply --dry-run` sobre los docs reales: diff mostrado, hashes de `docs/` sin cambios (orquestador) · revisión nativa: sin evaluar
- [x] P5 — Etapa 3: `step`, `pause`, `resume`, `block`, `unblock` · ruta: delegada · commits `e199cb7`, `d667f89`, `c2e33d8`, `adcfec2` · checks: `bun test` 713 pass / 0 fail, `bun run typecheck` limpio (re-corridos por el orquestador) · revisión nativa: sin evaluar
- [x] P6 — Etapa 4: `close --done|--discarded` (Reglas 5 a 8) · ruta: delegada · commits `4189490`, `a5275b9`, `9ab555e`, `5310627` · checks: `bun test` 766 pass / 0 fail, `bun run typecheck` limpio (re-corridos por el orquestador) · revisión nativa: sin evaluar
- [x] P7 — Docs: README raíz y `architecture.md`, sección en `rules.md`, `Origen` en multi-operator y team-backlog · ruta: inline + delegada (close sobre backlog) · commits `d4c95ed`, `d396e07`, `277bd93`, `7cb163f`, `b0ae795`, `7b70451` · checks: `bun test` 779 pass / 0 fail, `bun run typecheck` limpio (orquestador) · revisión nativa: sin evaluar

## Progreso

- Paso previo hecho: rama creada, `handoff.md` con la tarea en curso.
- Tarea 24 quitada de `backlog.md` (el `sed -i` fue denegado; tras el "sigue" del operador se hizo con `Edit`).
- P1 hecho y commiteado. Ajuste fuera de `_shared/`: una aserción en `scripts/task-tracker/test/model/model.test.ts` pasó de `toEqual` a `toMatchObject` porque `Subsection` ahora trae `range`.

- P2 hecho y commiteado. Sin dependencias nuevas. Duplica a propósito `gitEmail`, `invocationDir`, `cleanPathInput` y la lógica de `operators.md` del task-tracker (sin acoplarlos); candidato a moverse a `_shared/` en otra tarea.

- P3 hecho y commiteado. Cambio fuera de `query/` y `commands/`: `readDocs` acepta `Pick<Workspace, "files">` para leer carpetas de otros operadores. Salida real: `status` ≈ 1,1 KB frente a ~83 KB de los 4 archivos; `show` de una tarea cerrada ≈ 2% de `history.md`.

- P4 hecho y commiteado. Decisión del operador (2026-10-07): las escrituras exigen `--apply`; sin él solo se muestra el diff. Cambios fuera de `commands/`: `src/cli/{types,dispatch,args,help}.ts`, `src/workspace/{operator,workspace,ownership}.ts`, `src/edit/{changes,layout}.ts`, `src/query/*` (`findNextTaskNumber` devuelve también offsets), nuevo `src/write/`.

- P5 hecho y commiteado (4 commits). Cambios fuera de `commands/`: `src/write/{handoff,blocking,json}.ts`, `ctx.commit(changes,{quiet})` en el núcleo, `replaceSubsectionBody`/`insertBlock` en `edit/layout.ts` y un `export` (`LEADING_TAG_RE`) en `_shared/tasks/block-info.ts`. `pause` amplía el formato de tarea pausada (Descripción, extras, modo) para que `resume` la restaure tal cual; pendiente de confirmar con el operador. `block`/`unblock` no soportan tareas agrupadas ni `team-backlog.md`.

- P6 hecho y commiteado (4 commits). Cambios fuera de `commands/`: `src/write/{unblocking,history,new-task}.ts`, `reserveNextNumbers` en `numbering.ts`, `FlagSpec.multiple` en `src/cli/*`; la lógica de `unblock` se extrajo y se comparte con `close`. `Origen: team-backlog` → primera viñeta de la entrada de history. Cuatro ambigüedades pendientes del operador (ver handoff).

## Verificación

- P6: `bun test` → 766 pass, 0 fail (57 archivos); `bun run typecheck` sin errores; pruebas manuales del subagente solo en copias; hashes de `docs/` sin cambios.
- P5: `bun test` → 713 pass, 0 fail (54 archivos); `bun run typecheck` sin errores; pruebas manuales del subagente solo en copia temporal; hashes de `docs/` sin cambios.
- P4: `bun test` → 657 pass, 0 fail (51 archivos); `bun run typecheck` sin errores; pruebas manuales del subagente solo en copias temporales; real: `add` sin `--apply` muestra el diff y no escribe, `start 1` falla limpio por tarea en curso.
- P3: `bun test` → 528 pass, 0 fail (45 archivos); `bun run typecheck` sin errores.
- P1: `bun test` → 311 pass, 0 fail (31 archivos); `bun run typecheck` sin errores.
- P2: `bun test` → 434 pass, 0 fail (40 archivos); `bun run typecheck` sin errores; `whoami` y `anchors` sobre los docs reales: operador `gersom`, anclas OK, sin escrituras.

## Próximo paso

P7 (docs), tras la confirmación del operador y sus respuestas a las 4 ambigüedades de `close`. Decisiones de P5 resueltas (2026-10-07): formato ampliado de tarea pausada aceptado; `pause` estricto.

## Cierre

- Tarea cerrada a pedido del operador. Cierre en `docs(T-24): close task`. Revisión nativa: sin evaluar. Mirror Engram: pendiente (sin herramientas `mem_*`). Rama `feat/task-manager` (incluye la T-32), sin push ni PR.
