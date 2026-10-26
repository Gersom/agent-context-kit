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

Sin tarea en curso

<!-- agent-context-skill:section=paused -->
## Tareas pausadas

### Tarea 72 — CLI único ackit con subcomandos

- **Descripción:** Un punto de entrada ackit que despache a tasks (task-tracker, aún con su nombre actual), task (task-manager) y check (docs-check). Actualizar los scripts de package.json, los README de cada script y el README raíz. Hecho: ackit tasks|task|check <args> funciona con Bun y con Node.
- **Detalles:** Un solo paquete y un solo bin (ackit); los scripts comparten _shared y el formato de los archivos del proyecto, por eso no se separan. Va antes que la tarea de renombrar tasks a board. Depende de la tarea de quitar APIs de Bun.
- **Qué falta:** Todo: no se tocó código; solo está el plan propuesto en el chat.
- **Decisiones a medio camino:** Ninguna.
- **Próximo paso concreto:** Confirmar el plan con el operador y empezar por el paso 1.
- **Por qué se pausó:** El operador pidió hacer antes la T-73 (renombrar tasks a board).
- **Qué espera para retomarse:** Que termine la T-73; retomarla con el plan de 7 pasos propuesto (refactor del tracker a main(argv), despachador scripts/ackit, package.json, tests, docs, verificación con Bun y Node, cierre), pendiente de confirmar pasos y modo de ejecución.
