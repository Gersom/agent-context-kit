# Backlog

Cola de tareas pendientes: el "qué falta" a nivel proyecto. No es la tarea en curso (eso vive en [`./handoff.md`](./handoff.md)) ni lo ya cerrado (eso vive en [`./history.md`](./history.md)).

**Ciclo de vida de un item:**
1. Se agrega acá cuando se identifica pero todavía no se empieza.
2. Cuando se empieza a trabajar, se saca de esta lista y pasa a ser la tarea actual (o pausada) en `handoff.md` (referenciando el título del item).
3. Cuando se cierra (hecha o descartada), sale de `handoff.md` y se registra en `history.md`.

No dejar en este archivo tareas que ya se están trabajando o que ya se cerraron — sería duplicar lo que corresponde a `handoff.md`/`history.md`.

**Dos secciones:** las tareas viven en "Tareas libres" (listas para tomar) o "Tareas bloqueadas / pospuestas" (no se toman todavía). Cuando el motivo de una tarea bloqueada deja de aplicar, se mueve a "Tareas libres" — ver Regla 7 de `rules.md` (no se borra el campo `Bloqueos`, se marca como resuelto).

**Agrupamiento (solo en "Tareas libres"):** si esta sección supera las 15 tareas (Regla 7 de `rules.md`), se evalúa agrupar 2 o más que compartan un objetivo real. El criterio no es un tope de cantidad — es que el grupo entero quepa en una sola frase de objetivo compartido, sin usar "y" para forzar una tarea que en realidad no pertenece. Un grupo aparece en "Tareas libres" como una sola línea corta; el detalle completo de cada tarea que lo compone se mueve a la sección "Tareas agrupadas" (más abajo), que no hace falta leer salvo que el operador pida el detalle de una tarea puntual o se vaya a tomar una. Si un grupo queda con una sola tarea (las demás se tomaron o cerraron), se desarma: esa tarea vuelve a ser una entrada individual normal en "Tareas libres". Hoy "Tareas libres" tiene 3 tareas — muy por debajo del umbral, no hay grupos formados.

**Numeración:** cada tarea tiene un número correlativo fijo, asignado una sola vez al crearse. El número **nunca se reutiliza**, ni siquiera cuando la tarea se cierra (hecha o descartada) y pasa a `history.md`. No es un orden de cola: se puede tomar tareas fuera de orden.

> Numeración iniciada el 2026-09-24. Tareas ya cerradas antes de esa fecha (ver `history.md`) no tienen número asignado retroactivamente.

**Próximo número de tarea:** 12

---

## Tareas libres

## Tarea 1 — Probar el flujo completo end-to-end sobre un repo real

- **Descripción:** validar en la práctica tanto el scaffolding nuevo como el flujo de migración (`src/docs/migration-flow.md`) corriendo el skill sobre uno o más repos reales del operador (ej. `gercash-backend`, `gercash-frontend`, `gercash-ai-service`, `gercash-whatsapp-bot`), ya que varios tienen sistemas de documentación propios que sirven como caso de uso real para el flujo de migración.
- **Decisiones/temas a definir antes de empezar:** elegir sobre qué repo(s) probar primero y si se prueba scaffolding nuevo, migración, o ambos.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador quiera validar el skill sobre un proyecto real, o priorice esta tarea explícitamente.
- **Detalles:** ninguno.
- **Agregada:** 2026-09-24.

## Tarea 3 — Exportar como skill utilizable por Claude

- **Descripción:** empaquetar `agent-context-kit` en el formato de skill que Claude (Claude Code / claude.ai) pueda invocar directamente — con su `SKILL.md` como punto de entrada y las plantillas accesibles — en vez de ser solo un repo de referencia que hay que copiar manualmente.
- **Decisiones/temas a definir antes de empezar:** confirmar el formato/estructura esperada por Claude para skills instalables (naming, metadata, empaquetado) y cómo se distribuye (repo instalable directo, paquete, etc.).
- **Bloqueos:** `[Resuelto el 2026-09-24]` — era `[postergada]` conviene tener el contenido de `SKILL.md` y las plantillas de `example/`/`template/` terminadas antes de empaquetar. Confirmado al cerrar la Tarea 5: `SKILL.md` no tiene placeholders y el catálogo de `template/` está completo desde el 2026-09-22 (ver `history.md`).
- **Desbloquea:** Tarea 4.
- **Disparador:** cuando el operador quiera distribuir el skill para uso directo en Claude, o priorice esta tarea explícitamente.
- **Detalles:** ver pendientes relacionados en [`../desing.md`](../desing.md).
- **Agregada:** 2026-09-24.

