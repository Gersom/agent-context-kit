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

**Próximo número de tarea:** 79

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

- **Descripción:** publicar `agent-context-skill` en https://www.skills.sh/ para que esté disponible en el catálogo público de skills.
- **Decisiones/temas a definir antes de empezar:** revisar los requisitos de publicación de skills.sh (formato esperado, metadata, proceso de submit) antes de armar el paquete final.
- **Bloqueos:** `[Resuelto el 2026-10-10]` — era `[dependencia]` depende de que la Tarea 3 (Exportar como skill utilizable por Claude) esté resuelta — el paquete a publicar en skills.sh probablemente sea el mismo artefacto exportado ahí. (La Tarea 3 ya no está bloqueada, pero sigue sin hacerse — ver "Tareas libres".)
- **Disparador:** cuando el operador quiera hacer pública la skill, o priorice esta tarea explícitamente.
- **Detalles:** ninguno.
- **Agregada:** 2026-09-24.

### Tarea 70 — Precisar la regla de tags de versión (anotados, en el commit de versión, con --follow-tags)

- **Descripción:** Ajustar la «Decisión no negociable» de rules.md y docs/releasing.md: cada cambio de versión lleva un tag anotado vX.Y.Z en el commit que la sube, y se sube con git push --follow-tags (no --tags). Aplica a todo el kit desde la v1.8.1 (que ya tiene su tag).
- **Decisiones/temas a definir antes de empezar:** Ninguno. Decidido: tags anotados; se suben con --follow-tags junto al push del commit; desde v1.8.1 en adelante.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** rules.md es de todos los operadores; hoy solo figura gersom. No tocar push.followTags de la config de git de nadie.
- **Agregada:** 2026-10-26.

### Tarea 71 — Quitar las APIs de Bun del runtime de los scripts

- **Descripción:** Reemplazar Bun.stringWidth (scripts/task-tracker/src/ui/format.ts) por string-width y Bun.stdin.text() (scripts/task-manager/src/cli/dispatch.ts) por lectura de process.stdin. Hecho: los tres scripts corren igual con Node y con Bun, y bun test y bun run typecheck pasan.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Primer paso para publicar el kit en npm en JS (corre con npx y con bunx). Los bun:test y import.meta.dir de los tests no cuentan: no van al paquete.
- **Agregada:** 2026-10-26.

### Tarea 72 — CLI único ackit con subcomandos

- **Descripción:** Un punto de entrada ackit que despache a tasks (task-tracker, aún con su nombre actual), task (task-manager) y check (docs-check). Actualizar los scripts de package.json, los README de cada script y el README raíz. Hecho: ackit tasks|task|check <args> funciona con Bun y con Node.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Un solo paquete y un solo bin (ackit); los scripts comparten _shared y el formato de los archivos del proyecto, por eso no se separan. Va antes que la tarea de renombrar tasks a board. Depende de la tarea de quitar APIs de Bun.
- **Agregada:** 2026-10-26.

### Tarea 73 — Renombrar el comando tasks a board

- **Descripción:** Renombrar el subcomando del task-tracker de tasks a board (ackit board), porque ackit tasks y ackit task difieren en una letra. Actualizar README raíz, README del script, docs/ y referencias en rules.md. Hecho: ackit board funciona, y no quedan referencias a ackit tasks ni a bun run tasks.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Va después de la tarea del CLI ackit.
- **Agregada:** 2026-10-26.

### Tarea 74 — Build a JS publicable

- **Descripción:** Generar dist/ (bun build --target=node o tsc) con shebang de Node, y dist/ en .gitignore. Las dependencias (picocolors, string-width) van dentro del bundle. Verificar que ningún script lea archivos fuera de dist/ en runtime. Hecho: node dist/cli.js check <proyecto> funciona desde otra carpeta, sin el repo.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Depende de las tareas del CLI ackit y de quitar APIs de Bun.
- **Agregada:** 2026-10-26.

### Tarea 75 — Preparar package.json para npm

