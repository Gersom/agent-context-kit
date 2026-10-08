# History

Historial de tareas resueltas — hechas o descartadas: el "qué pasó y por qué". A diferencia de [`./handoff.md`](./handoff.md), **se acumula**: cada tarea resuelta agrega una entrada, sin sobrescribir las anteriores. La cola de pendientes vive en [`./backlog.md`](./backlog.md).

- **Entradas nuevas van arriba** (la más reciente primero). Cada una marca su tipo: ✅ **Hecha** o ❌ **Descartada** (el motivo del descarte queda para que no se vuelva a proponer sin verlo).
- **Formato:** `## <fecha> — ✅|❌ [Tarea N —] <título>` (el segmento `Tarea N —` solo si la tarea tenía número en `backlog.md`; ese número viaja con ella y no se reasigna; las entradas sin número no se numeran retroactivamente). Debajo, 3 a 5 líneas: qué se hizo y **por qué** (el motivo, no la descripción técnica), una línea de cómo y los commits que lo contienen, sin el recorrido de cambios ni decisiones (ese vive en el handoff). Si la tarea vino del `team-backlog.md` (modo multi-operador), la primera viñeta es `- **Origen:** team-backlog`.
- **Qué no va:** lo que ya dice el código, el diff o el commit, ni lo que explica otro archivo (`decisions.md`, `architecture.md`): linkearlo.
- **Cómo leerlo:** no hace falta leerlo entero. Para una tarea puntual, buscar su entrada por número o título; para el contexto reciente, las primeras entradas.

> Carga inicial reconstruida retroactivamente desde `git log`, ya que este skill se aplicó sobre su propio repo después de tener historial previo (por eso todas son ✅ Hecha: del log no se reconstruyen descartes). Las entradas anteriores al 2026-09-24, cuando empezó la numeración de tareas (ver `backlog.md`), no tienen número y no se renumeran.

---

## 2026-10-08 — ✅ Tarea 41 — Evitar que gentle-ai restaure el bloque ODD del CLAUDE.md global

- El bloque agent-routing del CLAUDE.md global lo gestiona gentle-ai (hace copia en ~/.gentle-ai/backups antes de escribir) y no documenta una forma de excluir el ODD. Hoy gentle-ai sync no toca ningún agente (installed_agents vacío), pero install o sync --agent claude-code podrían devolverlo. Solución elegida: conservar el recorte como CLAUDE.md.trimmed junto al original (y el .bak con ODD) y restaurarlo a mano con cp tras un install o sync, sin cambiar la configuración de gentle-ai; quedó anotado en la memoria del agente. No se ejecutó ningún sync real, solo --dry-run.

## 2026-10-08 — ✅ Tarea 37 — Limpiar el seguimiento de ODD de las instrucciones globales

- El seguimiento de tareas deja de estar duplicado en las instrucciones globales: el CLAUDE.md global pasó de 21,4 KB a 4,7 KB (unos 4.500 tokens menos por conversación) y conserva solo CodeGraph, operaciones remotas y una línea de validar premisas con evidencia. Salieron el protocolo y el seguimiento de ODD, rutas y triggers de delegación, revisión por recibos, TDD, presupuesto de líneas, estrategia de PR y la regla de rama y commit; la revisión por recibos quedó desactivada con gentle-ai review mode disable. Se borró la carpeta odd/ del repo. El archivo global está fuera del repo; su copia de seguridad queda en C:\Users\Gersom\.claude\CLAUDE.md.bak hasta resolver la Tarea 41 (gentle-ai puede restaurar el bloque con sync). Commit: 471ca4f.

## 2026-10-08 — ✅ Tarea 35 — Portar a las reglas del kit las prácticas de seguimiento de ODD

- Tres prácticas de ODD portadas a las reglas del kit para que el seguimiento viva solo en el handoff: evidencia por paso como sufijo de la línea (checks y commit, solo mientras la tarea está en curso o pausada), cambios aceptados a mitad de trabajo (se conserva lo hecho y se reabre el invalidado con motivo) y cierre honesto (history guarda solo resultado, cómo y commits; el reporte de cierre suma «Checks pendientes» y «Próximo paso»). Reglas 5, 6 y 8 y los history.md en docs/agents y en las plantillas, nota del formato en los dos handoff, un test nuevo de pause/resume/step con el sufijo y versión 1.6.0 sin tag ni release. bun test 780 pasan y typecheck limpio. Commits: c258e83, 88dc566, 4e76872.

## 2026-10-08 — ✅ Tarea 36 — Optimizar el handoff: leer pausadas solo sin tarea en curso y editar solo lo que cambia

- Dos cambios para ahorrar tokens: el agente lee del handoff solo «Tarea en progreso» (las pausadas solo si no hay tarea en curso o si le piden retomar una), y el handoff se actualiza editando solo lo que cambió en vez de reescribirse entero. Se ajustaron AGENTS.md y sus dos plantillas, los textos del handoff y su plantilla, template-architecture.md y la Regla 6 (con su plantilla). El script task-manager ya edita de forma puntual; lo que le falta (editar la nota de un paso, reabrirlo con motivo) quedó anotado en la Tarea 34. bun test 779 pasan y typecheck limpio. Commits: d0aac8d, 48d2877.

## 2026-10-08 — ✅ Tarea 33 — Reevaluar las reglas de rules.md

- Reglas reorganizadas: «Commits coherentes» pasa a regla por defecto (Regla 9) y «solo se cierra si el operador lo pide» entra en la Regla 5. Nueva cláusula «Con una herramienta de tareas» en «Al cerrar una tarea» y en el bloque multi-operador: lo que ya hace la herramienta no se repite a mano. Se eliminaron las repeticiones (nombres en inglés, número correlativo, plantillas por idioma, «fijas» duplicado, «no se copia literal»). Sin regla propia de AskUserQuestion: queda a criterio del agente y solo rige para las preguntas del skill. Plantillas alineadas y versión 1.5.0, sin tag ni release.

## 2026-10-08 — ✅ Tarea 24 — Script para gestionar las tareas (handoff, backlog, history)

- Script `scripts/task-manager/` (`bun run task`) que edita de forma quirúrgica handoff, backlog, history y team-backlog, en vez de editarlos a mano. Comandos: status, next, show, add, start, step, pause, resume, block, unblock y close (Reglas 5 a 8 y reporte de cierre). Las escrituras exigen --apply; es opcional y no forma parte del skill. Documentado en su README, el README raíz, architecture.md y una sección de rules.md que aclara que no exime de las Reglas 5 a 8. close también descarta directo tareas del backlog. bun test 779 pasan y typecheck limpio. Rama feat/task-manager, sin mergear ni pushear.

## 2026-10-07 — ✅ Tarea 32 — Cambiar preguntas normales a widget

- El skill pregunta al operador con AskUserQuestion: regla general en SKILL.md (abiertas con 2 opciones mínimas, hasta 4 preguntas por llamada, respaldo en texto), flujos questions-flow/migration-flow/multi-operator reexpresados como opciones, mención en la Regla 2 por defecto y versión 1.4.0. Commits: e68a9cb, 573817f, a91c5e4, 37c7dbe, 1530107.

## 2026-10-07 — ✅ Tarea 31 — Cambiar la organización del render

