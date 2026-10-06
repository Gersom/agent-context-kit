# Handoff

Estado "en caliente" del trabajo: en qué se está ahora mismo. **Este archivo se sobrescribe completo cada vez que se actualiza** — no se agregan entradas nuevas debajo de las viejas, es una foto del presente, no un historial.

- Historial de tareas ya cerradas (hechas o descartadas) → [`./history.md`](./history.md)
- Cola de tareas pendientes que todavía no se empezaron → [`./backlog.md`](./backlog.md)

Si no hay ninguna tarea en curso, la sección "Tarea en progreso" debe decir explícitamente "Sin tarea en curso". "Tareas pausadas" es independiente y queda en "Ninguna" cuando no hay ninguna pausada.

Regla 6 de `rules.md`: este archivo se actualiza en cada paso completado del plan, no solo al cerrar la tarea — así, si la conversación se corta a mitad de camino, un chat nuevo puede retomar exactamente desde acá.

**Anclas de sección:** "Tarea en progreso" y "Tareas pausadas" van precedidas por un comentario `<!-- agent-context-kit:section=... -->` (`in-progress`, `paused`). Son comentarios de máquina — los usa el script de seguimiento de tareas (`scripts/task-tracker/`) para ubicar las secciones sin depender del idioma de los headers. No se traducen ni se mueven, y como este archivo se sobrescribe completo, **hay que reescribirlas siempre** en cada actualización. La tarea en progreso se identifica por la primera `Tarea N — título` dentro de la sección `in-progress`. Detalle completo en [`../../src/docs/template-architecture.md`](../../src/docs/template-architecture.md), sección "Anclas de sección".

---

<!-- agent-context-kit:section=in-progress -->
## Tarea en progreso

**Tarea:** Tarea 23 — Separar el parser de `parse/*.ts` para reutilizarlo en otros scripts

Extraer el parseo de `handoff.md`/`backlog.md`/`history.md` del task-tracker a un módulo compartido, para que lo usen el validador (Tarea 15) y el script de gestión de tareas (Tarea 24). Refactor puro: el task-tracker no cambia de comportamiento. Rama `refactor/shared-parser`.

### Plan

- [x] Paso 1 — Crear la rama `refactor/shared-parser` desde `main`
- [x] Paso 2 — Crear `scripts/_shared/` y mover `parse/*.ts`, `block-info.ts`, `task-refs.ts` y los tipos del dominio
- [x] Paso 3 — Actualizar los imports del task-tracker
- [x] Paso 4 — Mover los tests de parse/tasks y los fixtures; `bun test` y `bun run typecheck` en verde (commit `dc4b685`)
- [x] Paso 5 — Verificar que el task-tracker se ve igual (`--once` sobre este repo)
- [x] Paso 6 — Actualizar `docs/architecture.md` y el README del task-tracker
- [ ] Documentar cierre de tarea (Reglas 5, 7 y 8) — solo cuando el operador lo pida

**Modo de ejecución acordado:** todos los pasos seguidos.

### Qué falta

Solo el cierre, que espera el pedido explícito del operador (ver `rules.md`, reglas específicas). Pendiente de cierre: mergear la rama `refactor/shared-parser` a `main` (decisión del operador).

### Decisiones a medio camino

- Ubicación: `scripts/_shared/` (decisión del operador, 2026-10-06): el `_` marca código de apoyo; las carpetas sin `_` son scripts. Documentado en `docs/architecture.md`.
- Se mueven también `block-info.ts` y `task-refs.ts` (los necesitan las Tareas 15 y 24). Las posiciones línea/offset del parser NO se agregan acá: van en la Tarea 24.
- Los fixtures y `helpers.ts` quedaron en `scripts/_shared/test/`; los tests del task-tracker los importan de ahí.
- `.codegraph/` (índice local) se agregó a `.gitignore`.
- TDD: no hay modo configurado; verificación con `bun test` (106 tests) y `bun run typecheck`.
- Ruta: inline, mecánica (movimiento de archivos y imports; solo `shared/types.ts` requirió separar tipos). Seguimiento en este archivo y no en `odd/tasks/` para no duplicar (Regla 1).
- Al cerrar: la Tarea 24 menciona la Tarea 22 ya resuelta en su `Bloqueos` y el task-tracker lo marca como "¿moverla a libres?"; conviene reformular esa frase para que no parezca una dependencia.

### Próximo paso concreto

Esperar la revisión del operador; si pide cerrar: `history.md`, revisar bloqueadas (la Tarea 24 pasa a libres), reporte de la Regla 8 y mergear la rama si lo autoriza.

<!-- agent-context-kit:section=paused -->
## Tareas pausadas

Ninguna.
