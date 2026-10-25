# Backlog

Cola de tareas pendientes: el "qué falta" a nivel proyecto. No es la tarea en curso (eso vive en [`./handoff.md`](./handoff.md)) ni lo ya cerrado ([`./history.md`](./history.md)).

**Ciclo de vida:** una tarea se agrega acá al identificarla; al empezar a trabajarla se saca de esta lista y pasa a `handoff.md`; al cerrarla (hecha o descartada) se registra en `history.md`. No dejar acá tareas en curso o cerradas.

**Dos secciones:** "Tareas libres" (listas para tomar) y "Tareas bloqueadas / pospuestas". Cuando el motivo de un bloqueo deja de aplicar, la tarea pasa a libres (Regla 8 de `rules.md`; `Bloqueos` no se borra, se marca como resuelto).

**Numeración:** cada tarea tiene un número correlativo fijo, asignado al crearla y **nunca reutilizado**, ni siquiera al cerrarla: sirve para referenciarla sin ambigüedad ("la tarea 3") y viaja a su entrada de `history.md`. No es un orden de cola. Para agregar una tarea: usar "Próximo número de tarea" (más abajo) y dejarlo en N+1; también se numeran las tareas nuevas que surjan de una tarea en curso.

**Formato de cada tarea** (`### Tarea N — título`), todo breve — `Detalles` solo si hace falta, y si el detalle ya vive en otro archivo (`decisions/`, `known-issues.md`), enlazarlo:
- **Descripción:** de qué trata (1–3 líneas).
- **Decisiones/temas a definir antes de empezar:** qué resolver o preguntarle al operador antes de arrancar; "Ninguno" si está todo definido.
- **Bloqueos:** "Ninguno", o un valor que **empieza** con `[dependencia]` (no se puede empezar técnicamente) o `[postergada]` (conviene esperar) y el motivo. Con bloqueo va en "bloqueadas / pospuestas"; si no, en "libres". Si una tarea ya desbloqueada (`[Resuelto el <fecha>] — …`) se vuelve a bloquear, el bloqueo vigente va **primero** y el historial resuelto después, porque el script de seguimiento toma el tag con el que empieza el campo.
- **Desbloquea:** (opcional) qué tareas quedan libres al cerrar esta.
- **Disparador:** cuándo corresponde tomarla; por defecto "cuando el operador pregunte por tareas pendientes".
- **Detalles:** contexto extendido, solo si hace falta.
- **Agregada:** fecha.

**Agrupamiento (solo en "Tareas libres"):** si superan las 15 tareas (Regla 8), se evalúa agrupar 2 o más que compartan un objetivo real — el grupo entero tiene que caber en una frase de objetivo compartido, sin forzar con "y". El grupo aparece en libres como un bloque `### Grupo — título (Tareas N, M)` con un `Resumen` de una frase; el detalle de cada tarea (`#### Tarea N — título`, mismo formato) se mueve a "Tareas agrupadas", que no hace falta leer salvo para tomar una. Un grupo que queda con una sola tarea se desarma.

**Anclas de sección:** no borres ni muevas los comentarios `<!-- agent-context-skill:section=... -->` (`free`, `blocked`, `grouped`) que preceden a cada sección: los usa el script de seguimiento de tareas de agent-context-kit.

> Numeración iniciada el 2026-09-24. Las tareas cerradas antes de esa fecha (ver `history.md`) no tienen número asignado retroactivamente.

**Próximo número de tarea:** 65

---

<!-- agent-context-skill:section=free -->
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

### Tarea 58 — Publicar la skill 2.0.0 y un release del kit

- **Descripción:** Taggear v2.0.0 en el repo de la skill y subir sus commits y el tag; subir package.json del kit a 1.8.0 (docs-check, skill fuera del kit, reglas renumeradas), taggear y subir. Los releases de GitHub los hace el operador.
- **Decisiones/temas a definir antes de empezar:** Confirmar el destino (origin de cada repo), los números de versión y si se publican releases de GitHub.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Surgida al cerrar las Tareas 54 y 55: la skill quedó en 2.0.0 sin tag ni push, y package.json del kit sigue en 1.7.0 con más de 40 commits posteriores.
- **Agregada:** 2026-10-11.

