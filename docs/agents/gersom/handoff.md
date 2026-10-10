# Handoff

Estado "en caliente": en qué se está ahora. **Se actualiza editando solo lo que cambió**, sin reescribir el archivo entero, en cada paso del plan y al cerrar la tarea (ej. al avanzar el paso 3, solo el checkbox y la nota de ese paso, "Qué falta" y "Próximo paso concreto"): es una foto del presente, no un historial, con el próximo paso concreto para que un chat nuevo retome sin depender de la sesión anterior.

- Pendientes → [`./backlog.md`](./backlog.md) · Cerradas (hechas o descartadas) → [`./history.md`](./history.md)
- Sin tarea en curso: "Tarea en progreso" dice "Sin tarea en curso" (no deja el contenido de la última cerrada); "Tareas pausadas" queda en "Ninguna" si no hay.
- **No borres ni muevas los comentarios `<!-- agent-context-kit:section=... -->`** (`in-progress`, `paused`): los lee el script de seguimiento de tareas; al editar solo lo que cambió no se tocan, y si alguna vez se reescribe el archivo entero hay que reescribirlos. La tarea en curso va en una línea `Tarea N — título` antes de la primera subsección `###`.
- **Tarea pausada:** un bloque `### Tarea N — título` con `Plan` (opcional: los checkboxes de "Tarea en progreso" tal cual), `Qué falta`, `Decisiones a medio camino`, `Próximo paso concreto`, `Por qué se pausó` y `Qué espera para retomarse`.
- **Línea de un paso:** `- [x] Paso N — texto · evidencia · commit abc1234`. El texto tras el checkbox es libre (evidencia y commit van al final, según la Regla 6); los checkboxes son solo los pasos del plan, porque el script de seguimiento cuenta como paso todo `- [ ]` de «Tarea en progreso».
- Las reglas para cerrar una tarea están al final de [`rules.md`](../rules.md).

---

<!-- agent-context-kit:section=in-progress -->
## Tarea en progreso

Sin tarea en curso

<!-- agent-context-kit:section=paused -->
## Tareas pausadas

### Tarea 3 — Exportar como skill utilizable por Claude

- **Descripción:** empaquetar `agent-context-kit` en el formato de skill que Claude (Claude Code / claude.ai) pueda invocar directamente — con su `SKILL.md` como punto de entrada y las plantillas accesibles — en vez de ser solo un repo de referencia que hay que copiar manualmente.
- **Desbloquea:** Tarea 4.
- **Detalles:** ver pendientes relacionados en [`../../desing.md`](../../desing.md).
- **Plan:**
  - [x] Crear en el backlog las tareas previas: desacoplar el kit de skill/, crear el repo agent-context-skill y actualizar proceso y documentación
  - [x] Pausar la Tarea 3 hasta que esas tareas estén cerradas
  - [ ] Empaquetar la skill como plugin de Claude Code (.claude-plugin/plugin.json, marketplace.json, versión y tags)
  - [ ] Probar la instalación en un directorio temporal
  - [ ] Documentar cierre de tarea
- **Modo de ejecución acordado:** todos seguidos
- **Qué falta:** Pasos pendientes:
  - Empaquetar la skill como plugin de Claude Code (.claude-plugin/plugin.json, marketplace.json, versión y tags)
  - Probar la instalación en un directorio temporal
  - Documentar cierre de tarea
- **Decisiones a medio camino:** confirmar el formato/estructura esperada por Claude para skills instalables (naming, metadata, empaquetado) y cómo se distribuye (repo instalable directo, paquete, etc.).
- **Próximo paso concreto:** Empaquetar la skill como plugin de Claude Code (.claude-plugin/plugin.json, marketplace.json, versión y tags)
- **Por qué se pausó:** Depende de las Tareas 43, 44 y 45 (separar la skill en su propio repo antes de empaquetarla como plugin).
- **Qué espera para retomarse:** Que las Tareas 43, 44 y 45 estén cerradas.
