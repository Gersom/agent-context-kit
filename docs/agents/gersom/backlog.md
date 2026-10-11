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

**Próximo número de tarea:** 58

---

<!-- agent-context-kit:section=free -->
## Tareas libres

### Tarea 34 — Reevaluar los comandos del task-manager

- **Descripción:** Revisar los comandos del script scripts/task-manager/ para hacerlos más eficientes o cambiar su forma (flags, salida, cantidad de pasos por operación, comandos que se puedan fusionar o simplificar), según cómo los usa realmente el agente.
- **Decisiones/temas a definir antes de empezar:** Qué fricciones se vieron al usarlos (flags largos, texto libre, `--apply`, pausar/empezar en varios pasos); si conviene fusionar o renombrar comandos; qué se mantiene por compatibilidad.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Surgida al usar el script en las Tareas 24 y 32. Límites conocidos: block/unblock no soportan tareas agrupadas ni team-backlog.md; add y start sin --json. Surgido al hacer la Tarea 36: `step` ya edita de forma puntual (marcar, desmarcar y reemplazar una subsección), pero no permite cambiar el texto o la nota de un paso, agregar o quitar pasos, ni reabrir uno con motivo (lo pide la Tarea 35), y admite solo una de `--falta`/`--decisiones`/`--proximo` por ejecución.
- **Agregada:** 2026-10-08.

### Tarea 4 — Deploy en skills.sh

- **Descripción:** publicar `agent-context-kit` en https://www.skills.sh/ para que esté disponible en el catálogo público de skills.
- **Decisiones/temas a definir antes de empezar:** revisar los requisitos de publicación de skills.sh (formato esperado, metadata, proceso de submit) antes de armar el paquete final.
- **Bloqueos:** `[Resuelto el 2026-10-10]` — era `[dependencia]` depende de que la Tarea 3 (Exportar como skill utilizable por Claude) esté resuelta — el paquete a publicar en skills.sh probablemente sea el mismo artefacto exportado ahí. (La Tarea 3 ya no está bloqueada, pero sigue sin hacerse — ver "Tareas libres".)
- **Disparador:** cuando el operador quiera hacer pública la skill, o priorice esta tarea explícitamente.
- **Detalles:** ninguno.
- **Agregada:** 2026-09-24.

### Tarea 51 — Reevaluación de determinismo

- **Descripción:** Ver qué tan fiel y estricto termina el repo en el que se usa la skill en comparación con el template: qué se respeta, qué se desvía y qué parte del resultado depende del criterio del agente.
- **Decisiones/temas a definir antes de empezar:** Cómo medirlo (repos de prueba generados con la skill, comparación contra el template) y qué nivel de desvío se acepta.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Agregada:** 2026-10-11.

### Tarea 52 — Verificación de optimización

- **Descripción:** Ver si algo en los archivos .md (reglas, plantillas, docs) se puede acortar o quitar para optimizar tokens, sin perder información que el agente necesita.
- **Decisiones/temas a definir antes de empezar:** Criterio de qué se puede quitar (redundancias, ejemplos, texto repetido entre archivos) y cuánta reducción justifica el cambio.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Agregada:** 2026-10-11.

### Tarea 53 — Actualizar los pendientes desactualizados de docs/desing.md

- **Descripción:** Surgió al cerrar la Tarea 50; falta detallarla.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Agregada:** 2026-10-11.

### Tarea 54 — Confirmar si falta publicar el release del kit (package.json 1.7.0, último tag v1.5.0)

- **Descripción:** Surgió al cerrar la Tarea 50; falta detallarla.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Agregada:** 2026-10-11.

### Tarea 55 — Unificar el orden de las reglas en la plantilla rules.md (Regla 9 entre la 4 y la 5)

- **Descripción:** Surgió al cerrar la Tarea 50; falta detallarla.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Agregada:** 2026-10-11.

### Tarea 56 — Unificar voseo y tuteo en los flujos y plantillas de la skill

- **Descripción:** Surgió al cerrar la Tarea 50; falta detallarla.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Agregada:** 2026-10-11.

### Tarea 57 — Aclarar o unificar los dos prefijos de marcador (agent-docs-skill y agent-context-kit)

- **Descripción:** Surgió al cerrar la Tarea 50; falta detallarla.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Agregada:** 2026-10-11.

<!-- agent-context-kit:section=blocked -->
## Tareas bloqueadas / pospuestas

### Tarea 38 — Revisar si el task-tracker necesita actualizarse por los últimos cambios

- **Descripción:** Comprobar si el task-tracker (scripts/task-tracker/) sigue mostrando bien el handoff, el backlog y el history tras los cambios de las Tareas 35 y 36, y actualizarlo si hace falta.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** `[postergada]` Revisada el 2026-10-09: el task-tracker no necesita cambios tras las Tareas 35 y 36. Volver a revisarla cuando haya cambios grandes en la skill.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Cambios a revisar: (1) los pasos del plan pueden llevar al final de la línea evidencia y commit (· bun test 779 pass · commit abc1234, Tarea 35): ver si el tracker los corta, los desalinea o los muestra bien; (2) un paso reabierto se escribe como (reabierto: motivo); (3) el handoff ahora se edita solo en lo que cambia y las pausadas ya no se leen salvo sin tarea en curso: ver si el tracker asume que el archivo se reescribe entero (reintento de primera lectura en src/io/snapshot.ts); (4) la entrada de history.md ahora es más breve y lista los commits; (5) el reporte de cierre suma Checks pendientes y Próximo paso (no afecta al tracker, solo confirmarlo). Probar contra el handoff real con una tarea en curso, con evidencia en los pasos y con una pausada. Si no hay nada que cambiar, cerrarla con esa conclusión.
- **Agregada:** 2026-10-08.

<!-- agent-context-kit:section=grouped -->
## Tareas agrupadas

No aplica todavía — ningún grupo formado.
