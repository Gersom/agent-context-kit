# Backlog

Cola de tareas pendientes: el "qué falta" a nivel proyecto. No es la tarea en curso (eso vive en [`./handoff.md`](./handoff.md)) ni lo ya cerrado (eso vive en [`./history.md`](./history.md)).

**Ciclo de vida de un item:**
1. Se agrega acá cuando se identifica pero todavía no se empieza.
2. Cuando se empieza a trabajar, se saca de esta lista y pasa a ser la tarea actual (o pausada) en `handoff.md` (referenciando el título del item).
3. Cuando se cierra (hecha o descartada), sale de `handoff.md` y se registra en `history.md`.

No dejar en este archivo tareas que ya se están trabajando o que ya se cerraron — sería duplicar lo que corresponde a `handoff.md`/`history.md`.

**Dos secciones:** las tareas viven en "Tareas libres" (listas para tomar) o "Tareas bloqueadas / pospuestas" (no se toman todavía). Cuando el motivo de una tarea bloqueada deja de aplicar, se mueve a "Tareas libres" — ver Regla 7 de `rules.md` (no se borra el campo `Bloqueos`, se marca como resuelto).

**Agrupamiento (solo en "Tareas libres"):** si esta sección supera las 15 tareas (Regla 7 de `rules.md`), se evalúa agrupar 2 o más que compartan un objetivo real. El criterio no es un tope de cantidad — es que el grupo entero quepa en una sola frase de objetivo compartido, sin usar "y" para forzar una tarea que en realidad no pertenece. Un grupo aparece en "Tareas libres" como una sola línea corta; el detalle completo de cada tarea que lo compone se mueve a la sección "Tareas agrupadas" (más abajo), que no hace falta leer salvo que el operador pida el detalle de una tarea puntual o se vaya a tomar una. Si un grupo queda con una sola tarea (las demás se tomaron o cerraron), se desarma: esa tarea vuelve a ser una entrada individual normal en "Tareas libres".

**Numeración:** cada tarea tiene un número correlativo fijo, asignado una sola vez al crearse. El número **nunca se reutiliza**, ni siquiera cuando la tarea se cierra (hecha o descartada) y pasa a `history.md` — sirve para referenciar una tarea sin ambigüedad (ej. "la tarea 3") de forma estable en el tiempo, independientemente de en qué archivo esté viviendo hoy. No es un orden de cola: el número se asigna al crear la tarea, no cuando se ejecuta (se puede tomar tareas fuera de orden).

Para agregar una tarea nueva: leer **"Próximo número de tarea"** más abajo, usar ese valor, y actualizar la línea a N+1. Si una tarea en curso (documentada en `handoff.md`) hace surgir tareas nuevas, también se les asigna número acá siguiendo el mismo mecanismo, aunque no se vayan a ejecutar pronto.

<!--
Backfill (solo la primera vez que se adopta este mecanismo en un proyecto con tareas ya existentes sin número): numerar los items de este archivo en el orden en que aparecen (de arriba hacia abajo), dejar "Próximo número de tarea" en max+1, y agregar una nota explícita (acá mismo, debajo de esta línea, o en `handoff.md`) del tipo: "Numeración iniciada el [fecha]; tareas ya cerradas antes de esa fecha (en `history.md`) no tienen número asignado retroactivamente." No se renumera `history.md` hacia atrás.
-->

**Próximo número de tarea:** 1

---

<!--
Un bloque por tarea, con este formato:

## Tarea [N] — [Título corto de la tarea]

- **Descripción:** de qué trata la tarea.
- **Decisiones/temas a definir antes de empezar:** qué hay que resolver o preguntarle al operador antes de poder arrancarla. "Ninguno" si ya está todo definido.
- **Bloqueos:** qué tiene que pasar antes de poder empezarla — ej. que termine otra tarea de este backlog (linkear su título), o una dependencia externa. "Ninguno" si no aplica. Si aplica, se etiqueta el motivo: `[dependencia]` (no se puede empezar técnicamente) o `[postergada]` (se podría empezar, pero conviene esperar — ej. se va a re-trabajar si se hace antes de tiempo). Una tarea con `Bloqueos` distinto de "Ninguno" va en la sección "Tareas bloqueadas / pospuestas"; el resto, en "Tareas libres".
- **Desbloquea:** (opcional — solo si al cerrar esta tarea, otra tarea de este backlog deja de estar bloqueada) qué tarea(s) quedan libres, para que el link sea bidireccional y no dependa de acordarse de revisarlo.
- **Disparador:** cuándo corresponde tomar esta tarea — ej. "cuando se toque el módulo de pagos", "cuando el operador pida X", "cuando se cierre la tarea Y". Si no hay condición especial, el default es "Cuando el operador pregunte por tareas pendientes".
- **Detalles:** contexto extendido, solo si hace falta. Si el detalle ya vive (o va a vivir) en otro archivo — una decisión técnica en `decisions.md`, una zona frágil en `known-issues.md` — no lo dupliques acá: linkealo.
- **Agregada:** fecha en que se sumó al backlog.
-->

## Tareas libres

<!--
Cuando una tarea está agrupada (ver "Agrupamiento" más arriba), acá va una línea corta en vez de su bloque completo:

### Grupo — [Título del objetivo compartido] (Tareas [N], [M])

- **Resumen:** [una frase que describe el objetivo común de todas las tareas del grupo]
- **Detalle completo:** ver "Tareas agrupadas" más abajo.
-->

### Tarea [N] — [Placeholder — título corto de la tarea]

- **Descripción:** [Placeholder]
- **Decisiones/temas a definir antes de empezar:** [Placeholder]
- **Bloqueos:** Ninguno.
- **Disparador:** [Placeholder]
- **Detalles:** [Placeholder]
- **Agregada:** [Placeholder]

## Tareas bloqueadas / pospuestas

### Tarea [N] — [Placeholder — título corto de la tarea]

- **Descripción:** [Placeholder]
- **Decisiones/temas a definir antes de empezar:** [Placeholder]
- **Bloqueos:** [Placeholder — `[dependencia]` o `[postergada]` + motivo]
- **Desbloquea:** [Placeholder, o quitar el campo si no aplica]
- **Disparador:** [Placeholder]
- **Detalles:** [Placeholder]
- **Agregada:** [Placeholder]

## Tareas agrupadas

<!--
Detalle completo (mismo formato de siempre) de las tareas que están agrupadas en "Tareas libres". Esta sección no hace falta leerla solo para ver qué tareas hay disponibles — se abre cuando el operador pide el detalle de una tarea puntual o el agente va a tomarla. Un bloque de tareas por grupo:

### Grupo — [Título del objetivo compartido]

#### Tarea [N] — [Título corto de la tarea]

- **Descripción:** [igual que cualquier tarea]
- **Decisiones/temas a definir antes de empezar:** [igual]
- **Bloqueos:** Ninguno (si estuviera bloqueada, no estaría en "Tareas libres" agrupada).
- **Disparador:** [igual]
- **Detalles:** [igual]
- **Agregada:** [igual]

#### Tarea [M] — [Título corto de la tarea]

(mismo formato)

Si un grupo se desarma (queda con una sola tarea), se borra su bloque de acá y esa tarea vuelve a "Tareas libres" con su formato individual normal.
-->

No aplica todavía — ningún grupo formado.
