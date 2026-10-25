# Handoff

Estado "en caliente": en qué se está ahora. **Se actualiza editando solo lo que cambió**, sin reescribir el archivo entero, en cada paso del plan y al cerrar la tarea (ej. al avanzar el paso 3, solo el checkbox y la nota de ese paso, "Qué falta" y "Próximo paso concreto"): es una foto del presente, no un historial, con el próximo paso concreto para que un chat nuevo retome sin depender de la sesión anterior.

- Pendientes → [`./backlog.md`](./backlog.md) · Cerradas (hechas o descartadas) → [`./history.md`](./history.md)
- Sin tarea en curso: "Tarea en progreso" dice "Sin tarea en curso" (no deja el contenido de la última cerrada); "Tareas pausadas" queda en "Ninguna" si no hay.
- **No borres ni muevas los comentarios `<!-- agent-context-skill:section=... -->`** (`in-progress`, `paused`): los lee el script de seguimiento de tareas; al editar solo lo que cambió no se tocan, y si alguna vez se reescribe el archivo entero hay que reescribirlos. La tarea en curso va en una línea `Tarea N — título` antes de la primera subsección `###`.
- **Tarea pausada:** un bloque `### Tarea N — título` con `Plan` (opcional: los checkboxes de "Tarea en progreso" tal cual), `Qué falta`, `Decisiones a medio camino`, `Próximo paso concreto`, `Por qué se pausó` y `Qué espera para retomarse`.
- **Línea de un paso:** `- [x] Paso N — texto · evidencia · commit abc1234`. El texto tras el checkbox es libre (evidencia y commit van al final, según la Regla 7); los checkboxes son solo los pasos del plan, porque el script de seguimiento cuenta como paso todo `- [ ]` de «Tarea en progreso».
- Las reglas para cerrar una tarea están al final de [`rules.md`](../rules.md).

---

<!-- agent-context-skill:section=in-progress -->
## Tarea en progreso

Tarea 61 — Reevaluar project/stack.md

Reevaluar la plantilla project/stack.md de la skill: para qué sirve, si se solapa con architecture.md y decisions.md, y si debe seguir en el set intermedio y completo.

### Plan

- [x] Mapear las referencias a decisions.md y stack.md en la skill y el kit
- [x] Skill, plantillas: carpeta template/project/decisions/ (README y stack), sin decisions.md ni stack.md sueltos, y enlace de rules.md al índice
- [x] Skill, flujos: questions-flow (carpeta desde la idea, pregunta Stack, sets), migration-flow, template-architecture, README de plantillas y changelog 2.0
- [x] Kit: check decisions-index en docs-check con tests, fixtures y documentación
- [ ] Verificar con bun test, typecheck, docs-check, generación de prueba en frío y revisión con el revisor
- [ ] Documentar cierre de tarea

**Modo de ejecución acordado:** todos seguidos

### Qué falta

Falta la generación de prueba en frío, la revisión y el cierre

### Decisiones a medio camino

Confirmar el alcance: se entendió la plantilla template/project/stack.md de la skill (el pedido decía «project(stack.md»).

### Próximo paso concreto

Generar docs en un repo idea con un subagente en frío y revisar la carpeta decisions/

<!-- agent-context-skill:section=paused -->
## Tareas pausadas

Ninguna.