### Tarea 60 — Renombrar el name y el título de SKILL.md de agent-context-kit a agent-context-skill

- **Descripción:** Surgió al cerrar la Tarea 51; falta detallarla.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Agregada:** 2026-10-24.

### Tarea 63 — Decidir cuándo se genera roadmap.md al migrar

- **Descripción:** En la migración, roadmap.md se creó en una corrida y en la otra no: depende de la etapa del proyecto que el modelo infiere cuando no hay operador interactivo; hay que fijar una regla para que el resultado no varíe.
- **Decisiones/temas a definir antes de empezar:** Si en una migración roadmap.md se genera siempre (ALCANCE d), solo con ETAPA distinta de idea/setup, o solo si el proyecto migrado ya tenía uno; y qué etapa se asume por defecto cuando no se puede preguntar.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Surgida de la medición de la Tarea 62 (claude -p --model sonnet, 2 corridas): mig-1 generó docs/agents/roadmap.md y mig-2 no, con el mismo repo de partida. La regla está repartida entre questions-flow.md (roadmap solo si ETAPA distinta de idea/setup) y migration-flow.md paso 4 (seguir como si ALCANCE fuera d). Con operador interactivo la etapa se pregunta, así que el desvío aparece sobre todo sin él. Verificar repitiendo la medición con 2 corridas de migración.
- **Agregada:** 2026-10-25.

### Tarea 64 — Corrección de tandas de preguntas: mostrar el contexto en el chat

- **Descripción:** Las preguntas de la skill se hacen con AskUserQuestion y el contexto necesario para responder (por ejemplo, el plan completo cuando se pregunta si está bien) queda dentro del enunciado de la pregunta o no se muestra; hay que mostrarlo en el chat antes de preguntar.
- **Decisiones/temas a definir antes de empezar:** Cómo mostrar el contexto sin duplicarlo: texto en el chat justo antes de la pregunta, o un bloque de contexto por tanda; qué preguntas lo necesitan (plan de la Regla 2, tabla de mapeo de la migración, resumen de la actualización, rondas de questions-flow.md); si la regla vive en asking-questions.md y en rules.md.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Observado por el operador al usar la skill y el agente: se pregunta «¿los pasos están bien?» pero el plan completo no aparece en el chat, solo dentro del enunciado de la pregunta, y el operador no puede revisarlo antes de responder. Revisar docs/asking-questions.md, la Regla 2 de template/agents/rules.md (plan y tanda de preguntas), la «Ronda de confirmación» de migration-flow.md y el resumen previo de update-flow.md.
- **Agregada:** 2026-10-25.

<!-- agent-context-skill:section=blocked -->
## Tareas bloqueadas / pospuestas

### Tarea 38 — Revisar si el task-tracker necesita actualizarse por los últimos cambios

- **Descripción:** Comprobar si el task-tracker (scripts/task-tracker/) sigue mostrando bien el handoff, el backlog y el history tras los cambios de las Tareas 35 y 36, y actualizarlo si hace falta.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** `[postergada]` Revisada el 2026-10-09: el task-tracker no necesita cambios tras las Tareas 35 y 36. Volver a revisarla cuando haya cambios grandes en la skill.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Cambios a revisar: (1) los pasos del plan pueden llevar al final de la línea evidencia y commit (· bun test 779 pass · commit abc1234, Tarea 35): ver si el tracker los corta, los desalinea o los muestra bien; (2) un paso reabierto se escribe como (reabierto: motivo); (3) el handoff ahora se edita solo en lo que cambia y las pausadas ya no se leen salvo sin tarea en curso: ver si el tracker asume que el archivo se reescribe entero (reintento de primera lectura en src/io/snapshot.ts); (4) la entrada de history.md ahora es más breve y lista los commits; (5) el reporte de cierre suma Checks pendientes y Próximo paso (no afecta al tracker, solo confirmarlo). Probar contra el handoff real con una tarea en curso, con evidencia en los pasos y con una pausada. Si no hay nada que cambiar, cerrarla con esa conclusión.
- **Agregada:** 2026-10-08.

<!-- agent-context-skill:section=grouped -->
## Tareas agrupadas

No aplica todavía — ningún grupo formado.