## Tarea 9 — Preparación para el script de seguimiento de tareas

- **Descripción:** dejar `backlog.md` y `handoff.md` con una estructura que un script pueda leer de forma confiable sin depender del idioma de la documentación (Regla 3 de `rules.md`: los headers de sección se redactan en el idioma del proyecto, así que buscar "Tareas libres" o "Tarea en progreso" literal no funciona en un repo en inglés). La solución acordada son anclas invisibles en comentarios HTML (mismo mecanismo que la firma `agent-context-kit:signature` ya existente), una antes de cada sección relevante: en `backlog.md` → tareas libres, bloqueadas/pospuestas y agrupadas; en `handoff.md` → tarea en progreso y tareas pausadas.
- **Decisiones/temas a definir antes de empezar:**
  - Nombre/prefijo de las anclas (propuesta: `<!-- ack:section=free -->`, `blocked`, `grouped`, `in-progress`, `paused`).
  - Si también hace falta un ancla para la línea `**Tarea:**` de "Tarea en progreso" (su etiqueta también se traduce según el idioma), o si alcanza con el regex de tarea por número.
- **Bloqueos:** Ninguno.
- **Desbloquea:** Tarea 10.
- **Disparador:** cuando el operador quiera arrancar con el script de seguimiento de tareas, o priorice esta tarea explícitamente.
- **Detalles:**
  - Agregar las anclas en `src/template/agents/backlog.md` y `src/template/agents/handoff.md`, con una instrucción explícita de que las anclas **no se borran** al actualizar el archivo — sobre todo en `handoff.md`, que se sobrescribe completo en cada actualización (Regla 6) y es el que más riesgo tiene de perderlas.
  - `src/docs/migration-flow.md`: el flujo de migración tiene que asegurarse de insertar las anclas al migrar un sistema de documentación existente.
  - Revisar `src/docs/questions-flow.md` (scaffolding nuevo) y documentar las anclas en `src/docs/template-architecture.md`.
  - Dogfooding: este mismo `docs/agents/backlog.md` usa `## Tarea N` (nivel 2) en vez de `### Tarea N` como dice la plantilla — normalizarlo y agregarle las anclas, igual que a `docs/agents/handoff.md`.
  - Según el criterio de versionado de `rules.md`, agregar las anclas es contenido nuevo que no rompe nada → bump **minor** (definir si el bump se hace acá o al cerrar la Tarea 11).
  - Para los repos que ya adoptaron el skill, el operador va a correr un prompt de normalización por su cuenta — ese prompt se entrega al cerrar la Tarea 11, no en esta.
- **Agregada:** 2026-10-05.

## Tareas bloqueadas / pospuestas

## Tarea 4 — Deploy en skills.sh

- **Descripción:** publicar `agent-context-kit` en https://www.skills.sh/ para que esté disponible en el catálogo público de skills.
- **Decisiones/temas a definir antes de empezar:** revisar los requisitos de publicación de skills.sh (formato esperado, metadata, proceso de submit) antes de armar el paquete final.
- **Bloqueos:** `[dependencia]` depende de que la Tarea 3 (Exportar como skill utilizable por Claude) esté resuelta — el paquete a publicar en skills.sh probablemente sea el mismo artefacto exportado ahí. (La Tarea 3 ya no está bloqueada, pero sigue sin hacerse — ver "Tareas libres".)
- **Disparador:** cuando el operador quiera hacer pública la skill, o priorice esta tarea explícitamente.
- **Detalles:** ninguno.
- **Agregada:** 2026-09-24.

## Tarea 10 — Crear script funcional de seguimiento de tareas

