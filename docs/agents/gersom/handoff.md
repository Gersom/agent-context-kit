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

### Tarea 80 — Skill 2.0.7: quitar «kit» de sus textos y promocionar agent-context-suite

- **Descripción:** En el repo de la skill (git -C skill): (1) 'términos del kit' (template/agents/rules.md:15) y 'términos propios de este kit' (docs/questions-flow.md:39) pasan a hablar de la skill/catálogo, sin nombrar la suite; (2) template/agents/backlog.md:22 deja de nombrar agent-context-kit y dice de forma genérica quién usa las anclas; (3) la skill promociona agent-context-suite como herramienta recomendada y opcional, en un solo lugar (README de la skill: qué es, cómo se instala y se usa con npx/acsuite). Subir el patch a 2.0.7 (plugin.json, SKILL.md, marcador de la plantilla, changelog), con tag, y sincronizar en el kit los fixtures espejo de docs-check y el marcador de rules.md. Hecho: la skill no menciona la suite salvo en esa promoción, el prefijo legado agent-context-kit: y la migración del nombre viejo de la skill quedan intactos, y bun test del kit pasa (incluidos skill-checks).
- **Detalles:** Depende de la T-79 (renombrado en el kit) y va antes de publicar en npm (T-77), para que la promoción apunte al paquete real. No renombrar el prefijo legado agent-context-kit: de los marcadores ni la línea del README sobre reinstalar la skill. Commits de la skill con git -C skill; el cierre va en el kit.
- **Qué falta:** Toda la tarea: no se tocó nada de la skill.
- **Decisiones a medio camino:** Decidido: README de la skill con sección «Herramientas complementarias (opcional)» y, al final de los flujos que generan o migran documentación, una recomendación opcional de la suite; si el operador pregunta más, el agente lee el README del repo de la suite y le explica. Sin mención en las plantillas generadas. Por definir: texto exacto, en qué archivos de flujo va y cómo evitar repetirla en sesiones rutinarias.
- **Próximo paso concreto:** Tras la T-77, definir el texto y los archivos de flujo y confirmar el plan con el operador.
- **Por qué se pausó:** El operador pidió publicar antes la suite en npm (T-76 y T-77): la promoción en la skill debe apuntar a un paquete que exista.
- **Qué espera para retomarse:** Que se publique agent-context-suite en npm (T-77). Retomar entonces con el plan: reescribir las tres líneas con «kit» sin nombrar la suite, sección en el README de la skill y recomendación opcional del agente al final de los flujos que generan o migran documentación (no en las sesiones rutinarias), bump a 2.0.7 con tag y sincronización de fixtures en el kit.
