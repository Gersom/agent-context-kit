<!-- agent-context-kit:signature — ignorar al leer/actualizar este archivo, no es contenido. Existe solo para identificar que fue generado por https://github.com/Gersom/agent-context-kit, útil para el flujo de migración (ver src/docs/migration-flow.md) cuando hay que distinguir este skill de un sistema de documentación parecido pero distinto. Opcional: su ausencia no significa que el archivo no sea de este skill. -->

# Handoff

Estado "en caliente" del trabajo: en qué se está ahora mismo. **Este archivo se sobrescribe completo cada vez que se actualiza** — no se agregan entradas nuevas debajo de las viejas, es una foto del presente, no un historial.

- Historial de tareas ya cerradas (hechas o descartadas) → [`./history.md`](./history.md)
- Cola de tareas pendientes que todavía no se empezaron → [`./backlog.md`](./backlog.md)

Si no hay ninguna tarea en curso, la sección "Tarea en progreso" debe decir explícitamente "Sin tarea en curso" en vez de quedar con el contenido de la última tarea ya cerrada. "Tareas pausadas" es independiente: puede tener contenido aunque no haya tarea en progreso (ej. se pausaron todas), y queda en "Ninguna" cuando no hay ninguna pausada.

Regla 6 de `rules.md`: este archivo se actualiza en cada paso completado del plan, no solo al cerrar la tarea — el objetivo es que, si la conversación se corta a mitad de camino, un chat nuevo pueda retomar exactamente desde acá sin depender de la memoria de la sesión anterior.

---

## Tarea en progreso

<!-- La única tarea que se está trabajando activamente ahora mismo (a diferencia de las pausadas, puede haber como máximo una). Incluye su número de `backlog.md` si vino de ahí. -->

**Tarea:** [Placeholder — "Tarea N — título", o "Sin tarea en curso"]

<!-- Descripción breve de qué se está haciendo y por qué (una o dos líneas). -->

[Placeholder]

### Plan (solo si la tarea es mediana/grande — ver Regla 2 de `rules.md`)

<!-- Si la tarea ameritó plan, va acá: los pasos acordados con el operador, marcando en cuál se está parado, y el modo de ejecución acordado (todos seguidos sin pausa vs. uno a la vez con confirmación). El último paso siempre es "Documentar cierre de tarea" (Regla 7). Si la tarea fue chica y se ejecutó directo, esta sección no aplica: borrarla o dejarla en "No aplica". -->

- [ ] Paso 1 — [placeholder]
- [ ] Paso 2 — [placeholder]
- [ ] Documentar cierre de tarea

**Modo de ejecución acordado:** [todos los pasos seguidos / uno a la vez con confirmación]

### Qué falta

<!-- Lo que falta específicamente de ESTA tarea para darla por cerrada. No es el backlog general del proyecto (eso va en backlog.md) — es el resto de lo que ya se empezó. -->

[Placeholder]

### Decisiones a medio camino

<!-- Cosas que se decidieron sobre la marcha pero no están cerradas del todo, o contexto que se perdería si se corta la conversación acá y otro agente tiene que retomarla. Si la decisión ya quedó firme y es de arquitectura/stack, no la dupliques acá: anótala en su archivo correspondiente y linkeala. -->

[Placeholder]

### Próximo paso concreto

<!-- Qué hacer apenas se retome esto, para no tener que releer todo el archivo y re-descubrirlo. -->

[Placeholder]

## Tareas pausadas

<!--
Tareas que se empezaron (tuvieron su propio "Tarea en progreso" en algún momento) pero se dejaron en pausa por otra prioridad, sin cerrarse ni volver al backlog. Puede haber varias a la vez. Un bloque por tarea, con este formato:

### Tarea [N] — [Título corto de la tarea]

- **Qué falta:** lo mismo que en "Tarea en progreso".
- **Decisiones a medio camino:** ídem.
- **Próximo paso concreto:** ídem.
- **Por qué se pausó:** el motivo (ej. "surgió una prioridad mayor", "requiere algo no contemplado al empezar").
- **Qué espera para retomarse:** qué tiene que pasar para que vuelva a ser la tarea en progreso (ej. "que el operador la priorice de nuevo", "que se cierre la Tarea 3").

Si no hay ninguna tarea pausada, esta sección queda en "Ninguna".
-->

[Placeholder — "Ninguna" si no aplica]