- **Descripción:** programa en Bun que vigila la carpeta `docs/agents/` de un proyecto y muestra en la terminal la tarea en progreso, las tareas pausadas y las pendientes (libres, bloqueadas y agrupadas), redibujando cada vez que cambian `handoff.md` o `backlog.md`. La idea es tenerlo abierto en una terminal mientras en otra un agente de IA trabaja sobre el proyecto.
- **Decisiones/temas a definir antes de empezar:**
  - Confirmar el nombre de la carpeta: el operador escribió `scripts/taks/`; se asume que quiso decir `scripts/tasks/`.
  - Cómo se lanza desde la raíz del repo (ej. script `"tasks"` en el `package.json` raíz que llama al de `scripts/tasks/`, o `cd scripts/tasks && bun start`).
  - Si además de preguntar el path al arrancar, también se acepta como argumento opcional (`bun start <path>`) para saltear la pregunta.
- **Bloqueos:** `[dependencia]` necesita las anclas de la Tarea 9 (Preparación para el script de seguimiento de tareas) para parsear las secciones sin depender del idioma.
- **Desbloquea:** Tarea 11.
- **Disparador:** cuando se cierre la Tarea 9.
- **Detalles:**
  - Se ejecuta desde el repo `agent-context-kit` (no se copia a cada proyecto). Al arrancar **pregunta el path de la carpeta a vigilar** y valida que existan `handoff.md`/`backlog.md` en ella. Así se pueden correr varias instancias en paralelo, una por proyecto — sin estado compartido, lockfiles ni puertos fijos entre instancias.
  - Proyecto Bun propio en `scripts/tasks/` (con su `package.json`, `tsconfig.json` y dependencias), con la salida en terminal hecha con el paquete `picocolors`.
  - Separado en varios archivos por responsabilidad, como mínimo: lectura y vigilancia de archivos (watch de la carpeta, no de cada archivo, con debounce para que un solo guardado no dispare varios redibujos), parseo/interpretación del markdown (quitar comentarios HTML antes de parsear para no tomar los ejemplos de las plantillas, ubicar secciones por ancla, detectar `Tarea N — título` aceptando `—`, `–` o `-`), procesamiento de los datos (modelo final: progreso del plan con los checkboxes `- [ ]`/`- [x]`, conteos, grupos, motivos de bloqueo) y pintado en la terminal; más el punto de entrada.
  - Plan B si un archivo no tiene anclas (repos que adoptaron el skill antes de la Tarea 9): ubicar las secciones `##` por orden de aparición, y avisar en pantalla que se está usando ese modo.
  - Tolerar archivos a medio escribir o momentáneamente inexistentes (el agente puede estar reescribiéndolos) sin cerrar el programa.
  - Al agregar código ejecutable al repo, actualizar la regla específica de `rules.md` que dice que es "documentación markdown pura, sin código ejecutable", y `docs/architecture.md` con la nueva carpeta `scripts/`.
- **Agregada:** 2026-10-05.

## Tarea 11 — Refinar script de seguimiento de tareas

- **Descripción:** pulir el script de la Tarea 10 para que la salida sea más detallada y robusta, y cerrar el circuito para los repos que ya adoptaron el skill.
- **Decisiones/temas a definir antes de empezar:**
  - Qué nivel de detalle mostrar por tarea (ej. solo título vs. descripción, bloqueos, disparador, motivo de pausa, qué espera para retomarse).
  - Si se agregan atajos de teclado (ej. `q` para salir, alternar vista compacta/detallada).
- **Bloqueos:** `[dependencia]` depende de que la Tarea 10 (Crear script funcional de seguimiento de tareas) esté resuelta.
- **Disparador:** cuando se cierre la Tarea 10.
- **Detalles:**
  - Salida más detallada: encabezado con nombre/path del proyecto vigilado, hora de la última actualización y qué archivo cambió; estados vacíos claros ("Sin tarea en curso", "Ninguna"); errores de parseo visibles en pantalla en vez de silenciosos; ajuste al ancho de la terminal.
  - Robustez: placeholders de plantilla sin completar, saltos de línea CRLF y paths de Windows.
  - Documentar cómo usar el script (README del repo y/o de `scripts/tasks/`).
  - Entregar al operador el **prompt de normalización** para los repos que ya adoptaron el skill: un prompt que le pida al agente de ese repo agregar las anclas de la Tarea 9 y ajustar `backlog.md`/`handoff.md` a la estructura que espera el script.
- **Agregada:** 2026-10-05.

## Tareas agrupadas

No aplica todavía — ningún grupo formado ("Tareas libres" tiene 3 tareas, bien por debajo del umbral de 15).
