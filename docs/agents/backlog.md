# Backlog

Cola de tareas pendientes: el "qué falta" a nivel proyecto. No es la tarea en curso (eso vive en [`./handoff.md`](./handoff.md)) ni lo ya cerrado (eso vive en [`./history.md`](./history.md)).

**Ciclo de vida de un item:**
1. Se agrega acá cuando se identifica pero todavía no se empieza.
2. Cuando se empieza a trabajar, se saca de esta lista y pasa a ser la tarea actual (o pausada) en `handoff.md` (referenciando el título del item).
3. Cuando se cierra (hecha o descartada), sale de `handoff.md` y se registra en `history.md`.

No dejar en este archivo tareas que ya se están trabajando o que ya se cerraron — sería duplicar lo que corresponde a `handoff.md`/`history.md`.

**Dos secciones:** las tareas viven en "Tareas libres" (listas para tomar) o "Tareas bloqueadas / pospuestas" (no se toman todavía). Cuando el motivo de una tarea bloqueada deja de aplicar, se mueve a "Tareas libres" — ver Regla 7 de `rules.md` (no se borra el campo `Bloqueos`, se marca como resuelto).

**Agrupamiento (solo en "Tareas libres"):** si esta sección supera las 15 tareas (Regla 7 de `rules.md`), se evalúa agrupar 2 o más que compartan un objetivo real. El criterio no es un tope de cantidad — es que el grupo entero quepa en una sola frase de objetivo compartido, sin usar "y" para forzar una tarea que en realidad no pertenece. Un grupo aparece en "Tareas libres" como una sola línea corta; el detalle completo de cada tarea que lo compone se mueve a la sección "Tareas agrupadas" (más abajo), que no hace falta leer salvo que el operador pida el detalle de una tarea puntual o se vaya a tomar una. Si un grupo queda con una sola tarea (las demás se tomaron o cerraron), se desarma: esa tarea vuelve a ser una entrada individual normal en "Tareas libres". Hoy "Tareas libres" tiene 7 tareas — muy por debajo del umbral, no hay grupos formados.

**Numeración:** cada tarea tiene un número correlativo fijo, asignado una sola vez al crearse. El número **nunca se reutiliza**, ni siquiera cuando la tarea se cierra (hecha o descartada) y pasa a `history.md`. No es un orden de cola: se puede tomar tareas fuera de orden.

> Numeración iniciada el 2026-09-24. Tareas ya cerradas antes de esa fecha (ver `history.md`) no tienen número asignado retroactivamente.

**Anclas de sección:** cada sección de tareas va precedida por un comentario `<!-- agent-context-kit:section=... -->` (`free`, `blocked`, `grouped`). Son comentarios de máquina — los usa el script de seguimiento de tareas (`scripts/task-tracker/`) para ubicar las secciones sin depender del idioma de los headers. No se traducen, no se borran ni se mueven al actualizar este archivo. Detalle completo en [`../../src/docs/template-architecture.md`](../../src/docs/template-architecture.md), sección "Anclas de sección".

**Próximo número de tarea:** 27

---

<!-- agent-context-kit:section=free -->
## Tareas libres

### Tarea 1 — Probar el flujo completo end-to-end sobre un repo real

- **Descripción:** validar en la práctica tanto el scaffolding nuevo como el flujo de migración (`src/docs/migration-flow.md`) corriendo el skill sobre uno o más repos reales del operador (ej. `gercash-backend`, `gercash-frontend`, `gercash-ai-service`, `gercash-whatsapp-bot`), ya que varios tienen sistemas de documentación propios que sirven como caso de uso real para el flujo de migración.
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

- **Descripción:** script en `scripts/` que se corre contra el `docs/agents/` de otro proyecto y reporta si cumple lo que el task-tracker necesita para funcionar bien: anclas de sección presentes, en la línea anterior a su `##` y sin duplicar; headers de tarea `### Tarea N — título` (`####` dentro de grupos); línea de la tarea en progreso antes de la primera subsección; campos `- **Etiqueta:** valor`; tags de bloqueo (con la convención "bloqueo vigente primero" de la Tarea 13); números de tarea sin repetir y "Próximo número de tarea" mayor al máximo usado; placeholders sin completar. La salida lista errores y avisos con archivo y línea, y termina con código distinto de 0 si hay errores.
- **Decisiones/temas a definir antes de empezar:**
  - Nombre de la carpeta y del comando (ej. `scripts/docs-check/` y `bun run check <ruta>`).
  - Qué incumplimientos son error (el task-tracker no puede leerlo) y cuáles aviso (lo lee, pero con plan B o datos incompletos).
  - Si reutiliza el parser del task-tracker o es independiente — si lo reutiliza, conviene hacerla después de la Tarea 14 (estructura de carpetas).
  - Si solo reporta o también corrige (`--fix`); la corrección de los repos ya adoptados hoy la cubre el prompt de normalización de la Tarea 11.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador la priorice. Sirve también para verificar el resultado del prompt de normalización de la Tarea 11.
- **Detalles:** las normas a verificar salen de `src/docs/template-architecture.md` (sección "Anclas de sección") y de las plantillas de `src/template/agents/`; ante una diferencia, gana la plantilla (Regla 4). Dependencias en `devDependencies` del `package.json` raíz (ver `rules.md`).
- **Agregada:** 2026-10-05.

### Tarea 20 — Actualizar la sección "Estructura del repositorio" del README raíz