- El panel del operador muestra los recuadros como el flujo de una tarea, de arriba abajo: SIN DUEÑO → LIBRES ⇅ BLOQUEADAS → EN PROGRESO ⇅ PAUSADAS → COMPLETADAS, con una línea de flecha que nombra cada transición (`↓ se toma`, `↓ bloquea · ↑ desbloquea`, `↓ empieza`, `↑ retoma · ↓ pausa`, `↓ se cierra`). Solo hay flecha entre recuadros que se muestran. La vista de equipo no cambió.
- Decisiones del operador: el orden de LIBRES y BLOQUEADAS cambió de opinión una vez (primero BLOQUEADAS arriba, al final LIBRES arriba); con el orden final, entre BLOQUEADAS y EN PROGRESO la flecha dice `↓ empieza (desde libres)`, porque una bloqueada no empieza directo. La dirección de cada flecha sigue el movimiento de la tarea.
- Ampliación: tecla `c` que compacta o expande los recuadros que no son EN PROGRESO ni PAUSADAS (una sola tarea, la más reciente, con `· +N más`; EQUIPO nunca se compacta), tecla `f` que oculta o muestra las flechas, y las opciones `--compact` y `--no-arrows`. El pie pasó al formato `[tecla] acción` sugerido por el operador y se parte en dos líneas si no entra, para que "salir" no se recorte.
- Verificación: `bun test` → 239 tests, todos pasan (19 nuevos); `bun run typecheck` sin errores; el operador probó a mano el selector y las teclas en una terminal real (queda resuelto lo que había quedado pendiente en la Tarea 30).
- Commits: `bfad675`, `fa426c1`, `1c2b7e9`, `18385cc` y el de cierre, en la rama `chore/apply-multi-operator`.
- A pedido del operador, esa rama (que llevaba apiladas las de las Tareas 26 y 30 y el paso de este repo a modo multi) se mergeó a `main` y se pusheó, y se publicó la versión 1.3.0 (bump **minor**: el modo multi es opcional y no cambia lo que se genera en modo plano): tag `v1.3.0` y [GitHub Release](https://github.com/Gersom/agent-context-kit/releases/tag/v1.3.0) con notas que resumen los cambios desde `v1.2.0`. Se borraron las ramas locales ya integradas (`docs/optimize-context`, `feat/multi-operator`, `feat/team-view` y `chore/apply-multi-operator`).

## 2026-10-06 — ✅ Pasado a modo multi-operador

- Este repo pasó de la estructura plana a la multi-operador (dogfooding, con `migration-flow.md`, "Pasar de plano a multi-operador"): `handoff.md`, `backlog.md` e `history.md` se movieron con `git mv` a `docs/agents/gersom/` sin reescribirlos (solo cambiaron dos enlaces relativos) y la numeración continúa (próximo número: 31).
- Registrados: `gersom` (gersomalaja@gmail.com), sin más operadores por ahora. Se crearon `operators.md` y `team-backlog.md`; el `rules.md` suma el bloque "Trabajo en paralelo" (las Reglas por defecto no se tocaron), el `AGENTS.md` raíz usa la variante multi y `docs/README.md` y `docs/architecture.md` muestran la estructura nueva.
- La Tarea 19 (prompt de normalización para repos que ya adoptaron el skill) pasó al `team-backlog.md` como tarea sin dueño; su número queda retirado. Cuando alguien la tome recibirá un número de su propia secuencia.
- Verificación: `bun test` → 219 tests, todos pasan; el tracker abre la vista de equipo de este repo con `gersom` preseleccionado.

## 2026-10-06 — ✅ Tarea 30 — Vista de equipo en el task-tracker (todos los operadores)

- En modo multi-operador el tracker abre en una vista de equipo: el recuadro EQUIPO es un selector con una fila por operador (su tarea en curso con el avance del plan, sus libres y bloqueadas y la última tarea que cerró) y, debajo, el recuadro "SIN DUEÑO" con las tareas de `team-backlog.md`. `↑`/`↓` eligen, `Enter` abre el panel del operador (que lleva el mismo recuadro "SIN DUEÑO" debajo de BLOQUEADAS) y `b`, `Esc` o Retroceso vuelven. `bun run tasks <ruta> <operador>` abre su panel de frente.
- Decisiones del operador: selector en lugar de un resumen fijo encima, con la última completada en la fila de cada operador (sin recuadro mezclado de completadas); el título del recuadro es "SIN DUEÑO"; las teclas para volver son `b` y `Esc`. Cambio sobre la Tarea 26: se eliminó la pregunta interactiva de operador y el correo de git ya no abre el panel propio, solo deja la fila marcada `(tú)` y preseleccionada. Solo lectura, nunca modifica carpetas ajenas.
- Código: parser de `team-backlog.md` en `scripts/_shared/parse/`, lectura del equipo con un lector con memoria por carpeta, `watchDir` con lista de archivos (se vigilan la raíz y cada operador), modelo del equipo, navegación como función pura de estado y teclas (`cli/nav.ts`), teclas con flechas (`cli/keys.ts`) y `render.ts` con lienzo compartido entre el panel y la vista de equipo.
- Verificación: `bun test` → 220 tests, todos pasan (57 nuevos); `bun run typecheck` sin errores; 0 enlaces relativos rotos; el script entero probado con un repo multi real con git (vista de equipo, operador por segundo argumento, `--operator`, carpeta directa y error con operador inexistente). Pendiente: el bucle interactivo del selector (modo raw) no se pudo ejecutar en este entorno; solo está cubierta su lógica pura.
- Commits: `75545ae`, `64c096d`, `cb54b63`, `331d0dd`, `2963a61` y el de cierre, en la rama `feat/team-view` (sale de `feat/multi-operator`).

## 2026-10-06 — ✅ Tarea 26 — Soportar varios operadores trabajando en paralelo

- Modo multi-operador opcional (opt-in en la Ronda 3 de `questions-flow.md`): cada operador tiene su carpeta `docs/agents/<operador>/` con su `handoff.md`, `backlog.md` e `history.md`, así nadie edita los archivos de otro y desaparecen los conflictos de merge y los números repetidos. El modo se detecta por `docs/agents/operators.md`; el operador actual, por el correo de `git config user.email`. Las reglas y el diseño completo están en `skill/docs/multi-operator.md`.
- Las tareas sin dueño van a `team-backlog.md`, sin numeración; quien la toma recibe el número de su secuencia (va a su `backlog.md` o directo a su `handoff.md`) y puede devolverla. Hay operadores sin carpeta (`solo team-backlog`) para quien solo recolecta tareas, y `preferences.md` opcional para la forma de trabajar de cada uno, que no puede contradecir `rules.md`.
- Decisiones del operador: soporte completo por carpeta de operador (en vez de documentar la limitación); nombres cortos y `operators.md` en lugar del correo en la ruta; `team-backlog.md` para lo sin dueño y `backlog.md` para lo tomado; las Reglas por defecto no se tocan: el bloque "Trabajo en paralelo" se agrega a `rules.md` solo en modo multi. Un proyecto de una sola persona no cambia (el diff de sus plantillas contra `main` está vacío). La vista de todos los operadores quedó en la Tarea 30.
- Task-tracker: detecta el modo, resuelve el operador (con `--operator` o elección interactiva si no puede solo), muestra el operador en el título y avisa si falta `operators.md` habiendo carpetas de operador. Parser de `operators.md` en `scripts/_shared/parse/`.
- Resultado (bytes / 3,1): inicio de sesión en un repo destino plano 6.149 B (igual que antes); en modo multi 8.945 B, +2.796 B ≈ +900 tokens por sesión que solo paga quien lo activa.
- Verificación: `bun test` → 163 tests, todos pasan (40 nuevos); `bun run typecheck` sin errores; 0 enlaces relativos rotos; probado con un repo multi real. Sin bump de versión; sería minor, se decide al publicar.
- Commits: `dd152ef`, `3941426`, `cdc7db8`, `69c307f`, `48d72d5`, `af78ce1`, `274d2b6`, `27add45`, `289932f`, `a94adb9`, `eb1d51d`, `6b33aee` y el de cierre, en la rama `feat/multi-operator`.

## 2026-10-06 — ✅ Tarea 29 — Política de lectura selectiva del skill y de la migración

- El skill se aplica una vez por repo; las sesiones siguientes solo leen lo generado. Por eso la política de uso diario quedó en el `AGENTS.md` del repo destino (leer `docs/README.md`, `rules.md` y `handoff.md`; el resto solo si la tarea lo exige; sin leer `backlog.md`/`history.md` con tarea en curso) y la de `SKILL.md` solo cubre generar y migrar (medir antes de leer, `cp` en vez de leer y reescribir, de a un archivo).
- `docs/README.md` pasó a ser un mapa de ~1,5 KB con la definición de "operador"; `architecture.md` recuperó su árbol anotado (corrige el hallazgo F4 de la Tarea 25). Las Reglas 5 a 8 pasaron, sin renumerar, a una sección final "Al cerrar una tarea" que se lee solo al cerrar. La migración pregunta si conservar `docs-legacy/` y si condensar o mantener el texto.
- Autorizado por el operador: editar las Reglas por defecto fijas (partir su lectura y acortar su redacción). Sin bump de versión; se decide al publicar la próxima release.
- Resultado (bytes / 3,1): inicio de sesión de este repo 11.411 → 9.324 B (−18%, README incluido); repo destino ≈ 6.149 B (≈ 1.980 tokens), no comparable 1:1 con la medición anterior porque `SKILL.md` ya no se carga en las sesiones siguientes.
- Verificación: `bun test` → 123 tests, todos pasan (16 nuevos en `scripts/skill-checks/`); `bun run typecheck` sin errores; 0 enlaces relativos rotos.
- Commits: `4678fa1`, `f3b85ed`, `8e772d8`, `78107d0`, `4cf8a9e`, `268f39c`, `806e7f1` y el de cierre, en la rama `docs/optimize-context`.
- A pedido del operador, la rama (Tareas 25 y 29) se mergeó a `main` y se pusheó, y se publicó la versión 1.2.0 (bump **minor**: no cambia los archivos que genera el skill ni mueve archivos de `template/`): tag `v1.2.0` y [GitHub Release](https://github.com/Gersom/agent-context-kit/releases/tag/v1.2.0) con notas que resumen los cambios desde `v1.1.0`.

## 2026-10-06 — ✅ Tarea 25 — Optimización del contenido del kit: menos tokens y sin duplicados

- Se midió una línea base de lo que se carga al iniciar sesión y se auditó el kit (8 hallazgos, F1–F8, todos aprobados y aplicados): comentarios de guía de las plantillas que ya no viajan al repo destino, preámbulos y reglas por defecto recortados, `architecture.md`/`stack.md` reescritos para contener solo lo no deducible del código, flujo "ya existe" resuelto en `SKILL.md` sin abrir `questions-flow.md`, y política de lectura de `history.md`/`backlog.md`. El porqué: el kit solo vale si su costo en tokens se mantiene bajo (`docs/philosophy.md`).
- Resultado (tokens ≈ bytes / 3,1): inicio de sesión de este repo −14% (13.321 → 11.411 B), plantillas `agents/` −32%, inicio de sesión en un repo destino −67% (31.490 → 10.383 B; estimación que supone que el agente quita los comentarios de guía).
- Autorizado por el operador: recortar las Reglas por defecto de `rules.md` (fijas) y reescribir `architecture.md`/`stack.md`. Sin bump de versión; se decide al publicar la próxima release.
- Verificación: `bun test` → 107 tests, todos pasan; `bun run typecheck` sin errores; enlaces relativos sin roturas; el parser del tracker lee las plantillas nuevas.
- Commits: `b28c1f0`, `2852c20`, `1327727`, `fa890b1` y el de cierre, en la rama `docs/optimize-context`.

## 2026-10-06 — ✅ Tarea 28 — Renombrar la carpeta `src/` a `skill/`

- La carpeta `src/` (con `SKILL.md`, `docs/` y `template/`) pasó a `skill/`, hecho con `git mv` para conservar el historial. Se actualizaron las referencias vivas: archivos dentro de `skill/`, README del task-tracker, `README.md`, `docs/architecture.md`, `docs/agents/rules.md` y las descripciones de las tareas abiertas del backlog. Los enlaces internos del skill son relativos, así que no se rompieron.
- `docs/desing.md` y las entradas ya cerradas de `history.md` se dejaron como están: son registro histórico con la ruta de entonces. El `src/` interno de `scripts/task-tracker/` no cambia.
- Autorizado por el operador: cambiar solo la ruta (no el contenido) dentro de las Reglas por defecto 3 y 4 de `rules.md`, que son fijas. Sin bump de versión (queda en 1.1.0); se decide al publicar la próxima release.
- Efecto conocido: los repos que ya generaron documentación con las plantillas `agents/handoff.md` y `agents/backlog.md` quedan con un puntero de texto a `src/docs/template-architecture.md`; no rompe nada.
- Verificación: `bun test` → 107 tests, todos pasan; `bun run typecheck` sin errores; búsqueda de `src/` sin restos fuera del `src/` interno del task-tracker y de los registros históricos.
- La rama `refactor/rename-src-to-skill` se mergeó a `main`, sin push.

## 2026-10-06 — ✅ Tarea 20 — Actualizar la sección "Estructura del repositorio" del README raíz

- La sección de `README.md` ahora muestra la estructura real: `src/` (el skill: `SKILL.md`, flujos de decisión y plantillas), `scripts/` (task-tracker y `_shared/`), `docs/` (documentación del propio repo, con `agents/`), `package.json` y `tsconfig.json`. Una línea por entrada, sin repetir el árbol completo: enlaza a `docs/architecture.md` y a `src/docs/template-architecture.md` (Regla 1).
- Antes mostraba `SKILL.md` y `template/` en la raíz y no mencionaba `docs/`, `scripts/` ni `package.json`.
- Fuera de alcance: la sección "Estado" del README ("Proyecto en diseño") puede estar desactualizada; no se tocó.
- Por pedido del operador durante la tarea, nació la Tarea 28 (renombrar `src/` a `skill/`); al hacerse, el README y `architecture.md` pasarán a decir `skill/`.
- Verificación: solo documentación; sin código ni tests afectados.
- La rama `docs/readme-structure` se mergeó a `main`, sin push.

## 2026-10-06 — ✅ Tarea 27 — Ocultamiento de tareas pausadas y bloqueadas cuando no hay

- En la pantalla del task-tracker, los recuadros PAUSADAS y BLOQUEADAS solo aparecen si hay tareas de ese tipo (`ui/render.ts`); ya no muestran "Ninguna". EN PROGRESO ("Sin tarea en curso"), LIBRES y TAREAS COMPLETADAS no cambian, y los contadores del modelo tampoco.
- Tests: se ajustó el de "estados vacíos y set mínimo" (pasó de 2 recuadros a 1) y se agregó uno que cubre los dos casos (sin pausadas ni bloqueadas no aparecen; con ellas sí). README del task-tracker actualizado.
- Verificación: `bun test` → 107 tests en 18 archivos, todos pasan; `bun run typecheck` sin errores; `bun run tasks docs/agents --once` sin recuadro PAUSADAS.
- Aparte, a pedido del operador durante la tarea: regla de "Commits coherentes" en `rules.md` (varios commits por tarea por unidad coherente, título `tipo(T-N): descripción`, commit de cierre con handoff/backlog/history). Primera tarea cerrada con esa convención.
- La rama `feat/hide-empty-sections` se mergeó a `main`, sin push.

## 2026-10-06 — ✅ Tarea 23 — Separar el parser de `parse/*.ts` para reutilizarlo en otros scripts

- Nuevo módulo compartido `scripts/_shared/` (decisión del operador: el `_` marca código de apoyo, y las carpetas de `scripts/` sin `_` son scripts independientes; documentado en `docs/architecture.md`). Contiene `parse/` (backlog, blocks, handoff, history, markdown, sections), `tasks/` (`block-info`, `task-refs`), `types.ts` con los tipos del dominio, y `test/` con los tests en espejo, los fixtures y `helpers.ts`.
- `shared/types.ts` del task-tracker quedó solo con los tipos de pantalla y de lectura de archivos; importa los del dominio desde `_shared`. Se movieron también `block-info.ts` y `task-refs.ts` porque los necesitan las Tareas 15 y 24.
- Refactor puro: el task-tracker no cambió de comportamiento. Las posiciones línea/offset del parser no se agregaron (decisión del operador): van en la Tarea 24.
- Verificación: `bun test` → 106 tests en 18 archivos, todos pasan; `bun run typecheck` sin errores; `bun run tasks docs/agents --once` se ve igual.
- Aparte: `.codegraph/` (índice local de CodeGraph) se agregó a `.gitignore`. Se mergeó la rama `refactor/shared-parser` a `main`, sin push.
- Desbloquea la Tarea 24, que pasó a "Tareas libres".

## 2026-10-06 — ✅ Tarea 22 — Definir y agregar la filosofía del proyecto

- Nuevo `docs/philosophy.md`: la razón de ser del kit (dictada por el operador: contexto que sobrevive entre sesiones, modelos y herramientas de IA, sin releer todo el código) y cinco principios — markdown plano como fuente de verdad del estado, el código gana ante un conflicto (enlaza la Regla 4 de `rules.md` sin duplicarla), versionado y portable, herramientas opcionales, y tolerancia a la edición manual (incluye edición quirúrgica).
- Decisiones del operador: archivo propio (no regla en `rules.md`, por lo que no hay regla nueva); el principio del código lo agregó él; la razón de ser la dictó él. Se depuró el texto para quitar repeticiones (56 → 44 líneas).
- Enlazado desde `README.md` y `docs/architecture.md` (árbol y "Qué es cada parte").
- Es la base de principios de la Tarea 24 (script de gestión de tareas).
- Verificación: solo documentación; sin código ni tests afectados.

## 2026-10-05 — ✅ Regla de cierre explícito y MVP del task-tracker

- Regla nueva en `rules.md` (reglas específicas): ninguna tarea se cierra sin que el operador lo pida explícitamente; al terminar se le manda el resumen y se espera, también en tareas chicas sin plan. Decisión del operador después de aplicarla por primera vez en la Tarea 21.
- El operador confirmó que el task-tracker llegó a su MVP → la Tarea 19 (prompt de normalización) se desbloqueó y pasó a "Tareas libres".
- La rama `feat/task-tracker` (Tareas 9 a 21) se mergeó a `main` (fast-forward) y se pusheó, a pedido del operador; después se borró la rama local.
- Se creó el tag `v1.1.0` y el [GitHub Release](https://github.com/Gersom/agent-context-kit/releases/tag/v1.1.0) correspondiente, con notas que resumen los cambios desde `v1.0.0`: anclas de sección, convenciones nuevas de las plantillas (bloqueos, plan de las pausadas, formato de `history.md`) y el task-tracker.

## 2026-10-05 — ✅ Tarea 21 — Ajustes de pantalla del task-tracker: tachado de pasos y recuadros

- **Recuadros:** cada tipo de tarea (completadas, en progreso, pausadas, libres, bloqueadas) va en un recuadro de esquinas redondeadas (`ui/box.ts`), con el título del tipo en el borde superior izquierdo y el archivo del que sale a la derecha; reemplazan a los separadores `━━ archivo ━━`. Todos tienen el ancho de la terminal (o `COLUMNS`, o 100 sin terminal; mínimo 40), con el texto largo recortado sin romper el borde (el ancho se mide en columnas visibles con `Bun.stringWidth`).
- **Tachado:** las tareas completadas ya no se tachan; se tacha solo el texto de los **pasos hechos** del plan, en la tarea en progreso y en las pausadas.
- **Plan de las pausadas:** la plantilla de `handoff.md` suma un campo opcional `Plan` en las pausadas, para conservar los checkboxes al pausar una tarea; el script lo muestra como plan (barra y pasos), sin repetirlo como texto. Documentado en `src/docs/template-architecture.md`.
- **Colores**, tras seis rondas de correcciones del operador: títulos de los recuadros sin íconos; bordes en gris (`picocolors.gray`) salvo el de "en progreso", que queda verde; tareas completadas (nombre y fecha) en gris 245 de la paleta de 256, con el prefijo `T-N` en verde; título "TAREAS COMPLETADAS" en `#6DB07B` (RGB directo, elegido por el operador a partir del `#4EBA65` del aviso de actualización de Claude Code); textos secundarios (rutas, archivo del borde, campos, pasos hechos, "Ninguna", pie) en gris 250, y ya no queda texto atenuado (`dim`). Los tonos viven en `tones()` de `ui/render.ts`.
- Verificación: `bun test` → 106 tests en 18 archivos, todos pasan; `bun run typecheck` sin errores. README del script actualizado.
- Instrucción del operador para esta tarea: no cerrarla hasta que lo pidiera explícitamente; después de cada ronda de correcciones se le mandó el resumen y se esperó.
- Al revisar las bloqueadas (Regla 7): la Tarea 4 sigue esperando a la 3; la 19 sigue postergada hasta que el operador confirme el MVP.

## 2026-10-05 — ✅ Tarea 11 — Refinar script de seguimiento de tareas

- **Pantalla rediseñada** a pedido del operador: encabezado con el nombre de la carpeta del repo en mayúsculas y sin guiones (`AGENT CONTEXT KIT`), la ruta del repo y "Última actualización HH:MM:SS · se modificó <archivo>"; un bloque por archivo con su separador `━━ archivo ━━`, en este orden:
  - `history.md` — "TAREAS COMPLETADAS" con las 5 últimas entradas, compactas (`T-18: título`), **tachadas** (código ANSI de tachado) y con la fecha sin tachar; las descartadas marcadas con ✖. `history.md` ahora también se vigila y se lee (opcional, como `backlog.md`).
  - `handoff.md` — en detalle: la tarea en progreso con su plan y cada subsección (`Qué falta`, `Próximo paso`, etc., con el título tal como está escrito), y cada pausada con todos sus campos.
  - `backlog.md` — compacto (`T-N: título`); en las bloqueadas, debajo, las tareas que menciona su motivo (`→ espera T-3: título`), con aviso si esa tarea ya está cerrada en `history.md` (pista para la Regla 7).
- **Atajos** en terminal interactiva: `q` / Ctrl+C salen, `r` redibuja. Sin terminal interactiva o con `--once`, no se activan.
- **Documentación:** `scripts/task-tracker/README.md` (uso, rutas, atajos, qué lee y cómo, avisos frecuentes), mención en el `README.md` raíz y en `docs/architecture.md`; en `src/docs/template-architecture.md` se documentó el formato de `history.md` que lee el script (entradas `## <fecha> — ✅|❌ [Tarea N —] título`, nuevas arriba, sin anclas).
- **Versión `1.1.0`** en `package.json` (bump minor acordado en la Tarea 9: anclas + script). El tag `v1.1.0` y el release en GitHub van después del merge a `main`, que decide el operador.
- Verificación: `bun test` → 92 tests en 17 archivos, todos pasan (5 corridas); `bun run typecheck` sin errores; la salida contra este repo coincide con el diseño acordado.
- Decisiones del operador: el prompt de normalización se sacó a la Tarea 19 (`[postergada]` hasta que el operador confirme el MVP del script); no hay vista alternable (por eso no hay atajo `d`); "completadas" incluye las descartadas; los guiones bajos del nombre del repo no se convierten.
- Las dependencias de una bloqueada se muestran para cualquier tag cuyo motivo mencione tareas, no solo `[dependencia]`, porque el nombre del tag se traduce según el idioma.
- Tarea nueva surgida: la 20 (sección "Estructura del repositorio" del `README.md` raíz, desactualizada desde antes).
- Al revisar las bloqueadas (Regla 7): la Tarea 4 sigue esperando a la 3; la 19 sigue postergada hasta que el operador confirme el MVP.

## 2026-10-05 — ✅ Tarea 18 — Migrar a TypeScript

- `scripts/task-tracker/` (código y tests, 32 archivos) pasó de JavaScript a TypeScript con `git mv`, imports con extensión `.ts`. Bun ejecuta `.ts` sin compilar; `"tasks"` apunta ahora a `index.ts`. Revierte la decisión de la Tarea 10 de usar JavaScript.
- Configuración en la raíz: `tsconfig.json` (la recomendada por Bun, con `strict: true`, sobre `scripts/**/*.ts`), `typescript` y `@types/bun` en `devDependencies`, y script `bun run typecheck` (`tsc --noEmit`). Por qué el chequeo: Bun ejecuta TypeScript **sin revisar tipos**, así que sin `tsc` los errores de tipos pasarían desapercibidos.
- Tipos: los tipos que vivían en comentarios JSDoc pasaron a TypeScript; los compartidos (tarea, grupo, sección, modelo, resultados de lectura y de rutas) quedaron en `src/shared/types.ts`. Sin `any` ni aserciones `!`. Ningún error de `tsc` apuntó a un bug real: todos eran de tipos (anotaciones faltantes, comprobaciones de `null` que TypeScript no deducía).
- Se unificó la función de hora que había quedado duplicada en la Tarea 14: ahora vive en `src/shared/time.ts`, así `io/` no depende de `ui/`.
- Verificación: `bun test` → 64 tests, todos pasan (5 corridas); `bun run typecheck` sin errores; `bun run tasks . --once` contra este repo muestra la tarea en curso; ruta inexistente → código 1. Comparando textos y regex con la versión JavaScript, solo cambian tipos, comentarios y la unificación de la hora.
- Decisiones del operador: `strict: true`; chequeo de tipos; TypeScript por defecto para los scripts nuevos de `scripts/` (regla nueva en `rules.md`, junto con que `bun run typecheck` tiene que pasar igual que `bun test`). Se actualizó también `docs/architecture.md`.
- Sugerencia que quedó sin aplicar: activar `noUncheckedIndexedAccess` (más seguro con los accesos por índice y los grupos de regex, a costa de varios chequeos más).
- El operador decidió no hacer la revisión que `gentle-ai` propuso sobre las Tareas 17 y 14 (~3100 líneas, mayormente archivos movidos); el rechazo quedó registrado en `gentle-ai`.
- Al revisar las bloqueadas (Regla 7): ninguna dependía de esta tarea.

## 2026-10-05 — ✅ Tarea 14 — Estructuración del script de seguimiento de tareas

- Refactor puro de `scripts/task-tracker/`, con la estructura acordada con el operador: `index.js` queda solo como arranque; `src/app.js` (ciclo leer → modelo → pintar, watcher, Ctrl+C); `src/cli/` (argumentos, pregunta de la ruta); `src/io/` (rutas, lectura, watcher, lectura con memoria); `src/parse/` (`parser.js` de ~300 líneas dividido en markdown, secciones, bloques, handoff y backlog); `src/model/` (`blockInfo` separado de `buildModel`); `src/ui/` (render y utilidades de formato).
- Tests en espejo dentro de `test/` (`io/`, `parse/`, `model/`, `ui/`, `e2e/`), con las mismas aserciones: 64 tests, todos pasan, ahora en 14 archivos. Archivos movidos con `git mv` para conservar su historial.
- Verificación de que fue solo un movimiento: comparando las líneas de lógica antes y después, solo cambian los dos envoltorios nuevos (`parseArgs`, `startApp`) y el nombre de una variable (`args` → `argv`).
- Decisiones del operador: tests en espejo (no junto al código); `parse/` queda dentro de `task-tracker/` — si se comparte con otro script se decide al hacer la Tarea 15.
- Pendiente menor: `snapshot.js` tiene una función de formato de hora idéntica a `formatTime` de `ui/format.js`; no se unificó para no salir del refactor puro.
- Se actualizó el árbol de `scripts/task-tracker/` en `docs/architecture.md`.
- Se creó además la Tarea 18 (Migrar a TypeScript), a pedido del operador.
- Al revisar las bloqueadas (Regla 7): la Tarea 11 dependía de esta tarea → movida a "Tareas libres" con su bloqueo marcado como resuelto.

## 2026-10-05 — ✅ Tarea 17 — Corregir observaciones de la segunda revisión del script

- **Tag de bloqueo:** `blockInfo` solo acepta el tag con el que **empieza** el valor de un campo (con o sin backticks); los tags en medio del texto se ignoran, así un `[algo]` dentro de `Descripción` ya no se toma como bloqueo ni oculta el aviso "sin bloqueo vigente". Convención ajustada en `src/docs/template-architecture.md` y en el campo `Bloqueos` de `src/template/agents/backlog.md` ("el valor empieza con la etiqueta del motivo"). Todos los `Bloqueos` de este backlog ya cumplían.
- **Motivo:** la etiqueta final tipo "Antes:" se recorta solo cuando hay historial después; un motivo que termina en "ver:" queda intacto.
- **Primera lectura:** `src/snapshot.js` reintenta una vez un archivo que todavía no se leyó bien, solo en la primera lectura de la sesión (si el tracker arranca justo mientras un agente lo reescribe); en lecturas posteriores no, para no sumar 300 ms a cada redibujo del set mínimo.
- **Tests de `watchDir`:** sin esperas fijas para lo que puede fallar por lentitud — esperan en bucle con tope, "calientan" el watcher antes de medir y comprueban que otro archivo no avisa usando un `handoff.md` marcador.
- Verificación: `bun test` → 64 tests, todos pasan, en 9 corridas seguidas (6 del agente que implementó + 3 de revisión).
- Al revisar las bloqueadas (Regla 7): la Tarea 14 dependía de esta tarea → movida a "Tareas libres" con su bloqueo marcado como resuelto. La Tarea 11 sigue bloqueada por la 14.

## 2026-10-05 — ✅ Tarea 16 — Segunda revisión de código de la rama `feat/task-tracker`

- Revisión de lo sumado desde la revisión de la Tarea 12 (sobre todo la Tarea 13, `95382d7`; ~490 líneas), pedida por el operador después de que `gentle-ai review assess` volviera a marcar riesgo medio con el presupuesto del slice superado. Revisión nativa de `gentle-ai` (lente `review-reliability`) con consentimiento del operador.
- Resultado: **aprobada** y confirmada (`review-5dffdeca0adb3fba`). Sin hallazgos bloqueantes; 4 observaciones no bloqueantes, todas resueltas en la Tarea 17:
  - (WARNING, resuelta en la Tarea 17) `blockInfo` recorre los campos en orden y toma el primer tag de cada uno: un `[algo]` sin backticks (que no sea link) en un campo anterior a `Bloqueos` (ej. `Descripción`) se toma como tag de bloqueo en lugar del real, y puede ocultar el aviso "sin bloqueo vigente". El código anterior priorizaba los tags con backticks en todos los campos.
  - (SUGGESTION) El recorte de una etiqueta final tipo `Antes:` en el motivo se aplica siempre, aunque no haya historial: un motivo que termina en `ver:` pierde esa palabra. Aplicarlo solo cuando hay historial.
  - (SUGGESTION) Un archivo que nunca se leyó bien no se reintenta: si el tracker arranca justo mientras un agente reescribe `handoff.md` (o está trabado), muestra vacío/error hasta el próximo evento. Antes sí se reintentaba en la primera lectura.
  - (SUGGESTION) Los tests de `watchDir` usan esperas fijas (100 ms / 600 ms); en una máquina cargada podrían fallar de forma intermitente. Mejor esperar en bucle hasta que se cumpla la condición, con un tope.
- Se creó y se tomó en el momento, así que no pasó por la lista del backlog (número asignado con el contador).

## 2026-10-05 — ✅ Tarea 13 — Corregir observaciones de la revisión del script

- **Tag de bloqueo viejo:** `blockInfo` (`scripts/task-tracker/src/model.js`) ahora mira solo el primer tag de cada campo; si es `[Resuelto…]`, el campo entero es historial y se salta. Nuevo aviso en pantalla para una tarea en "bloqueadas" sin bloqueo vigente (candidata a volver a libres, Regla 7). Convención nueva para una tarea que se vuelve a bloquear: el bloqueo vigente va primero y el historial resuelto después — documentada en `src/docs/template-architecture.md` (viñeta "Tag de bloqueo") y en el campo `Bloqueos` de `src/template/agents/backlog.md`, sin tocar las Reglas por defecto. Ya aplicada en este backlog a la Tarea 11.
- **Lectura con memoria:** nuevo `src/snapshot.js`, que trata igual a `handoff.md` y `backlog.md`: si falla la lectura de un archivo que ya se leyó bien (no existe, vacío, EBUSY/EPERM), reintenta a los 300 ms y, si sigue fallando, muestra la última versión buena con un aviso que dice de qué hora es. La nota del set mínimo solo aparece si `backlog.md` nunca existió en la sesión. `index.js` dejó de tener su reintento propio.
- **Tests faltantes:** `watchDir` (una ráfaga de escrituras da un solo aviso; otros archivos se ignoran), precedencia de `invocationDir`, el lector con memoria (con lecturas simuladas) y el script entero con `Bun.spawn` (`--once`, ruta inválida, sin argumento ni datos de entrada). `bun test`: 60 tests en 7 archivos, todos pasan; se corrió 6 veces seguidas sin fallos intermitentes.
- Prueba manual: borrar `backlog.md` mientras el script vigilaba una copia de `docs/agents/` mostró la última versión con el aviso, y al restaurarlo volvió a la normalidad.
- Incidente: para cortar esa prueba en segundo plano se usó `taskkill /F /IM bun.exe`, que cierra **todos** los procesos de Bun de la máquina, no solo el de la prueba. Avisado al operador; en adelante, cortar solo el proceso propio.
- Al revisar las bloqueadas (Regla 7): la Tarea 14 dependía de esta tarea → movida a "Tareas libres" con su bloqueo marcado como resuelto. La Tarea 11 sigue bloqueada por la 14.

## 2026-10-05 — ✅ Tarea 12 — Revisión de código de la rama `feat/task-tracker`

- Revisión de los commits de las Tareas 9 y 10 contra `main` (28 archivos, ~1450 líneas), pedida por el operador después de que `gentle-ai review assess` marcara la rama como riesgo medio con el presupuesto del slice superado. Se corrió la revisión nativa de `gentle-ai` (lente `review-reliability`) con consentimiento del operador.
- Resultado: **aprobada** y confirmada (`review-9c41ddb06aa2357c`). Sin hallazgos bloqueantes; 3 observaciones no bloqueantes (2 WARNING, 1 SUGGESTION) que se anotaron en la Tarea 11 para evaluarlas al armar su plan: tag de bloqueo resuelto en `blockInfo`, reintento de lectura solo para `handoff.md`, y falta de tests del punto de entrada y del watcher.
- Se creó y se tomó en el momento, así que no pasó por la lista del backlog (número asignado con el contador).

## 2026-10-05 — ✅ Tarea 10 — Crear script funcional de seguimiento de tareas

- Se creó `scripts/task-tracker/` (JavaScript, Bun): vigila el `docs/agents/` de un proyecto y redibuja en la terminal la tarea en progreso (con el avance del plan y el próximo paso), las pausadas, las libres (y sus grupos) y las bloqueadas (con su tag `[dependencia]`/`[postergada]`) cada vez que cambian `handoff.md` o `backlog.md`. Separado por responsabilidad: `index.js` (entrada), `src/reader.js` (ubicar la carpeta, leer, vigilar con debounce), `src/parser.js` (markdown → estructura, independiente del idioma), `src/model.js` (procesamiento) y `src/render.js` (pintado con `picocolors`).
- Se lanza desde la raíz con `bun run tasks [ruta]`: sin ruta, la pregunta al arrancar; acepta la raíz del proyecto (busca `docs/agents/` o `agent-context/agents/`) o la carpeta directa; `--once` pinta una vez y sale. Cada instancia es independiente, así que se puede correr una por proyecto en paralelo; el título de la ventana muestra el nombre del proyecto.
- Ubica las secciones por las anclas de la Tarea 9, con plan B por orden de `##` (avisado en pantalla) para docs que todavía no las tienen. `backlog.md` es opcional (set mínimo).
- Dependencias en la raíz, no por script: `picocolors` en `devDependencies` del `package.json` raíz (que además pasó a `"type": "module"` y suma los scripts `tasks` y `test`), `bun.lock` commiteado y `node_modules/` en `.gitignore`. Por qué: `package.json` es `private` y lo que se distribuye es `src/`, así que las dependencias de las herramientas no viajan con el skill; un futuro script (ej. empaquetar `src/template` en `.zip`) suma su dependencia al mismo archivo.
- Verificación: `bun test` → 41 tests en 4 archivos, todos pasan (fixtures en español con anclas, en inglés sin anclas, solo `handoff.md`, CRLF, resolución de rutas). Prueba manual contra este repo: detecta la tarea en curso y el plan real.
- Se actualizaron `docs/agents/rules.md` (el skill en `src/` sigue siendo markdown puro; `scripts/` son herramientas del repo; dependencias solo en `devDependencies` raíz) y `docs/architecture.md` (carpeta `scripts/`). En `src/docs/template-architecture.md` se precisó cómo se detecta la tarea en progreso (solo antes de la primera subsección `###`), alineándolo con el código.
- Hallazgo: `bun run` (Bun 1.4.2) cambia el cwd a la raíz del package y no define `INIT_CWD`; la carpeta de invocación queda en `npm_config_local_prefix`, que es la que se usa para resolver rutas relativas.
- Al revisar las bloqueadas (Regla 7): la Tarea 11 dependía de esta tarea → movida a "Tareas libres" con su bloqueo marcado como resuelto.

## 2026-10-05 — ✅ Tarea 9 — Preparación para el script de seguimiento de tareas

- Se agregaron **anclas de sección** (`<!-- agent-context-kit:section=<id> -->`) antes de cada sección de tareas: `free`, `blocked`, `grouped` en `backlog.md` e `in-progress`, `paused` en `handoff.md`, tanto en las plantillas de `src/template/agents/` como en los `docs/agents/` de este repo. Cada archivo lleva una nota corta: son comentarios de máquina, no se traducen ni se borran, y en `handoff.md` se reescriben en cada sobrescritura.
- La fuente de verdad del mecanismo quedó en `src/docs/template-architecture.md` (sección "Anclas de sección"); `questions-flow.md` (flujo de proyecto existente) y `migration-flow.md` (al migrar y con firma presente) solo lo mencionan y enlazan, e indican que el agente agrega las anclas si faltan (auto-curación).
- Se normalizó `docs/agents/backlog.md` de este repo de `## Tarea N` a `### Tarea N`, como dice la plantilla. Se corrigió además el ejemplo comentado de `src/template/agents/backlog.md`, que decía `## Tarea [N]` mientras los placeholders reales usan `### Tarea [N]` — origen probable del desvío.
- Por qué: el script de seguimiento de tareas (Tarea 10, `scripts/task-tracker/`) necesita ubicar las secciones sin depender del idioma — por la Regla 3 los headers se redactan en el idioma de cada proyecto, así que buscar "Tareas libres" literal no funciona en un repo en inglés. Se usó el mismo prefijo que la firma `agent-context-kit:signature`.
- Decisiones del operador: sin ancla para la línea `**Tarea:**` (la tarea en progreso es la primera `Tarea N` dentro de `in-progress`); el bump minor (`1.1.0`) se hace al cerrar la Tarea 11; se trabaja en la rama `feat/task-tracker`.
- Al revisar las bloqueadas (Regla 7): la Tarea 10 dependía de esta tarea → movida a "Tareas libres" con su bloqueo marcado como resuelto.

## 2026-09-26 — ✅ Agregar sección "Qué es este proyecto" al README generado

- Se identificó un hueco real en el catálogo: ningún archivo cubría "qué es este proyecto" (ej. ecommerce, API REST) — `project/architecture.md` es estructura de carpetas y filosofía de organización, no eso.
- Se agregó esa sección como primer bloque de `template/README.md` (guía de generación del `docs/README.md` real). Se pregunta una sola vez, la primera vez que se genera el archivo (o si existe pero no tiene la sección), y se preserva tal cual en corridas futuras.
- Se documentó el paso en `questions-flow.md` (Ronda final, paso 1) y en `template-architecture.md`.
- Se reordenó `template/AGENTS.md` para que apunte primero a `docs/README.md` (qué es el proyecto + índice), antes de `agents/rules.md` y `agents/handoff.md`.
- Se detectó redundancia: `template/README.md` tenía su propia sección "Empezar acá" con el mismo orden de lectura que ya dicta `AGENTS.md`. Se sacó esa sección — el README queda como índice puro (qué es el proyecto + qué archivo cubre qué tema), sin repetir instrucciones de orden.

## 2026-09-26 — ✅ Tarea 8 — Agregar punto de partida AGENTS.md y CLAUDE.md

- Se detectó el bug real: la "Ronda final" de `questions-flow.md` excluía explícitamente al set mínimo (tarea puntual/testear) del paso que asegura el puntero raíz. Como el set mínimo solo copia `agents/rules.md` y `agents/handoff.md`, un agente genérico que abriera el repo después no tenía forma de encontrar esa documentación sin invocar el skill de nuevo.
- Se agregaron `template/AGENTS.md` y `template/CLAUDE.md` al catálogo (en vez de redactar el párrafo puntero ad-hoc que solo vivía como ejemplo en `docs/desing.md`). `AGENTS.md` es la fuente de verdad (dice qué leer primero); `CLAUDE.md` nunca duplica ese contenido, solo redirige a `AGENTS.md`. Ambos llevan la sección delimitada `<!-- agent-docs-skill:start/end -->` para agregarse sin sobrescribir si el archivo ya existe con contenido propio del operador.
- Se actualizó `questions-flow.md` (Ronda final, pasos 3-4 y las dos tablas resumen) para que ambos punteros se aseguren siempre, en cualquier set incluido el mínimo — solo el `README.md` generado sigue exclusivo de los sets intermedio/completo.
- Se documentó el nuevo par de plantillas en `template-architecture.md`.
- Dogfooding: se actualizó el `CLAUDE.md` raíz de este mismo repo para que redirija a `AGENTS.md` en vez de duplicar su contenido.

## 2026-09-25 — ✅ Tarea 7 — Resolver el caso de un backlog muy grande

- Se agregó un mecanismo de agrupamiento a "Tareas libres" de `backlog.md` (Regla 7 de `rules.md` extendida): si esa sección supera las 15 tareas, se evalúan agrupar 2 o más que compartan un objetivo real. El criterio no es un tope de cantidad — es que el grupo entero quepa en una sola frase de objetivo compartido, sin usar "y" para forzar una tarea que en realidad no pertenece.
- Un grupo aparece en "Tareas libres" como una sola línea corta (resumen + tareas que lo componen); el detalle completo se mueve a una sección nueva, "Tareas agrupadas", que no hace falta leer salvo que el operador pida el detalle de una tarea puntual o se vaya a tomar una — el objetivo es reducir lo que hay que leer para ver qué está disponible, sin perder ningún dato.
- Si un grupo queda con una sola tarea (las demás se tomaron o cerraron), se desarma y esa tarea vuelve a ser una entrada individual normal.
- Se descartó la alternativa de mover tareas concretas a `roadmap.md` agrupadas — invertía la definición ya establecida de `roadmap.md` (visión sin desglosar que "gradúa" hacia `backlog.md`, no al revés) y, además, no resolvía el problema real: agrupar por sí solo no reduce el tamaño del archivo si el detalle sigue estando ahí completo.
- Cambios aplicados al catálogo maestro (`src/template/agents/rules.md`, `backlog.md`) y propagados a `src/docs/template-architecture.md` y al dogfooding de este repo (`docs/agents/rules.md`, `backlog.md`) — sin formar ningún grupo todavía, porque "Tareas libres" tiene solo 2 tareas, bien por debajo del umbral.
- Por qué: el disparador fue notar que `backlog.md` podía volverse largo e incómodo de leer/navegar a medida que crece. Agrupar por objetivo compartido, con el detalle diferido, resuelve eso sin perder información ni forzar una reestructuración más grande (varios archivos, paginado) que el proyecto no necesita todavía.

## 2026-09-24 — ✅ Tarea 6 — Definir el término "operador" en la documentación

- Se agregó una definición corta de "operador" (blockquote, justo después del título) a `template/agents/rules.md` y a `docs/agents/rules.md` (dogfooding de este repo): "la persona humana dueña de este proyecto — quien pide las tareas, aprueba decisiones y a quien se le pregunta cuando algo no está definido".
- Decisión sobre dónde vivir: no se creó un glosario nuevo del kit — se puso en `rules.md` porque es el único archivo garantizado en cualquier alcance (Mínimo/Intermedio/Completo, según `questions-flow.md`), así que la definición siempre está presente sin fragmentar el catálogo por un solo término.
- Por qué: "operador" se usa extensamente en todo el catálogo (`rules.md`, `backlog.md`, `handoff.md`, etc.) sin definirse en ningún lado — detectado al debatir la Tarea 5, cuyo propio texto lo daba por sentado.

## 2026-09-24 — ✅ Bump a `v1.0.0`

- Se bumpeó `package.json` de `0.3.1` a `1.0.0`, aplicando el criterio de bump **major** ya fijado en `rules.md` (esta tarea renombró `template/agents/changelog.md` → `history.md`, referenciado desde `questions-flow.md`, y cambió la estructura generada en `docs/agents`).
- Decisión explícita del operador: saltar directo a `1.0.0` en vez de `0.4.0`, aunque la Tarea 1 (probar el flujo end-to-end sobre un repo real) sigue sin resolverse — la razón original para arrancar en `0.1.0` y no en `1.0.0` (ver entrada del 2026-09-22 "Versionar el proyecto") quedó superada por esta decisión puntual, no derogada como criterio general.
- Por qué: el operador priorizó reflejar en el número de versión que el catálogo tuvo un cambio estructural real (bump major), en vez de seguir la lectura convencional de SemVer 0.x de tratar todo como pre-estable hasta validar end-to-end.
- Se creó el tag `v1.0.0` y el [GitHub Release](https://github.com/Gersom/agent-context-kit/releases/tag/v1.0.0) correspondiente, con notas que resumen todos los cambios desde `v0.3.1` (última versión con release publicado).

## 2026-09-24 — ✅ Tarea 5 — Contemplación de nuevos flujos y estados de tareas

- Se rediseñó el ciclo de vida de las tareas de `agents/`, que antes solo contemplaba "pendiente" (en `backlog.md`) y "cerrada" (en `changelog.md`):
  - **Descartada:** se renombró `changelog.md` → `history.md` (bump **major**, ver criterio en `rules.md`) y se redefinió su alcance para cubrir tareas resueltas en general, marcando cada entrada como ✅ Hecha o ❌ Descartada. El número de tarea se conserva igual en ambos casos.
  - **Pausada:** `handoff.md` pasó de tener una única sección ("Tarea actual") a dos: "Tarea en progreso" (una sola, activa) y "Tareas pausadas" (lista, cada una con motivo de pausa y qué espera para retomarse).
  - **Bloqueada / pospuesta:** `backlog.md` se dividió en "Tareas libres" y "Tareas bloqueadas / pospuestas", con el campo `Bloqueos` etiquetado `[dependencia]` (no se puede empezar) o `[postergada]` (se podría, pero conviene esperar), un campo nuevo `Desbloquea` para link bidireccional, y la convención de no borrar `Bloqueos` al resolverse sino marcarlo `[Resuelto el <fecha>]` conservando el motivo original.
- Se agregaron tres reglas por defecto nuevas a `rules.md` (Reglas 6, 7 y 8): `handoff.md` se actualiza en cada paso de un plan (no solo al cerrar la tarea) para dar continuidad entre sesiones/chats; el último paso de todo plan mediano/grande es "documentar cierre de tarea", que incluye revisar todas las tareas bloqueadas del backlog por si alguna dejó de estarlo; y un formato fijo de reporte de cierre en el chat (resueltas / descartadas / desbloqueadas / nuevas).
- Al revisar las bloqueadas de este mismo backlog (Regla 7) se encontraron dos que ya no aplicaban: el bloqueo de la Tarea 3 (esperaba que `SKILL.md` y `template/` estuvieran terminados — lo estaban desde el 2026-09-22) y el de la Tarea 7 (esperaba que esta misma Tarea 5 se cerrara). Ambas se movieron a "Tareas libres".
- Todos los cambios se aplicaron primero al catálogo maestro (`src/template/agents/`) y se propagaron a la documentación auxiliar que lo referencia (`template-architecture.md`, `questions-flow.md`, `SKILL.md`, `migration-flow.md`, `template/README.md`, `decisions.md`, `known-issues.md`) y recién después al dogfooding de este mismo repo (`docs/agents/`), incluyendo este archivo — `docs/desing.md` quedó intencionalmente sin tocar por ser registro histórico, no spec vigente.
- Por qué: el disparador concreto fue notar que no había forma de descartar una tarea evaluada sin perder su número y el motivo del descarte — evitando que se re-proponga sin ver por qué se rechazó antes. Al debatirlo con el operador surgieron los otros dos casos (pausada, bloqueada/pospuesta) como huecos reales del mismo ciclo de vida, no solo el caso puntual del descarte.

## 2026-09-24 — ✅ Dos reglas por defecto nuevas + `docs/agents/rules.md` de este repo

- Se agregaron dos reglas fijas nuevas a `template/agents/rules.md` (reglas 4 y 5, después de la de numeración/idioma agregadas antes):
  - **Regla 4 — El código es la fuente de verdad:** ante un conflicto entre esta documentación y lo que el código realmente hace, gana el código, salvo que el operador diga explícitamente lo contrario.
  - **Regla 5 — Mínimo al cerrar una tarea:** `handoff.md`, `backlog.md` y `changelog.md` se actualizan siempre como mínimo (sobrescribir handoff, agregar entrada a changelog, sacar/agregar items en backlog según corresponda), sin importar qué otro archivo también haya cambiado.
- Se creó `docs/agents/rules.md` para este mismo repo (no existía todavía, aunque el resto de `docs/agents/` sí) — con las 5 reglas por defecto ya vigentes, `Idioma de la documentación: Español`, y reglas específicas del proyecto (versionado SemVer + criterio de bump, qué no tocar sin autorización, decisiones no negociables ya tomadas).
- Se actualizaron los punteros raíz `CLAUDE.md`/`AGENTS.md` para que remitan también a `rules.md`, no solo a `handoff.md`. Se agregó `docs/agents/` (con sus 4 archivos) al árbol de `docs/architecture.md`, que no lo tenía listado.
- Por qué: pedido directo del operador — formalizar dos convenciones que ya se venían aplicando implícitamente (seguir el código cuando la doc queda desactualizada; no dejar `handoff`/`backlog`/`changelog` sin tocar al cerrar algo) como reglas explícitas del catálogo, y completar el dogfooding de este repo con su propio `rules.md`.

## 2026-09-24 — ✅ Tarea 2 — Soporte multi-idioma

- Se agregó un paso nuevo en `questions-flow.md` ("Idioma de la documentación"), que corre siempre antes que cualquier otra cosa: detecta `IDIOMA` a partir del texto disponible del operador en la conversación actual (puede ser solo la frase de invocación, si es un chat nuevo sin más historial), y si es ambiguo, pregunta explícitamente en inglés.
- Todo el contenido redactado por el agente (prosa y headers de sección) va en `IDIOMA`, con excepción de los nombres de archivo del catálogo (siempre en inglés) y términos propios del kit o jerga técnica sin traducción natural asentada (ej. "Handoff", "Backlog", "Placeholder", "linter", "commit", "deploy"), que se mantienen en inglés.
- `IDIOMA` se persiste en `agents/rules.md` (nueva regla fija #3 + campo) la primera vez que se detecta, para que sesiones futuras no lo vuelvan a preguntar. Se actualizó la descripción de `rules.md` en `src/docs/template-architecture.md` en consecuencia.
- Se descartaron las alternativas de mantener plantillas duplicadas por idioma (carpetas `template/es/`+`template/en/`, o archivos `doc.en.md` al estilo Docusaurus): el catálogo ya no se copia literal, el agente redacta el contenido real por proyecto, así que duplicar la estructura por idioma solo agregaba riesgo de desincronización sin beneficio real.
- Por qué: el catálogo estaba escrito enteramente en español, lo que no encaja si el operador (u otro que use el skill) trabaja en otro idioma — la documentación de contexto debe ser legible para quien la usa, no solo para quien construyó la plantilla.

## 2026-09-22 — ✅ Sección "Comandos" en `template/project/setup.md`

- Se investigaron proyectos parecidos (Cline Memory Bank, `agent-markdown-memory-bank-protocol`, la spec de AGENTS.md, y el template `agentic-repository-engineering-template`) para comparar nuestro catálogo de `template/`. Conclusión: la estructura actual (backlog/handoff/changelog separados, puntero `CLAUDE.md`/`AGENTS.md`) es más granular que Cline y más proporcionada que templates tipo SDLC completo — no ameritaba una reestructuración grande.
- Se detectó un hueco real: la spec de AGENTS.md marca explícitamente "build commands with exact flags, test procedures" como contenido esperado de primera línea, y ningún archivo nuestro cubría comandos de build/lint/typecheck (solo `testing.md` cubre tests, y `setup.md` solo cubría "cómo levantar el proyecto").
- Se agregó la sección "Comandos" al inicio de `template/project/setup.md` (dev, build, lint, typecheck), sin crear un archivo nuevo — mantiene la proporción del catálogo actual. Se actualizó la descripción de `setup.md` en `src/docs/template-architecture.md` en consecuencia.
- Por qué: un agente necesita estos comandos durante la tarea, no solo al levantar el proyecto por primera vez — dejarlos implícitos en un `README.md` del proyecto (si existe) obliga a adivinar o buscar.

## 2026-09-22 — ✅ Invocación explícita del skill ("usa agent-context-kit...")

- Se agregó la sección "Cómo usar" al `README.md` raíz: dos frases de invocación explícita — "usa la skill agent-context-kit" (detección automática normal) y "...y migra mi proyecto" (fuerza el chequeo de migración).
- Se enganchó de verdad en `migration-flow.md` (nueva sección "Intención explícita del operador"): la intención explícita reemplaza el umbral de "proporción significativa" de la heurística de nombres — si el operador pide migrar, el flujo se dispara igual aunque haya pocas o ninguna coincidencia automática, y en ese caso se le pregunta a mano qué migrar en vez de asumir que no hay nada.
- Se agregó una mención breve en `SKILL.md` ("Cuándo se dispara") apuntando a esta sección del README, sin duplicar el detalle.
- De paso, se corrigió un link roto en `README.md` que todavía apuntaba a `agent-context-kit-diseno.md` (renombrado hace varios commits a `docs/desing.md`).
- Por qué: sin esto, la frase "migra mi proyecto" hubiera quedado documentada mostrando una funcionalidad que en la práctica no existía en el flujo — la heurística automática podía no alcanzar el umbral y simplemente no dispararse, sin forma de que el operador la forzara.

## 2026-09-22 — ✅ Firma opcional en `handoff.md` para `migration-flow.md`

- Se agregó un comentario HTML de firma (`agent-context-kit:signature`) al inicio de `template/agents/handoff.md`, marcado explícitamente como "ignorar al leer/actualizar, no es contenido".
- Se integró en `migration-flow.md` como señal de alta prioridad: si un archivo candidato a `handoff.md` durante la migración ya tiene esta firma, no se trata como sistema distinto a migrar — se asume que ya es de este skill (aunque la estructura de carpetas no calce exactamente) y se va directo al flujo de proyecto existente.
- Decisión explícita con el operador: **opcional, no obligatoria**. Su ausencia no descarta nada (un `handoff.md` de este skill sin la firma sigue siendo válido, solo se sigue con la heurística de nombre normal) — evita tener que retrofitear archivos ya generados (incluidos los de este mismo repo, que no la tienen).
- Por qué: la heurística de nombre de `migration-flow.md` puede confundir un `handoff.md` ya generado por este skill con uno de un sistema distinto que casualmente usa el mismo nombre; la firma resuelve esa ambigüedad cuando está presente.

## 2026-09-22 — ✅ Flujo de migración desde otro sistema de documentación

- Se creó `src/docs/migration-flow.md`: se dispara cuando `docs/agents/`+`docs/project/` no existen pero el `docs/` del repo destino tiene archivos cuyo nombre matchea el catálogo de este skill (tabla de heurística por patrón de nombre — `backlog`, `handoff`, `stack`, `entities`, etc. — construida sobre la estructura de referencia real de la sección 6 de `docs/desing.md`).
- Decisiones tomadas (con el operador, antes de escribir el flujo):
  - Archivos sin equivalente claro en la skill (ej. `idempotency.md`, `production-watch.md`) van a una carpeta nueva `docs/others/`, sin transformar, tal cual estaban — no se fuerzan a encajar en un template que no les corresponde.
  - El `docs/` viejo se resguarda completo en `docs-legacy/` antes de tocar nada, y **no se borra automáticamente** — queda como respaldo hasta que el operador lo borre a mano.
  - Los archivos que sí mapean se transforman (no solo se renombran) para encajar en la plantilla correspondiente de `template/`, conservando toda la información original.
  - Antes de mover o escribir nada, se muestra al operador la tabla de mapeo propuesta (incluyendo fusiones, ej. `stack-backend.md` + `stack-frontend.md` → `stack.md`) para confirmar.
- Se enganchó el flujo desde `questions-flow.md` (nueva rama en la detección automática, antes del chequeo de `ALCANCE`), `SKILL.md` (punto 1 y sección de enlaces) y `docs/architecture.md` (árbol + descripción). Se agregó la sección condicional "Otros (`others/`)" a `template/README.md` para cuando la migración genera esa carpeta.
- Por qué: el operador tiene otros proyectos con sistemas de documentación propios o parecidos al de este skill; sin este flujo, esa documentación se hubiera perdido o quedado duplicada sin usar en `agent-context/` en vez de reusarse.
- Con esto, `docs/agents/backlog.md` queda vacío — no hay más items pendientes identificados por ahora.

## 2026-09-22 — ✅ Generar GitHub Release de `v0.1.0`

- Se decidió el proceso: manual (`gh release create` al cortar un tag), con notas redactadas a mano resumiendo `docs/agents/changelog.md` — no se automatiza con GitHub Actions por ahora, porque los releases van a ser poco frecuentes y esto es un repo de documentación, no software que se despliegue por CI.
- Se creó el release [`v0.1.0`](https://github.com/Gersom/agent-context-kit/releases/tag/v0.1.0) sobre el tag ya pusheado.
- Por qué: para que un repo destino pueda ver de un vistazo qué cambió entre versiones sin tener que leer `git log`.

## 2026-09-22 — ✅ Versionar el proyecto: `package.json` + SemVer + tags de git

- Se creó `package.json` en la raíz (`name`, `version: 0.1.0`, `description`, `private: true`, `repository`) como número de versión visible dentro del repo.
- Se define el esquema: SemVer, tag de git `vX.Y.Z` como fuente de verdad para que un repo destino se fije a una versión concreta. Criterio de bump — patch: fixes/ajustes de redacción en plantillas existentes; minor: contenido nuevo que no rompe nada (nueva plantilla, nueva rama del árbol de preguntas); major: cambios que rompen algo que un repo destino ya pudiera estar usando (mover/renombrar archivos de `template/` referenciados desde `questions-flow.md`, cambiar la estructura generada en `docs/agents`/`docs/project`).
- Versión inicial `0.1.0` y no `1.0.0`: aunque el catálogo de `template/` y `SKILL.md` ya están completos, el flujo todavía no se probó end-to-end sobre un repo real.
- Por qué: para que un repo destino pueda fijar/actualizar a una versión concreta del skill en vez de seguir `main` a ciegas.
- Queda pendiente como item de backlog aparte: "Generar GitHub Releases" (notas por versión) — esta tarea solo resolvió el esquema de versión + tags, no el proceso de release.

## 2026-09-22 — ✅ Redactar `external/_example-service.md` y `template/README.md` — catálogo de `template/` completo

- Se redactó `external/_example-service.md`: plantilla a duplicar/renombrar por integración, con secciones para qué se usa, cómo se integra, credenciales, límites/costos (con link a `plans/limits.md`/`plans/costs.md` en vez de duplicar), comportamiento ante fallos y documentación oficial.
- Se redactó `template/README.md`: guía de estructura/tono para el `docs/README.md` que el agente genera al final del flujo (no se copia literal), cubriendo todas las secciones posibles (`agents/`, `project/`, `external/`, `plans/`) con nota de qué es condicional.
- Por qué: eran los dos últimos archivos vacíos del catálogo de `template/`. Con esto queda completo: `agents/` (6 archivos), `project/` (8), `external/` (1 plantilla), `plans/` (5) y el `README.md` raíz — todo lo que falta ahora es lógica/proceso (versionado, migración), no contenido de plantillas.

## 2026-09-22 — ✅ Agregar `src/template/plans/tiers.md` (catálogo de planes)

- Se creó `template/plans/tiers.md`: catálogo de planes (nombre, para quién es, qué incluye a alto nivel, modelo de cobro, precio) separado de los números de cuota (`limits.md`) y del detalle de pasarelas (`payments.md`).
- Se recortó la sección "Modelo de facturación" de `payments.md` (quedaba redundante con el nuevo archivo) y se dejó un link a `tiers.md` en su lugar.
- Se actualizaron las referencias cruzadas: `plans/README.md` (índice), `src/docs/template-architecture.md` (árbol + descripción) y `src/docs/questions-flow.md` (lista de archivos que se copian al elegir la carpeta `plans/`).
- Por qué: al responder una pregunta del operador sobre dónde documentar planes tipo Free/Pro/Max, se detectó que no había un lugar único y obvio para el catálogo de planes — quedaba repartido de forma implícita entre `payments.md` y `limits.md`.

## 2026-09-22 — ✅ Redactar `src/template/project/*.md`

- Se redactaron los 8 archivos: `architecture.md`, `stack.md`, `entities.md`, `infrastructure.md`, `decisions.md` (formato ADR), `glossary.md`, `testing.md` y `setup.md`.
- Por qué: era el bloque más grande de plantillas vacías que quedaba. Con esto `template/project/` queda completo — solo faltan `external/_example-service.md` y `template/README.md` para terminar todo el catálogo de `template/`.

## 2026-09-22 — ✅ Redactar `src/template/plans/*.md`

- Se redactaron los 4 archivos: `README.md` (índice de la carpeta), `costs.md` (costos de operar el proyecto, por partida), `limits.md` (cuotas/rate limits/topes por plan) y `payments.md` (modelo de facturación, pasarelas y casos particulares).
- Por qué: con esto `template/plans/` queda completo — solo faltan `template/project/*`, `external/_example-service.md` y `template/README.md` para terminar todo el catálogo de `template/`.

## 2026-09-22 — ✅ Redactar `src/template/agents/roadmap.md`

- Se redactó la plantilla de `roadmap.md`: visión a mediano/largo plazo, con la distinción explícita frente a `backlog.md` (roadmap = iniciativas a nivel de visión, todavía sin desglosar; backlog = tareas ya concretas y accionables) y el criterio de cuándo una iniciativa "gradúa" de una a otra.
- Por qué: era el único archivo de `template/agents/` que seguía vacío — con esto esa carpeta queda completa.
- Se agregó además un nuevo item al backlog: "Flujo de migración desde otro sistema de documentación", para cubrir el caso en que el `docs/` de un repo destino ya tiene documentación de contexto pero con otro formato/convención (hoy solo se contempla "no existe" o "existe y es ajena → se usa `agent-context/`").

## 2026-09-22 — ✅ Redactar `src/SKILL.md`

- Se redactó el punto de entrada del skill: frontmatter (`name`/`description`) + trigger, flujo de alto nivel (detección automática → proyecto existente vs. scaffolding condicionado por alcance) y enlaces a `docs/questions-flow.md`, `docs/template-architecture.md` y `../docs/desing.md`, sin duplicar su contenido.
- Por qué: era el archivo más urgente del backlog — sin él el skill no tenía un punto de entrada real, solo la lógica de decisión (`questions-flow.md`) sin nada que la dispare.
- Se agregó además un nuevo item al backlog: "Versionar el skill y generar releases", para más adelante (una vez que `template/` esté completo).

## 2026-09-22 — ✅ Scaffolding de `docs/agents/` en la raíz del propio repo

- Se crearon `docs/agents/handoff.md`, `backlog.md` y `changelog.md` en la raíz de `agent-context-kit`, siguiendo el formato definido en `src/template/agents/`.
- Por qué: dogfooding — usar el propio skill para documentar el estado del proyecto que lo construye, en vez de depender solo de `docs/desing.md` (que es un registro histórico de diseño, no el estado actual).

## 2026-09-22 — ✅ Flesh out de `template/agents/handoff.md`, `backlog.md`, `changelog.md`

- Se redactó el contenido real (estructura + placeholders + instrucciones de uso) de estas tres plantillas.
- Por qué: eran de los últimos archivos de `agents/` sin contenido; hacían falta para poder usar el set mínimo/intermedio del flujo.

## 2026-09-22 — ✅ Flesh out de `questions-flow.md`, rename `example/` → `template/`, `rules.md`

- Se redactó el árbol de decisión completo (rondas 1 a 4 + ronda final) en `src/questions-flow.md`.
- Se renombró la carpeta `example/` a `template/` para reflejar mejor su rol (plantillas a copiar, no un ejemplo de referencia).
- Se agregó `template/agents/rules.md`.
- Por qué: era el corazón de la lógica del skill; sin esto no había forma de que un agente supiera qué preguntar ni qué copiar.

## 2026-09-21 — ✅ Scaffold de la estructura de archivos del skill bajo `src/`

- Se crearon (vacíos) `src/SKILL.md`, `src/questions-flow.md` y todo el árbol de `src/template/` (agents/, project/, external/, plans/).
- Por qué: fijar la estructura de carpetas acordada en el diseño antes de rellenar contenido.

## 2026-09-21 — ✅ Documentación inicial de diseño + `CLAUDE.md` raíz

- Se agregó `docs/desing.md` (documento de diseño completo) y `CLAUDE.md` en la raíz apuntando a él.
- Por qué: dejar registro de las decisiones tomadas en la conversación de diseño (nombre del proyecto, estructura, lógica de detección `docs/` vs `agent-context/`, flujo de preguntas) para no depender de la memoria de esa conversación.

## 2026-09-21 — ✅ README inicial del repo

- Se agregó `README.md` con la presentación del proyecto y su estructura general.

## 2026-09-21 — ✅ Documento de diseño inicial

- Primer commit del repo: borrador inicial de diseño de `agent-context-kit`.
