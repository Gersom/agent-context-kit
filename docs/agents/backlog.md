# Backlog

Cola de tareas pendientes: el "qué falta" a nivel proyecto. No es la tarea en curso (eso vive en [`./handoff.md`](./handoff.md)) ni lo ya cerrado ([`./history.md`](./history.md)).

**Ciclo de vida:** una tarea se agrega acá al identificarla; al empezar a trabajarla se saca de esta lista y pasa a `handoff.md`; al cerrarla (hecha o descartada) se registra en `history.md`. No dejar acá tareas en curso o cerradas.

**Dos secciones:** "Tareas libres" (listas para tomar) y "Tareas bloqueadas / pospuestas". Cuando el motivo de un bloqueo deja de aplicar, la tarea pasa a libres (Regla 7 de `rules.md`; `Bloqueos` no se borra, se marca como resuelto).

**Numeración:** cada tarea tiene un número correlativo fijo, asignado al crearla y **nunca reutilizado**, ni siquiera al cerrarla: sirve para referenciarla sin ambigüedad ("la tarea 3") y viaja a su entrada de `history.md`. No es un orden de cola. Para agregar una tarea: usar "Próximo número de tarea" (más abajo) y dejarlo en N+1; también se numeran las tareas nuevas que surjan de una tarea en curso.

**Formato de cada tarea** (`### Tarea N — título`), todo breve — `Detalles` solo si hace falta, y si el detalle ya vive en otro archivo (`decisions.md`, `known-issues.md`), enlazarlo:
- **Descripción:** de qué trata (1–3 líneas).
- **Decisiones/temas a definir antes de empezar:** qué resolver o preguntarle al operador antes de arrancar; "Ninguno" si está todo definido.
- **Bloqueos:** "Ninguno", o un valor que **empieza** con `[dependencia]` (no se puede empezar técnicamente) o `[postergada]` (conviene esperar) y el motivo. Con bloqueo va en "bloqueadas / pospuestas"; si no, en "libres". Si una tarea ya desbloqueada (`[Resuelto el <fecha>] — …`) se vuelve a bloquear, el bloqueo vigente va **primero** y el historial resuelto después, porque el script de seguimiento toma el tag con el que empieza el campo.
- **Desbloquea:** (opcional) qué tareas quedan libres al cerrar esta.
- **Disparador:** cuándo corresponde tomarla; por defecto "cuando el operador pregunte por tareas pendientes".
- **Detalles:** contexto extendido, solo si hace falta.
- **Agregada:** fecha.

**Agrupamiento (solo en "Tareas libres"):** si superan las 15 tareas (Regla 7), se evalúa agrupar 2 o más que compartan un objetivo real — el grupo entero tiene que caber en una frase de objetivo compartido, sin forzar con "y". El grupo aparece en libres como un bloque `### Grupo — título (Tareas N, M)` con un `Resumen` de una frase; el detalle de cada tarea (`#### Tarea N — título`, mismo formato) se mueve a "Tareas agrupadas", que no hace falta leer salvo para tomar una. Un grupo que queda con una sola tarea se desarma.

**Anclas de sección:** no borres ni muevas los comentarios `<!-- agent-context-kit:section=... -->` (`free`, `blocked`, `grouped`) que preceden a cada sección: los usa el script de seguimiento de tareas de agent-context-kit.

> Numeración iniciada el 2026-09-24. Las tareas cerradas antes de esa fecha (ver `history.md`) no tienen número asignado retroactivamente.

**Próximo número de tarea:** 31

---

<!-- agent-context-kit:section=free -->
## Tareas libres

### Tarea 1 — Probar el flujo completo end-to-end sobre un repo real

- **Descripción:** validar en la práctica tanto el scaffolding nuevo como el flujo de migración (`skill/docs/migration-flow.md`) corriendo el skill sobre uno o más repos reales del operador (ej. `gercash-backend`, `gercash-frontend`, `gercash-ai-service`, `gercash-whatsapp-bot`), ya que varios tienen sistemas de documentación propios que sirven como caso de uso real para el flujo de migración.
- **Decisiones/temas a definir antes de empezar:** elegir sobre qué repo(s) probar primero y si se prueba scaffolding nuevo, migración, o ambos.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador quiera validar el skill sobre un proyecto real, o priorice esta tarea explícitamente.
- **Detalles:** ninguno.
- **Agregada:** 2026-09-24.

