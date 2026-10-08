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

**Próximo número de tarea:** 42

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
- **Detalles:** ver pendientes relacionados en [`../../desing.md`](../../desing.md).
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

### Tarea 34 — Reevaluar los comandos del task-manager

- **Descripción:** Revisar los comandos del script scripts/task-manager/ para hacerlos más eficientes o cambiar su forma (flags, salida, cantidad de pasos por operación, comandos que se puedan fusionar o simplificar), según cómo los usa realmente el agente.
- **Decisiones/temas a definir antes de empezar:** Qué fricciones se vieron al usarlos (flags largos, texto libre, `--apply`, pausar/empezar en varios pasos); si conviene fusionar o renombrar comandos; qué se mantiene por compatibilidad.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Surgida al usar el script en las Tareas 24 y 32. Límites conocidos: block/unblock no soportan tareas agrupadas ni team-backlog.md; add y start sin --json. Surgido al hacer la Tarea 36: `step` ya edita de forma puntual (marcar, desmarcar y reemplazar una subsección), pero no permite cambiar el texto o la nota de un paso, agregar o quitar pasos, ni reabrir uno con motivo (lo pide la Tarea 35), y admite solo una de `--falta`/`--decisiones`/`--proximo` por ejecución.
- **Agregada:** 2026-10-08.

### Tarea 37 — Limpiar el seguimiento de ODD de las instrucciones globales

- **Descripción:** Quitar de ~/.claude/CLAUDE.md el seguimiento de tareas de ODD (odd/tasks, evidencia, reanudación) para no duplicar el handoff, dejando global solo lo que no depende del repo; y borrar la carpeta odd/ de este repo.
- **Decisiones/temas a definir antes de empezar:** Qué párrafos de ODD salen, cuáles se quedan globales y cuáles se deciden (TDD, presupuesto de entrega y estrategia de PR); si el nombre ODD se conserva para lo que se queda; confirmar el reparto con el operador antes de editar el archivo global.
- **Bloqueos:** `[Resuelto el 2026-10-08]` — era `[dependencia]` Depende de la Tarea 35 (la 36 ya está cerrada): el skill tiene que cubrir primero evidencia por paso, cambios aceptados y cierre honesto; si no, esas prácticas quedan sin dueño.
- **Disparador:** cuando la Tarea 35 esté cerrada.
- **Detalles:** Origen: el seguimiento de ODD (instrucciones globales del operador, `C:\Users\Gersom\.claude\CLAUDE.md`, sección «Organic Driven Development») duplica el trabajo del handoff: el agente mantiene `odd/tasks/<feature>.md` además de `handoff.md`/`history.md`. Es una tarea distinta de la 35: la 35 y la 36 cambian el repo (reglas y plantillas del skill); esta cambia un archivo fuera del repo, que no se versiona acá. Depende de ellas: borrar el seguimiento de ODD antes de que el skill cubra evidencia por paso, cambios aceptados y cierre honesto dejaría esas prácticas sin dueño.
  Objetivo: que el seguimiento de tareas lo gobierne solo el sistema del skill (AGENTS.md, rules.md, handoff, task-manager) y que las instrucciones globales conserven únicamente lo que no depende del repo.
  Reparto propuesto (confirmar con el operador al empezar):
  - Sale de lo global (lo cubre el skill): crear/mantener `odd/tasks/<feature>.md`, «Track before the first write», checklist con IDs, evidencia y marcado de pasos, reabrir pasos con motivo, registro de ruta y triggers por tarea, reanudación, cierre con checks pendientes, commits por unidad de trabajo registrados en el documento (la Regla 9 ya los cubre).
  - Se queda global (comportamiento del agente, vale en cualquier repo): autorizar antes de escribir (investigación y propuestas son solo lectura), explorar antes de proponer, resolver incertidumbre con una pregunta enfocada, triggers de delegación (4+ archivos, 2+ writers, respaldo de sesión larga), un solo reto de supuestos, receipt-driven review (switch del operador), autorización de operaciones remotas, y la sección CodeGraph.
  - A decidir: resolución del modo TDD y el runner (el kit no lo porta, ver Tarea 35); presupuesto de entrega ~400 líneas y estrategia de PR (`ask-on-risk`, `chained-pr`, `work-unit-commits`); qué hacer con los términos «ODD», «feature document» y «tasks» que queden huérfanos en el texto restante; si el nombre ODD se conserva para lo que se queda.
  Pasos previstos: (1) copia de seguridad del archivo global; (2) leer la sección ODD completa y marcar cada párrafo como «sale», «se queda» o «decidir»; (3) mostrar el resultado al operador antes de editar; (4) editar; (5) añadir en lo global una línea que remita al repo: «si el repo tiene AGENTS.md, el seguimiento de tareas se rige por sus reglas, no por un documento aparte»; (6) borrar `odd/tasks/ask-user-question-widget.md` y `odd/tasks/task-manager-script.md` de este repo (su contenido ya vive en `history.md` y en git) y la carpeta `odd/` si queda vacía; (7) verificar que ya no quedan referencias a `odd/tasks` ni a Engram.
  Fuera de alcance: cambiar las reglas del skill (eso es la 35 y la 36); tocar la configuración de receipt-driven o de CodeGraph.
- **Agregada:** 2026-10-08.

### Tarea 38 — Revisar si el task-tracker necesita actualizarse por los últimos cambios