- **Descripción:** la sección "Estructura del repositorio" de `README.md` está desactualizada: muestra `SKILL.md` y `template/` en la raíz, cuando hoy viven en `src/` (y no menciona `docs/`, `scripts/` ni `package.json`). Alinearla con la estructura real, linkeando a `docs/architecture.md` en vez de duplicar el árbol completo (Regla 1).
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador quiera, o antes del release `v1.1.0`.
- **Detalles:** detectado durante la Tarea 11 al sumar al README la sección del task-tracker; quedó fuera de su alcance.
- **Agregada:** 2026-10-05.

### Tarea 19 — Prompt de normalización para repos que ya adoptaron el skill

- **Descripción:** escribir el prompt que el operador corre en cada repo que adoptó el skill antes de las anclas (Tarea 9), para que el agente de ese repo agregue las anclas de sección y ajuste `backlog.md`/`handoff.md` (y el formato de `history.md`) a la estructura que lee el task-tracker. Se entrega al operador en el chat y queda guardado junto al script para reusarlo.
- **Decisiones/temas a definir antes de empezar:** dónde queda guardado (propuesta: README de `scripts/task-tracker/`).
- **Bloqueos:** `[Resuelto el 2026-10-05]` — era `[postergada]` hasta que el task-tracker llegue a su versión MVP (mínimo producto viable) — pedido del operador el 2026-10-05, porque el prompt tiene que reflejar la estructura final que lee el script. Qué cuenta como MVP lo decide el operador (el agente puede sugerirlo, el operador confirma). El operador confirmó el MVP el 2026-10-05, al cerrar la Tarea 21.
- **Disparador:** cuando el operador la tome (el MVP ya está confirmado).
- **Detalles:** antes estaba dentro de la Tarea 11; se sacó a esta tarea a pedido del operador. La Tarea 15 (validador) puede servir para verificar el resultado del prompt en cada repo.
- **Agregada:** 2026-10-05.

<!-- agent-context-kit:section=blocked -->
## Tareas bloqueadas / pospuestas

### Tarea 4 — Deploy en skills.sh

- **Descripción:** publicar `agent-context-kit` en https://www.skills.sh/ para que esté disponible en el catálogo público de skills.
- **Decisiones/temas a definir antes de empezar:** revisar los requisitos de publicación de skills.sh (formato esperado, metadata, proceso de submit) antes de armar el paquete final.
- **Bloqueos:** `[dependencia]` depende de que la Tarea 3 (Exportar como skill utilizable por Claude) esté resuelta — el paquete a publicar en skills.sh probablemente sea el mismo artefacto exportado ahí. (La Tarea 3 ya no está bloqueada, pero sigue sin hacerse — ver "Tareas libres".)
- **Disparador:** cuando el operador quiera hacer pública la skill, o priorice esta tarea explícitamente.
- **Detalles:** ninguno.
- **Agregada:** 2026-09-24.

### Tarea 24 — Script para gestionar las tareas (handoff, backlog, history)

- **Descripción:** script nuevo en `scripts/` (aparte del task-tracker, que sigue siendo solo de lectura y no cambia) con comandos que el agente ejecuta en vez de editar a mano `handoff.md`, `backlog.md` y `history.md`: agregar una tarea, empezarla, marcar el paso en que va, pausarla, bloquearla o desbloquearla, y cerrarla (hecha o descartada). Al cerrar aplica lo mecánico de las Reglas 5 a 8 de `rules.md`: actualiza los tres archivos, "Próximo número de tarea" y las anclas, lista las tareas bloqueadas a revisar y genera el reporte de cierre. También comandos de lectura compactos (ej. `next`, `show N`, `status`) para que el agente no tenga que leer `history.md` entero (~49 KB) ni todo el backlog.
- **Decisiones/temas a definir antes de empezar:**
  - **Ya decidido (2026-10-05):** edición quirúrgica del markdown — los `.md` siguen siendo la fuente de verdad, el script solo modifica lo que corresponde y el diff de git muestra únicamente ese cambio. No se usa base de datos ni formato estructurado aparte.
  - Nombre de la carpeta y del comando (ej. `scripts/task-manager/` y `bun run task ...`).
  - Formato estructurado de los bloqueos que permita desbloquear solo (ej. `blocked-by: Tarea 12`); los bloqueos en texto libre quedan para revisión manual.
  - Cómo entra el texto libre (descripciones, `Detalles`): por flags o por stdin.
  - Cómo se reflejan en `rules.md` y en las plantillas de `src/template/`: el script es opcional, y si no existe el agente sigue editando a mano como hoy (la distribución del kit sigue siendo markdown puro).
  - Si se hace por etapas: primero comandos de lectura, después los de escritura, empezando por los más mecánicos.
- **Bloqueos:** `[dependencia]` depende de la Tarea 23 (separar el parser para reutilizarlo): el script necesita el parser compartido, con posiciones para editar quirúrgicamente. La Tarea 22 (filosofía, `docs/philosophy.md`) ya está resuelta (2026-10-06): el script debe respetar sus principios.
- **Disparador:** cuando la Tarea 23 esté resuelta y el operador priorice esta tarea.
- **Detalles:** surgió de la conversación del 2026-10-05: busca bajar el consumo de tokens (menos lectura de archivos grandes, menos reescritura) y evitar errores mecánicos (anclas olvidadas, números repetidos). Si se hace la Tarea 15 (validador), sirve de red de seguridad para este script.
- **Agregada:** 2026-10-05.

<!-- agent-context-kit:section=grouped -->
## Tareas agrupadas

No aplica todavía — ningún grupo formado ("Tareas libres" tiene 7 tareas, bien por debajo del umbral de 15).