### Tarea 3 — Exportar como skill utilizable por Claude

- **Descripción:** empaquetar `agent-context-kit` en el formato de skill que Claude (Claude Code / claude.ai) pueda invocar directamente — con su `SKILL.md` como punto de entrada y las plantillas accesibles — en vez de ser solo un repo de referencia que hay que copiar manualmente.
- **Decisiones/temas a definir antes de empezar:** confirmar el formato/estructura esperada por Claude para skills instalables (naming, metadata, empaquetado) y cómo se distribuye (repo instalable directo, paquete, etc.).
- **Bloqueos:** `[Resuelto el 2026-09-24]` — era `[postergada]` conviene tener el contenido de `SKILL.md` y las plantillas de `example/`/`template/` terminadas antes de empaquetar. Confirmado al cerrar la Tarea 5: `SKILL.md` no tiene placeholders y el catálogo de `template/` está completo desde el 2026-09-22 (ver `history.md`).
- **Desbloquea:** Tarea 4.
- **Disparador:** cuando el operador quiera distribuir el skill para uso directo en Claude, o priorice esta tarea explícitamente.
- **Detalles:** ver pendientes relacionados en [`../desing.md`](../desing.md).
- **Agregada:** 2026-09-24.

### Tarea 15 — Crear script para validar si un proyecto cumple las normas del task-tracker

- **Descripción:** script en `scripts/` que se corre contra el `docs/agents/` de otro proyecto y reporta si cumple lo que el task-tracker necesita: anclas de sección (presentes, en la línea anterior a su `##`, sin duplicar), headers `### Tarea N — título` (`####` en grupos), línea de la tarea en progreso antes de la primera subsección, campos `- **Etiqueta:** valor`, tags de bloqueo ("bloqueo vigente primero"), números de tarea sin repetir con "Próximo número de tarea" mayor al máximo, y placeholders sin completar. Lista errores y avisos con archivo y línea; sale con código distinto de 0 si hay errores.
- **Decisiones/temas a definir antes de empezar:**
  - Nombre de la carpeta y del comando (ej. `scripts/docs-check/` y `bun run check <ruta>`).
  - Qué es error (el task-tracker no puede leerlo) y qué es aviso (lo lee, pero con plan B o datos incompletos).
  - Si solo reporta o también corrige (`--fix`); la corrección de repos ya adoptados la cubre el prompt de la Tarea 19.
  - Reutiliza el parser compartido de `scripts/_shared/` (Tarea 23, ya resuelta).
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador la priorice; sirve también para verificar el resultado del prompt de la Tarea 19.
- **Detalles:** las normas salen de `skill/docs/template-architecture.md` ("Anclas de sección") y de las plantillas de `skill/template/agents/`; ante una diferencia, gana la plantilla (Regla 4).
- **Agregada:** 2026-10-05.

### Tarea 19 — Prompt de normalización para repos que ya adoptaron el skill

- **Descripción:** escribir el prompt que el operador corre en cada repo que adoptó el skill antes de las anclas (Tarea 9), para que el agente de ese repo agregue las anclas de sección y ajuste `backlog.md`/`handoff.md` (y el formato de `history.md`) a la estructura que lee el task-tracker. Se entrega al operador en el chat y queda guardado junto al script para reusarlo.
- **Decisiones/temas a definir antes de empezar:** dónde queda guardado (propuesta: README de `scripts/task-tracker/`).
- **Bloqueos:** `[Resuelto el 2026-10-05]` — era `[postergada]` hasta que el task-tracker llegue a su versión MVP (mínimo producto viable) — pedido del operador el 2026-10-05, porque el prompt tiene que reflejar la estructura final que lee el script. Qué cuenta como MVP lo decide el operador (el agente puede sugerirlo, el operador confirma). El operador confirmó el MVP el 2026-10-05, al cerrar la Tarea 21.
- **Disparador:** cuando el operador la tome (el MVP ya está confirmado).
- **Detalles:** antes estaba dentro de la Tarea 11; se sacó a esta tarea a pedido del operador. La Tarea 15 (validador) puede servir para verificar el resultado del prompt en cada repo.
- **Agregada:** 2026-10-05.

### Tarea 24 — Script para gestionar las tareas (handoff, backlog, history)

