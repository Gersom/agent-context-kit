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

Tarea 79 — Renombrar «kit» a «suite» (agent-context-suite, comando acsuite) en todo el repo

Cambiar el término «kit» por «suite» en todas las menciones del presente del repo y de la skill (repo aparte, con git -C skill), y el comando ackit por acsuite: carpeta scripts/ackit/ a scripts/acsuite/, textos de ayuda, README raíz y de scripts, architecture.md, philosophy.md, releasing.md, rules.md, package.json (description), tests y fixtures. Fuera del cambio: los tags de git y history.md (registro histórico). Hecho: no quedan menciones de «kit» ni de ackit en el presente (salvo las históricas), bun test y typecheck pasan, y docs-check da 0 errores.

- **Detalles:** Va antes de publicar en npm (T-77): el nombre del paquete no se puede cambiar después de publicado. La T-75 ya fija name y bin en package.json. Renombrar el repo Gersom/agent-context-kit en GitHub afecta la URL de package.json, los README y la skill; GitHub redirige el nombre viejo. Revisar el marcador y la versión de la skill si se cambia su plantilla.

### Qué falta

Toda la tarea.

### Decisiones a medio camino

Decidido: término «suite»; paquete agent-context-suite (npm, sin scope); comando acsuite. Falta: cómo se llama el repo en GitHub (lo renombra el operador) y la forma de decir «el kit» en español («la suite»).

### Próximo paso concreto

Empezar la tarea.

<!-- agent-context-skill:section=paused -->
## Tareas pausadas

Ninguna.
