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

Tarea 121 — Board: quitar los flags --operator, --compact, --arrows y --follow

Quitar del board los flags --operator <carpeta>, --compact/--no-compact, --arrows/--no-arrows y --follow/--no-follow, con sus tests. Quedan --once, la ruta, el operador posicional y -h. Compacto, flechas y observador se cambian con las teclas c, f y o y se recuerdan en settings.json.

- **Detalles:** Surgió al cerrar la T120. Afecta args.ts (resolveOptions pasa a depender solo de lo guardado), main.ts (ayuda), README del board y de la raíz, docs/architecture.md, tests de args/e2e/settings. dist/cli.js está desactualizado y se regenera aparte.

### Plan

- [ ] Quitar los flags de args.ts, main.ts y la ayuda; simplificar resolveOptions
- [ ] Quitar sus tests y ajustar los e2e
- [ ] Actualizar README del board, README raíz y docs/architecture.md
- [ ] Verificación
- [ ] Revisión con ʀᴇᴠɪsᴏʀ
- [ ] Documentar cierre de tarea

### Qué falta

Todos los pasos del plan.

### Decisiones a medio camino

Decidido por el operador: se quitan los cuatro. --operator solo del board (los demás comandos siguen con el suyo); el operador sigue pudiendo ir como segundo argumento tras la ruta. El observador y las demás opciones solo se activan con teclas o con lo guardado en settings.json.

### Próximo paso concreto

Quitar los flags de args.ts, main.ts y la ayuda; simplificar resolveOptions

<!-- agent-context-skill:section=paused -->
## Tareas pausadas

Ninguna.