- **Descripción:** script nuevo en `scripts/` (el task-tracker sigue siendo solo de lectura) con comandos que el agente ejecuta en vez de editar a mano `handoff.md`, `backlog.md` y `history.md`: agregar una tarea, empezarla, marcar el paso en que va, pausarla, bloquearla o desbloquearla y cerrarla (hecha o descartada). Al cerrar aplica lo mecánico de las Reglas 5 a 8: actualiza los tres archivos, "Próximo número de tarea" y las anclas, lista las bloqueadas a revisar y genera el reporte de cierre. Con comandos de lectura compactos (`next`, `show N`, `status`) para no leer `history.md` (~55 KB) ni todo el backlog.
- **Decisiones/temas a definir antes de empezar:**
  - **Ya decidido (2026-10-05):** edición quirúrgica del markdown; los `.md` siguen siendo la fuente de verdad y el diff de git muestra solo el cambio. Sin base de datos ni formato aparte.
  - Nombre de la carpeta y del comando (ej. `scripts/task-manager/` y `bun run task ...`).
  - Formato estructurado de los bloqueos para desbloquear solo (ej. `blocked-by: Tarea 12`); los de texto libre quedan para revisión manual.
  - Cómo entra el texto libre (descripciones, `Detalles`): flags o stdin.
  - Posiciones (línea/offset) de bloques y campos en el parser compartido de `scripts/_shared/`; se agregan en esta tarea.
  - Reflejo en `rules.md` y en las plantillas: el script es opcional; sin él, el agente edita a mano como hoy (el kit sigue siendo markdown puro).
  - Hacerlo por etapas: primero comandos de lectura, después los de escritura, empezando por los más mecánicos.
- **Bloqueos:** `[Resuelto el 2026-10-06]` — era `[dependencia]` de la Tarea 23 (parser compartido, ya en `scripts/_shared/`); las posiciones línea/offset no se hicieron allí y se agregan acá. Debe respetar `docs/philosophy.md`.
- **Disparador:** cuando el operador la priorice.
- **Detalles:** surgió el 2026-10-05: busca bajar el consumo de tokens (menos lectura y reescritura) y evitar errores mecánicos (anclas olvidadas, números repetidos). La Tarea 15 (validador) sirve de red de seguridad.
- **Agregada:** 2026-10-05.

### Tarea 30 — Vista de equipo en el task-tracker (todos los operadores)

- **Descripción:** en el modo multi-operador (Tarea 26), mostrar en el task-tracker las tareas en progreso, libres y completadas de todos los operadores y del `team-backlog.md`, además de las del operador actual (que la Tarea 26 ya resuelve).
- **Decisiones/temas a definir antes de empezar:** cómo se muestra (recuadros por operador, filtro, tecla para cambiar de vista); cómo lee el `team-backlog.md`, que no lleva números; es solo lectura, nunca edita carpetas ajenas.
- **Bloqueos:** `[Resuelto el 2026-10-06]` — era `[dependencia]` de la Tarea 26 (define la estructura multi-operador y cómo se resuelve el operador actual); cerrada ese día.
- **Disparador:** cuando el operador la priorice.
- **Detalles:** nace de la conversación del 2026-10-06, al definir el alcance de la Tarea 26. Ya existen el parser de `operators.md` (`scripts/_shared/parse/operators.ts`) y la resolución del operador actual (`scripts/task-tracker/src/io/operator.ts`).
- **Agregada:** 2026-10-06.

<!-- agent-context-kit:section=blocked -->
## Tareas bloqueadas / pospuestas

### Tarea 4 — Deploy en skills.sh

- **Descripción:** publicar `agent-context-kit` en https://www.skills.sh/ para que esté disponible en el catálogo público de skills.
- **Decisiones/temas a definir antes de empezar:** revisar los requisitos de publicación de skills.sh (formato esperado, metadata, proceso de submit) antes de armar el paquete final.
- **Bloqueos:** `[dependencia]` depende de que la Tarea 3 (Exportar como skill utilizable por Claude) esté resuelta — el paquete a publicar en skills.sh probablemente sea el mismo artefacto exportado ahí. (La Tarea 3 ya no está bloqueada, pero sigue sin hacerse — ver "Tareas libres".)
- **Disparador:** cuando el operador quiera hacer pública la skill, o priorice esta tarea explícitamente.
- **Detalles:** ninguno.
- **Agregada:** 2026-09-24.

<!-- agent-context-kit:section=grouped -->
## Tareas agrupadas

No aplica todavía — ningún grupo formado.