- **Descripción:** Quitar private, definir name (comprobar disponibilidad de agent-context-kit en npm; si no, @gersom/agent-context-kit), bin (ackit), files (dist), engines (node >=20) y prepublishOnly con el build. Eliminar de rules.md la regla «Dependencias de scripts/: solo en devDependencies» (decidido por el operador). Hecho: npm pack --dry-run lista solo lo esperado.
- **Decisiones/temas a definir antes de empezar:** Decidido: eliminar la regla de devDependencies. Falta: el name final del paquete según disponibilidad.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** rules.md es de todos los operadores; hoy solo figura gersom. Depende de la tarea de build a JS.
- **Agregada:** 2026-10-26.

### Tarea 76 — Probar la instalación real del paquete

- **Descripción:** Instalar el tarball de npm pack en una carpeta limpia y ejecutar ackit board, task y check con npx y con bunx, en Windows y al menos en otro SO si es posible. Hecho: los tres subcomandos corren desde la instalación, sin clonar el repo.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Depende de la tarea de package.json para npm.
- **Agregada:** 2026-10-26.

### Tarea 77 — Publicar la primera versión en npm y documentar la instalación

- **Descripción:** npm publish (con 2FA), sección de instalación y actualización en el README (npx agent-context-kit@latest, npm install -g ...@latest), subir la versión del kit, con su tag según la regla de tags. Hecho: el paquete se instala desde npm y el README lo explica.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Publicar es irreversible (una versión no se reutiliza): confirmar con el operador antes del npm publish. Depende de la prueba de instalación real.
- **Agregada:** 2026-10-26.

<!-- agent-context-skill:section=blocked -->
## Tareas bloqueadas / pospuestas

### Tarea 38 — Revisar si el task-tracker necesita actualizarse por los últimos cambios

- **Descripción:** Comprobar si el task-tracker (scripts/task-tracker/) sigue mostrando bien el handoff, el backlog y el history tras los cambios de las Tareas 35 y 36, y actualizarlo si hace falta.
- **Decisiones/temas a definir antes de empezar:** Ninguno.
- **Bloqueos:** `[postergada]` Revisada el 2026-10-09: el task-tracker no necesita cambios tras las Tareas 35 y 36. Volver a revisarla cuando haya cambios grandes en la skill.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Detalles:** Cambios a revisar: (1) los pasos del plan pueden llevar al final de la línea evidencia y commit (· bun test 779 pass · commit abc1234, Tarea 35): ver si el tracker los corta, los desalinea o los muestra bien; (2) un paso reabierto se escribe como (reabierto: motivo); (3) el handoff ahora se edita solo en lo que cambia y las pausadas ya no se leen salvo sin tarea en curso: ver si el tracker asume que el archivo se reescribe entero (reintento de primera lectura en src/io/snapshot.ts); (4) la entrada de history.md ahora es más breve y lista los commits; (5) el reporte de cierre suma Checks pendientes y Próximo paso (no afecta al tracker, solo confirmarlo). Probar contra el handoff real con una tarea en curso, con evidencia en los pasos y con una pausada. Si no hay nada que cambiar, cerrarla con esa conclusión.
- **Agregada:** 2026-10-08.

### Tarea 78 — Publicación en npm por GitHub Actions

- **Descripción:** Debatir si automatizar la publicación en npm (GitHub Actions al subir un tag vX.Y.Z, con provenance) y qué decisión tomar, porque contradice la «Decisión no negociable» de releases manuales, no por CI.
- **Decisiones/temas a definir antes de empezar:** Debatir con el operador: ¿se revisa la decisión de «no por CI»? ¿Se publica por CI o se mantiene manual? Token de npm o trusted publishing (lo configura el operador).
- **Bloqueos:** [postergada] Hay que debatirla al llegar a esta tarea, tras publicar la primera versión.
- **Disparador:** cuando el operador pregunte por tareas pendientes.
- **Agregada:** 2026-10-26.

<!-- agent-context-skill:section=grouped -->
## Tareas agrupadas

No aplica todavía — ningún grupo formado.
