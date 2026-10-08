# Backlog del equipo

Tareas **sin dueño** del proyecto, visibles para todos los operadores. Las tareas que un operador ya tomó viven en su propio `backlog.md`, dentro de su carpeta.

**No lleva numeración ni contador:** dos operadores agregando a la vez tomarían el mismo número. Cada tarea se identifica por un **título único**.

**Tomar una tarea:** el operador la quita de este archivo y recibe el siguiente número de su secuencia. Va a su `backlog.md` si la deja en espera, o directo a su `handoff.md` si la empieza ya; en los dos casos lleva el campo `Origen: team-backlog` (línea `- **Origen:** team-backlog`, que llega hasta su `history.md` como primera viñeta), en el mismo commit. Una tarea vive en un solo lugar. Antes de tomarse se la referencia por título; después, como `T-N@operador`.

**Devolver una tarea** que no se puede seguir: vuelve acá, sin número y con la nota `Devuelta por <operador> (antes T-N@operador)`. El número queda retirado y no se reutiliza.

**Agregar tareas:** quien las agrega a pedido de su agente las deja acá solo si lo dice explícitamente; si no, van a su propio `backlog.md`. Quien solo recolecta tareas (sin carpeta) completa como mínimo título y descripción; quien la toma completa el resto.

**Formato de cada tarea** (`### <título único>`), todo breve:
- **Descripción:** de qué trata (1–3 líneas).
- **Decisiones/temas a definir antes de empezar:** qué resolver o preguntarle al operador antes de arrancar; "Ninguno" si está todo definido.
- **Bloqueos:** "Ninguno", o un valor que **empieza** con `[dependencia]` (no se puede empezar técnicamente) o `[postergada]` (conviene esperar) y el motivo. Con bloqueo va en "bloqueadas / pospuestas"; si no, en "libres".
- **Agregada:** fecha y operador.

**Anclas de sección:** no borres ni muevas los comentarios `<!-- agent-context-kit:section=... -->` (`free`, `blocked`) que preceden a cada sección: los usa el script de seguimiento de tareas.

---

<!-- agent-context-kit:section=free -->
## Tareas libres

### Prompt de normalización para repos que ya adoptaron el skill

- **Descripción:** escribir el prompt que el operador corre en cada repo que adoptó el skill antes de las anclas (`T-9@gersom`), para que el agente de ese repo agregue las anclas de sección y ajuste `backlog.md`/`handoff.md` (y el formato de `history.md`) a la estructura que lee el task-tracker. Se entrega al operador en el chat y queda guardado junto al script para reusarlo.
- **Decisiones/temas a definir antes de empezar:** dónde queda guardado (propuesta: README de `scripts/task-tracker/`).
- **Bloqueos:** `[Resuelto el 2026-10-05]` — era `[postergada]` hasta que el task-tracker llegara a su versión MVP; el operador confirmó el MVP el 2026-10-05, al cerrar la `T-21@gersom`. Ya no hay bloqueo.
- **Detalles:** antes estaba dentro de la `T-11@gersom`. La `T-15@gersom` (validador) puede servir para verificar el resultado del prompt en cada repo. Era la Tarea 19 de gersom; ese número queda retirado.
- **Agregada:** 2026-10-05 por gersom

<!-- agent-context-kit:section=blocked -->
## Tareas bloqueadas / pospuestas

Ninguna.
