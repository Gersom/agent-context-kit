# Backlog

Cola de tareas pendientes: el "qué falta" a nivel proyecto. No es la tarea en curso (eso vive en [`./handoff.md`](./handoff.md)) ni lo ya cerrado (eso vive en [`./history.md`](./history.md)).

**Ciclo de vida de un item:**
1. Se agrega acá cuando se identifica pero todavía no se empieza.
2. Cuando se empieza a trabajar, se saca de esta lista y pasa a ser la tarea actual (o pausada) en `handoff.md` (referenciando el título del item).
3. Cuando se cierra (hecha o descartada), sale de `handoff.md` y se registra en `history.md`.

No dejar en este archivo tareas que ya se están trabajando o que ya se cerraron — sería duplicar lo que corresponde a `handoff.md`/`history.md`.

**Dos secciones:** las tareas viven en "Tareas libres" (listas para tomar) o "Tareas bloqueadas / pospuestas" (no se toman todavía). Cuando el motivo de una tarea bloqueada deja de aplicar, se mueve a "Tareas libres" — ver Regla 7 de `rules.md` (no se borra el campo `Bloqueos`, se marca como resuelto).

**Agrupamiento (solo en "Tareas libres"):** si esta sección supera las 15 tareas (Regla 7 de `rules.md`), se evalúa agrupar 2 o más que compartan un objetivo real. El criterio no es un tope de cantidad — es que el grupo entero quepa en una sola frase de objetivo compartido, sin usar "y" para forzar una tarea que en realidad no pertenece. Un grupo aparece en "Tareas libres" como una sola línea corta; el detalle completo de cada tarea que lo compone se mueve a la sección "Tareas agrupadas" (más abajo), que no hace falta leer salvo que el operador pida el detalle de una tarea puntual o se vaya a tomar una. Si un grupo queda con una sola tarea (las demás se tomaron o cerraron), se desarma: esa tarea vuelve a ser una entrada individual normal en "Tareas libres". Hoy "Tareas libres" tiene 4 tareas — muy por debajo del umbral, no hay grupos formados.

**Numeración:** cada tarea tiene un número correlativo fijo, asignado una sola vez al crearse. El número **nunca se reutiliza**, ni siquiera cuando la tarea se cierra (hecha o descartada) y pasa a `history.md`. No es un orden de cola: se puede tomar tareas fuera de orden.

> Numeración iniciada el 2026-09-24. Tareas ya cerradas antes de esa fecha (ver `history.md`) no tienen número asignado retroactivamente.

**Anclas de sección:** cada sección de tareas va precedida por un comentario `<!-- agent-context-kit:section=... -->` (`free`, `blocked`, `grouped`). Son comentarios de máquina — los usa el script de seguimiento de tareas (`scripts/task-tracker/`) para ubicar las secciones sin depender del idioma de los headers. No se traducen, no se borran ni se mueven al actualizar este archivo. Detalle completo en [`../../src/docs/template-architecture.md`](../../src/docs/template-architecture.md), sección "Anclas de sección".

**Próximo número de tarea:** 19

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

### Tarea 11 — Refinar script de seguimiento de tareas

- **Descripción:** pulir el script de la Tarea 10 para que la salida sea más detallada y robusta, y cerrar el circuito para los repos que ya adoptaron el skill.
- **Decisiones/temas a definir antes de empezar:**
  - Qué nivel de detalle mostrar por tarea (ej. solo título vs. descripción, bloqueos, disparador, motivo de pausa, qué espera para retomarse).
  - Si se agregan atajos de teclado (ej. `q` para salir, alternar vista compacta/detallada).
- **Bloqueos:** `[Resuelto el 2026-10-05]` — era `[dependencia]` depende de que la Tarea 14 (Estructuración del script de seguimiento de tareas) esté resuelta — orden 13 → 14 → 11 definido por el operador el 2026-10-05. Antes: `[Resuelto el 2026-10-05]` — era `[dependencia]` depende de que la Tarea 10 (Crear script funcional de seguimiento de tareas) esté resuelta. La Tarea 10 se cerró el 2026-10-05 (ver `history.md`). La Tarea 14 se cerró el 2026-10-05 (ver `history.md`).
- **Disparador:** cuando el operador la tome (ya no está bloqueada).
- **Detalles:**
  - Salida más detallada: encabezado con nombre/path del proyecto vigilado, hora de la última actualización y qué archivo cambió; estados vacíos claros ("Sin tarea en curso", "Ninguna"); errores de parseo visibles en pantalla en vez de silenciosos; ajuste al ancho de la terminal.
  - Robustez: placeholders de plantilla sin completar, saltos de línea CRLF y paths de Windows.
  - Ya cubierto por la Tarea 10 (ver `history.md`), solo revisar si alcanza: encabezado con proyecto/ruta/hora/archivo que cambió, estados vacíos, avisos en pantalla, recorte al ancho de la terminal, CRLF, aviso de placeholders y comillas en rutas pegadas.
  - Las observaciones no bloqueantes de la revisión de la Tarea 12 se sacaron de acá: las resuelve la Tarea 13 (Corregir observaciones de la revisión del script), que se hace antes que esta.
  - Documentar cómo usar el script (README del repo y/o de `scripts/task-tracker/`).
  - Entregar al operador el **prompt de normalización** para los repos que ya adoptaron el skill: un prompt que le pida al agente de ese repo agregar las anclas de la Tarea 9 y ajustar `backlog.md`/`handoff.md` a la estructura que espera el script.
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

<!-- agent-context-kit:section=grouped -->
## Tareas agrupadas

No aplica todavía — ningún grupo formado ("Tareas libres" tiene 4 tareas, bien por debajo del umbral de 15).
