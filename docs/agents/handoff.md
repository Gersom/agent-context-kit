# Handoff

Estado "en caliente": en qué se está ahora mismo. **Se sobrescribe completo en cada actualización** — es una foto del presente, no un historial. Se actualiza en cada paso del plan y al cerrar la tarea (Reglas 5 y 6 de `rules.md`), con el próximo paso concreto, para que un chat nuevo retome sin depender de la sesión anterior.

- Pendientes → [`./backlog.md`](./backlog.md) · Cerradas (hechas o descartadas) → [`./history.md`](./history.md)
- Sin tarea en curso: la sección "Tarea en progreso" dice "Sin tarea en curso" (no deja el contenido de la última cerrada). "Tareas pausadas" es independiente y queda en "Ninguna" si no hay.
- **No borres ni muevas los comentarios `<!-- agent-context-kit:section=... -->`** (`in-progress`, `paused`): los usa el script de seguimiento de tareas de agent-context-kit y, como este archivo se reescribe completo, hay que reescribirlos siempre. La tarea en curso va en una línea `Tarea N — título` antes de la primera subsección `###`.
- **Tarea pausada:** un bloque `### Tarea N — título` con los campos `Plan` (opcional: los checkboxes de "Tarea en progreso" tal cual, con lo hecho marcado), `Qué falta`, `Decisiones a medio camino`, `Próximo paso concreto`, `Por qué se pausó` y `Qué espera para retomarse`.

---

<!-- agent-context-kit:section=in-progress -->
## Tarea en progreso

Sin tarea en curso.

<!-- agent-context-kit:section=paused -->
## Tareas pausadas

Ninguna.