- **Descripción:** Comprobar si el task-tracker (scripts/task-tracker/) sigue mostrando bien el handoff, el backlog y el history tras los cambios de las Tareas 35 y 36, y actualizarlo si hace falta.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** Ninguno
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Cambios a revisar: (1) los pasos del plan pueden llevar al final de la línea evidencia y commit (· bun test 779 pass · commit abc1234, Tarea 35): ver si el tracker los corta, los desalinea o los muestra bien; (2) un paso reabierto se escribe como (reabierto: motivo); (3) el handoff ahora se edita solo en lo que cambia y las pausadas ya no se leen salvo sin tarea en curso: ver si el tracker asume que el archivo se reescribe entero (reintento de primera lectura en src/io/snapshot.ts); (4) la entrada de history.md ahora es más breve y lista los commits; (5) el reporte de cierre suma Checks pendientes y Próximo paso (no afecta al tracker, solo confirmarlo). Probar contra el handoff real con una tarea en curso, con evidencia en los pasos y con una pausada. Si no hay nada que cambiar, cerrarla con esa conclusión.
- **Agregada:** 2026-10-08.

### Tarea 39 — Extraer la funcionalidad de subagentes a esta skill

- **Descripción:** Mover del CLAUDE.md global a las reglas de la skill lo que hoy hace ODD con subagentes (rutas inline/delegada/SDD, triggers de delegación, investigación y reto de supuestos), para que solo se cargue cuando se usa la skill y no viaje en el contexto de cualquier conversación.
- **Decisiones/temas a definir antes de empezar:** Si se adopta tal cual (triggers de 4+ archivos, 2+ escritores, ~20 llamadas) o se adapta: el system prompt de Claude Code dice no lanzar subagentes salvo que el operador lo pida, y cada subagente arranca en frío; si va en rules.md (para todos los operadores y agentes) o en el preferences.md de cada operador; qué se hace con el flujo SDD.
- **Bloqueos:** Ninguno
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Origen: al limpiar el CLAUDE.md global (Tarea 37) el operador decidió que ODD no viaje siempre en el contexto y que lo útil viva en la skill. Esta tarea recoge lo relativo a subagentes: rutas (directa, delegada, SDD opcional), Mandatory Delegation Triggers (mapeo con 4+ archivos, escritor con 2+ archivos no triviales, preparación, respaldo de sesión larga) y la investigación con un único reto de supuestos de solo lectura. Observación: en las Tareas 35 y 36 se editaron varios archivos importantes en línea, lo que esos triggers consideran un fallo de enrutado; conviene decidir si se quieren como obligatorios o como sugerencia. La línea de validar premisas con evidencia queda en lo global (Tarea 37).
- **Agregada:** 2026-10-08.

### Tarea 40 — Pasar a las reglas de la skill: autorizar antes de escribir, explorar y resolver incertidumbre

- **Descripción:** Llevar a la skill lo que hoy solo está en el CLAUDE.md global (una pregunta o investigación no autoriza cambios; explorar antes de proponer; una pregunta concreta ante una duda), para que el contexto global no lo cargue en cualquier conversación.
- **Decisiones/temas a definir antes de empezar:** Si va en la Regla 2 de rules.md (todos los operadores y agentes) o en el preferences.md de cada operador; cómo decirlo en pocas líneas; qué bump de versión corresponde.
- **Bloqueos:** Ninguno
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Origen: Tarea 37. De lo global, «Clasificar» ya es la Regla 2; faltan tres cosas: (1) autorizar: investigación, explicación, revisión, comparación o proponer una solución son solo lectura hasta que el operador pida implementar; si la intención es ambigua, una sola aclaración; (2) explorar el código y los requisitos antes de proponer o escribir; (3) ante una duda real de producto, una sola pregunta concreta y esperar. Aplica solo a proyectos que usan la skill; fuera de ella no queda esa protección (decisión del operador). Cambia reglas fijas: actualizar docs/agents/rules.md y skill/template/agents/rules.md.
- **Agregada:** 2026-10-08.

### Tarea 41 — Evitar que gentle-ai restaure el bloque ODD del CLAUDE.md global

- **Descripción:** Resolver que el bloque agent-routing del CLAUDE.md global lo gestiona gentle-ai: un gentle-ai sync, install o actualización puede regenerarlo y devolver el ODD que se quitó en la Tarea 37.
- **Decisiones/temas a definir antes de empezar:** Cómo evitarlo: ver si gentle-ai permite desactivar o configurar ese bloque, sacar el contenido propio fuera de los marcadores, o aceptar re-editarlo tras cada sync.
- **Bloqueos:** Ninguno
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Problema: C:\Users\Gersom\.claude\CLAUDE.md envuelve la sección ODD y la autorización de operaciones remotas entre los marcadores <!-- gentle-ai:agent-routing --> y <!-- /gentle-ai:agent-routing -->, y CodeGraph entre <!-- gentle-ai:codegraph-guidance --> y su cierre. gentle-ai sync ("sincroniza configuraciones y skills a la versión actual", gentle-ai 3.7.0) puede reescribir esos bloques y restaurar lo eliminado en la Tarea 37. Pasos previstos al tomarla: (1) leer la ayuda y la documentación de gentle-ai sobre sync, install y persona/agent-routing, y ver si hay un flag o configuración para omitir el bloque ODD; (2) probar qué hace sync sobre una copia del archivo, nunca sobre el real; (3) elegir: configuración de gentle-ai, contenido propio fuera de los marcadores o re-edición tras cada sync; (4) documentar la solución. No ejecutar uninstall. Relacionada: Tarea 37 (la limpieza se hace igualmente; este riesgo es la parte que queda por resolver).
- **Agregada:** 2026-10-08.

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
