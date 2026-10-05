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

Sin tarea en curso.

<!-- agent-context-kit:section=paused -->
## Tareas pausadas

Ninguna.
