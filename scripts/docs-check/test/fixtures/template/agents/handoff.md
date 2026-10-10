<!-- agent-context-kit:signature — ignorar al leer/actualizar este archivo, no es contenido. Existe solo para identificar que fue generado por https://github.com/Gersom/agent-context-kit, útil para el flujo de migración (ver skill/docs/migration-flow.md) cuando hay que distinguir este skill de un sistema de documentación parecido pero distinto. Opcional: su ausencia no significa que el archivo no sea de este skill. -->

# Handoff

Estado "en caliente": en qué se está ahora. **Se actualiza editando solo lo que cambió**, sin reescribir el archivo entero, en cada paso del plan y al cerrar la tarea (ej. al avanzar el paso 3, solo el checkbox y la nota de ese paso, "Qué falta" y "Próximo paso concreto"): es una foto del presente, no un historial, con el próximo paso concreto para que un chat nuevo retome sin depender de la sesión anterior.

- Pendientes → [`./backlog.md`](./backlog.md) · Cerradas (hechas o descartadas) → [`./history.md`](./history.md)
- Sin tarea en curso: "Tarea en progreso" dice "Sin tarea en curso" (no deja el contenido de la última cerrada); "Tareas pausadas" queda en "Ninguna" si no hay.
- **No borres ni muevas los comentarios `<!-- agent-context-kit:section=... -->`** (`in-progress`, `paused`): los lee el script de seguimiento de tareas; al editar solo lo que cambió no se tocan, y si alguna vez se reescribe el archivo entero hay que reescribirlos. La tarea en curso va en una línea `Tarea N — título` antes de la primera subsección `###`.
- **Tarea pausada:** un bloque `### Tarea N — título` con `Plan` (opcional: los checkboxes de "Tarea en progreso" tal cual), `Qué falta`, `Decisiones a medio camino`, `Próximo paso concreto`, `Por qué se pausó` y `Qué espera para retomarse`.
- **Línea de un paso:** `- [x] Paso N — texto · evidencia · commit abc1234`. El texto tras el checkbox es libre (evidencia y commit van al final, según la Regla 6); los checkboxes son solo los pasos del plan, porque el script de seguimiento cuenta como paso todo `- [ ]` de «Tarea en progreso».
- Las reglas para cerrar una tarea están al final de [`rules.md`](./rules.md).

---

<!-- agent-context-kit:section=in-progress -->
## Tarea en progreso

<!-- La única tarea que se trabaja activamente ahora (máximo una). Incluye su número de `backlog.md` si vino de ahí. -->

**Tarea:** [Placeholder — "Tarea N — título", o "Sin tarea en curso"]

<!-- Qué se está haciendo y por qué (una o dos líneas). -->

[Placeholder]

### Plan (solo si la tarea es mediana/grande — ver Regla 2 de `rules.md`)

<!-- Los pasos acordados con el operador, marcando en cuál se está, y el modo de ejecución acordado. El último paso siempre es "Documentar cierre de tarea" (Regla 7). Si la tarea fue chica, borrar esta sección o dejarla en "No aplica". -->

- [ ] Paso 1 — [placeholder]
- [ ] Paso 2 — [placeholder]
- [ ] Documentar cierre de tarea

**Modo de ejecución acordado:** [todos los pasos seguidos / uno a la vez con confirmación]

### Qué falta

<!-- Lo que falta de ESTA tarea para cerrarla (no el backlog general). -->

[Placeholder]

### Decisiones a medio camino

<!-- Lo decidido sobre la marcha que no está cerrado, o contexto que se perdería si se corta la conversación. Si la decisión ya es firme y de arquitectura/stack, anotarla en su archivo y linkearla. -->

[Placeholder]

### Próximo paso concreto

<!-- Qué hacer apenas se retome, sin tener que releer todo. -->

[Placeholder]

<!-- agent-context-kit:section=paused -->
## Tareas pausadas

<!-- Tareas empezadas y dejadas en pausa por otra prioridad, sin cerrarse ni volver al backlog; puede haber varias. Un bloque por tarea con el formato de arriba. -->

[Placeholder — "Ninguna" si no aplica]
