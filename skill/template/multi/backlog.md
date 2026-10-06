# Backlog compartido

Tareas **sin dueño** del proyecto, visibles para todos los operadores. Las tareas que un operador ya tomó viven en su propio `backlog.md`, dentro de su carpeta.

**No lleva numeración ni contador:** dos operadores agregando a la vez tomarían el mismo número. Cada tarea se identifica por un **título único**.

**Tomar una tarea:** el operador la quita de este archivo y la agrega a su `backlog.md` con el siguiente número de su secuencia y el campo `Origen: backlog compartido`, en el mismo commit. Una tarea vive en un solo backlog. Antes de tomarse se la referencia por título; después, como `T-N@operador`.

**Formato de cada tarea** (`### <título único>`), todo breve:
- **Descripción:** de qué trata (1–3 líneas).
- **Decisiones/temas a definir antes de empezar:** qué resolver o preguntarle al operador antes de arrancar; "Ninguno" si está todo definido.
- **Bloqueos:** "Ninguno", o un valor que **empieza** con `[dependencia]` (no se puede empezar técnicamente) o `[postergada]` (conviene esperar) y el motivo. Con bloqueo va en "bloqueadas / pospuestas"; si no, en "libres".
- **Agregada:** fecha y operador.

**Anclas de sección:** no borres ni muevas los comentarios `<!-- agent-context-kit:section=... -->` (`free`, `blocked`) que preceden a cada sección: los usa el script de seguimiento de tareas.

---

<!-- agent-context-kit:section=free -->
## Tareas libres

### [Placeholder — título único de la tarea]

- **Descripción:** [Placeholder]
- **Decisiones/temas a definir antes de empezar:** [Placeholder]
- **Bloqueos:** Ninguno.
- **Agregada:** [Placeholder — fecha y operador]

<!-- agent-context-kit:section=blocked -->
## Tareas bloqueadas / pospuestas

[Placeholder — "Ninguna" si no hay]
