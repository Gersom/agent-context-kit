# Handoff

Estado "en caliente": en qué se está ahora. **Se sobrescribe completo** en cada actualización (en cada paso del plan y al cerrar la tarea): es una foto del presente, no un historial, con el próximo paso concreto para que un chat nuevo retome sin depender de la sesión anterior.

- Pendientes → [`./backlog.md`](./backlog.md) · Cerradas (hechas o descartadas) → [`./history.md`](./history.md)
- Sin tarea en curso: "Tarea en progreso" dice "Sin tarea en curso" (no deja el contenido de la última cerrada); "Tareas pausadas" queda en "Ninguna" si no hay.
- **No borres ni muevas los comentarios `<!-- agent-context-kit:section=... -->`** (`in-progress`, `paused`): los lee el script de seguimiento de tareas; como el archivo se reescribe completo, hay que reescribirlos siempre. La tarea en curso va en una línea `Tarea N — título` antes de la primera subsección `###`.
- **Tarea pausada:** un bloque `### Tarea N — título` con `Plan` (opcional: los checkboxes de "Tarea en progreso" tal cual), `Qué falta`, `Decisiones a medio camino`, `Próximo paso concreto`, `Por qué se pausó` y `Qué espera para retomarse`.
- Las reglas para cerrar una tarea están al final de [`rules.md`](../rules.md).

---

<!-- agent-context-kit:section=in-progress -->
## Tarea en progreso

Tarea 33 — Reevaluar las reglas de rules.md

Revisar todas las reglas (por defecto, las que el script de tareas hace opcionales o ignorables, las específicas de este proyecto y las de modo multi) para detectar repeticiones, mover al bloque por defecto las específicas que lo merezcan, evaluar cuáles por defecto pasan a «se ignoran si usas el script», y ver si falta alguna.

- **Detalles:** Relacionada con la sección «Si usas el script de tareas» de docs/agents/rules.md (T-24). Tocar las Reglas por defecto o su plantilla (skill/template/agents/rules.md) requiere autorización explícita y puede implicar bump de versión.

### Plan

- [x] Paso 1 — Inventario de las reglas y decisiones del operador
- [x] Paso 2 — `docs/agents/rules.md`: Regla 9 (commits coherentes) por defecto; «no cerrar sin que lo pida el operador» dentro de la Regla 5; cláusula «con herramienta de tareas» en «Al cerrar una tarea»; quitar las repeticiones
- [x] Paso 3 — `skill/template/agents/rules.md` y `skill/template/multi/rules.md`: mismo cambio en las plantillas, sin nombrar el script (no se distribuye)
- [x] Paso 4 — Verificación (`bun test`, `bun run typecheck`, grep de referencias) y bump de versión
- [ ] Documentar cierre de tarea

**Modo de ejecución acordado:** todos seguidos. Rama `feat/rules-review`.

### Qué falta

Solo el cierre, cuando el operador lo pida. Pasos 1 a 4 hechos y commiteados: Regla 9 (commits coherentes) por defecto, sin regla de AskUserQuestion, 'solo se cierra si el operador lo pide' dentro de la Regla 5, cláusula 'con una herramienta de tareas' en 'Al cerrar una tarea', repeticiones eliminadas, plantilla y multi/rules.md alineadas, package.json a 1.5.0. bun test 779 pasan, typecheck limpio. Tag y release: los pide el operador.

### Decisiones a medio camino

- Con una herramienta de tareas (en este repo, `task-manager`), las Reglas 5, 6, 7 y 8 se ignoran en lo que ella ya hace (`step`, `close`); sigue valiendo el pedido explícito del operador para cerrar (decidido 2026-10-08). La cláusula por defecto no nombra el script porque no se distribuye.
- Pasan a por defecto: «ninguna tarea se cierra sin que el operador lo pida» (dentro de la Regla 5) y «commits coherentes» (Regla 10). Regla nueva 9: toda pregunta al operador por `AskUserQuestion`. No se agregan las de push/merge/release ni la de ramas por tarea.
- Se eliminan las repeticiones: nombres de archivo en inglés (Regla 3), número correlativo (`backlog.md`), plantillas por idioma, «fijas» duplicado y «no se copia literal».

### Próximo paso concreto

Mandar el resumen al operador y esperar; solo con su pedido, documentar el cierre (Reglas 5 y 7) y el reporte (Regla 8).

<!-- agent-context-kit:section=paused -->
## Tareas pausadas

Ninguna.
