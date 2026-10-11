<!-- agent-context-kit:version 1.9.0 — versión de la skill con la que se generaron las Reglas por defecto de este archivo; ignorar al leer, no es contenido. Lo usa la skill para detectar versiones más nuevas (ver docs/version-check.md de la skill). -->
# Reglas del proyecto

## Reglas por defecto (fijas — no se editan por proyecto)

Vienen con el skill y aplican a cualquier proyecto; las reglas de proceso adicionales se agregan debajo, no en su reemplazo. Son fijas también en su plantilla (`template/agents/rules.md`, en el repo de la skill). Las Reglas 5 a 8 están al final, en "Al cerrar una tarea".

1. **Cada contenido vive en un único archivo, el de su tema** (una decisión en `decisions.md`, un bug en `known-issues.md`). Si otro archivo lo necesita, va una mención breve con link, no una copia.

2. **El tamaño de la tarea decide el proceso:**
   - **Pequeña o muy pequeña** → se ejecuta directo, sin plan.
   - **Mediana a grande** → primero un plan con los pasos; después, en una sola tanda de preguntas, preguntarle al operador (a) si los pasos están bien o hay que ajustarlos y (b) si prefiere ejecutarlos todos seguidos o uno a la vez, esperando su confirmación después de cada paso.
   - **Antes de actuar, de cualquier tamaño:** (a) *pedir no es autorizar*: una pregunta, investigación, explicación, revisión, comparación o proponer una solución es solo lectura, y no se edita ni se ejecuta ningún cambio hasta que el operador pida implementar; si la intención es ambigua, una sola aclaración y seguir en solo lectura. (b) *Explorar primero*: mirar el código y los requisitos relevantes, en proporción a la tarea, antes de proponer o escribir. (c) *Ante una duda real de producto*, una sola pregunta concreta y esperar la respuesta; no asumir.

3. **Idioma de la documentación:** todo lo que un agente redacte acá (prosa y headers) va en el idioma registrado abajo, detectado una sola vez al generar esta documentación; no se vuelve a preguntar. Siempre en inglés: nombres de archivo/carpeta del catálogo y términos del kit o jerga técnica sin traducción asentada ("Handoff", "Backlog", "Placeholder", "linter", "commit", "deploy").

   **Idioma de la documentación:** Español

4. **El código es la fuente de verdad.** Si un archivo de acá (`architecture.md`, `stack.md`, `entities.md`, etc.) contradice lo que el código hace, gana el código: seguirlo y corregir el archivo, salvo que el operador diga explícitamente lo contrario para ese caso.

9. **Commits coherentes:** cada commit representa un trabajo hecho. Una tarea puede tener varios; si toca varios módulos o también documentación, se separa por unidad coherente (ej. uno por módulo, otro para la documentación); si es chica, uno alcanza, a criterio del agente. Los commits del trabajo se hacen durante la tarea, a medida que cada unidad queda hecha. El título lleva el número de tarea como scope de Conventional Commits, `tipo(T-N): descripción` (ej. `feat(T-27): ocultar pausadas vacías`), también el de cierre (`docs(T-N): close task`); los commits esporádicos o extras van sin `(T-N)`. El commit de cierre pasa la tarea a completada (`handoff.md`, `backlog.md` y `history.md`, Reglas 5 y 7). Los commits de otros cambios (ej. agregar tareas al backlog) se hacen cuando el operador lo pide.

## Trabajo en paralelo (modo multi-operador)

Varias personas trabajan a la vez, cada una con su agente. Estas reglas se suman a las anteriores:

- **Tus archivos:** el `handoff.md`, `backlog.md` e `history.md` de las Reglas 2 a 8 son los de tu carpeta, `docs/agents/<operador>/`. Solo editas tu carpeta y los archivos compartidos; las carpetas de otros operadores son de solo lectura.
- **Referencias:** dentro de tu carpeta, `Tarea N`; hacia la tarea de otro operador, `T-N@operador`. Los commits siguen la Regla 9.
- **Tareas:** se toman del `team-backlog.md` y el número lo asignas tú, en tu secuencia. Una tarea vive en un solo lugar. "Agrega una tarea" va a tu `backlog.md`, salvo que digan explícitamente que es para el equipo.
- **`rules.md` es de todos:** antes de agregar una regla, recuérdale al operador que se aplicará a todo el proyecto y a los demás operadores, y confirma que no es solo suya; si lo es, va en su `preferences.md`.
- **Plan de ejecución (Regla 2):** si tu `preferences.md` fija cómo prefieres ejecutar los planes, no se te vuelve a preguntar.
- **Con una herramienta de tareas:** lo que ella ya garantiza de «Tus archivos» (solo escribe en tu carpeta) y de «Tareas» (número de tu secuencia, una tarea en un solo lugar) no se repite a mano. Siguen siendo tuyos: no tocar con otros medios carpetas ajenas, escribir bien las referencias, avisar que `rules.md` es de todos y respetar tu `preferences.md`.

## Enlaces (evitar duplicar contexto)

- Estructura de carpetas y por qué está organizado así → [`../architecture.md`](../architecture.md)
- Razón de ser y principios de diseño → [`../philosophy.md`](../philosophy.md)
- Historial de decisiones de diseño → [`../desing.md`](../desing.md) (registro histórico, no spec vigente — ver regla 4)
- Catálogo de plantillas y para qué sirve cada una → `docs/template-architecture.md` del repo de la skill ([Gersom/agent-context-skill](https://github.com/Gersom/agent-context-skill), clonado en `skill/`; no está en este repo)

## Reglas específicas de este proyecto

- **Dos repos.** El kit (este repo) tiene las herramientas y su documentación; la skill (`SKILL.md`, flujos y plantillas `.md`, markdown puro, sin código ni build) vive en su propio repo, [Gersom/agent-context-skill](https://github.com/Gersom/agent-context-skill), clonado en `skill/` e ignorado por git en el kit (`.gitignore`). Quien clone el kit tiene que clonar también la skill en `skill/` (ver el README raíz); sin ella, los tests de `scripts/skill-checks/` se saltan.
- **Commits en dos repos (complementa la Regla 9).** Un cambio en la skill se commitea en su repo, con `git -C skill commit` y el mismo formato `tipo(T-N): descripción`; uno en el kit, en el kit. Una tarea que toca ambos tiene commits en los dos. El commit de cierre (`docs(T-N): close task`) va siempre en el kit, porque ahí viven `handoff.md`, `backlog.md` e `history.md`. En `history.md`, la entrada indica el repo de cada commit (ver «Formato» en ese archivo).
- No hay linter/formatter. `scripts/` (TypeScript con Bun, ej. `scripts/task-tracker/`) son herramientas propias del kit que **no forman parte del skill distribuido** ni se copian a los repos destino.
- Dependencias de `scripts/`: solo en `devDependencies` del `package.json` raíz (no uno por script); `bun install` en la raíz; `node_modules/` no se commitea y `bun.lock` sí. Tests con `bun test` desde la raíz.
- Los scripts nuevos se escriben en **TypeScript** (decisión del operador, 2026-10-05), con el `tsconfig.json` raíz (`strict`). Bun no revisa tipos: `bun run typecheck` (`tsc --noEmit`) tiene que pasar junto con `bun test`.
- **Decisión no negociable —** versionado SemVer, con tags de git `vX.Y.Z` y releases manuales en GitHub, no por CI (los releases son poco frecuentes y son repos de documentación y herramientas chicas). Cada repo se versiona por separado:
  - **El kit:** `package.json` (`version`) + tags en este repo. Versiona los scripts y la documentación del kit. Las versiones y tags `v1.x` que ya existen son anteriores a la separación y cubren también la skill, que entonces vivía acá.
  - **La skill:** su propia versión y sus propios tags, en el repo [Gersom/agent-context-skill](https://github.com/Gersom/agent-context-skill); no se versiona desde el kit. La versión vive en `.claude-plugin/plugin.json`, en `SKILL.md` y en el marcador de la plantilla `template/agents/rules.md`; `scripts/skill-checks/version.test.ts` verifica que coincidan. Bump:
    - **patch** — fixes/ajustes de redacción en plantillas existentes.
    - **minor** — contenido nuevo que no rompe nada (nueva plantilla, nueva rama del árbol de preguntas).
    - **major** — cambios que rompen algo que un repo destino ya pudiera usar (mover/renombrar archivos de `template/` referenciados desde `questions-flow.md`, cambiar la estructura generada en `docs/agents`/`docs/project`).

### Si usas el script de tareas

- El script `task-manager` (`bun run task`, [`scripts/task-manager/README.md`](../../scripts/task-manager/README.md)) es la herramienta de tareas de este repo y es opcional: si lo usas, rige la cláusula de «Al cerrar una tarea» (`step` hace la Regla 6; `close`, las Reglas 5 y 7 y el reporte de la Regla 8). Revisa el diff antes de aplicar con `--apply`.
- En este repo, entre `skill/template/` (el catálogo real) y `docs/desing.md` (registro histórico, no spec vigente) gana `skill/template/` (Regla 4; está en el repo de la skill).

### Qué NO tocar sin autorización explícita

- La estructura de carpetas de `template/` en el repo de la skill (`skill/template/`): moverla o renombrar archivos rompe las referencias de `questions-flow.md` y `migration-flow.md` y requiere bump major de la skill.
- `docs/desing.md`: registro histórico de la conversación de diseño original, no el estado actual (para eso, `docs/architecture.md`).

## Al cerrar una tarea (fijas — leer solo al cerrar)

**Con una herramienta de tareas:** si el proyecto tiene una que edita `handoff.md`, `backlog.md` e `history.md`, lo que ella ya hace de las Reglas 5, 6, 7 y 8 no se repite a mano ni se vuelve a verificar; sigue valiendo todo lo demás (en particular, que la tarea solo se cierra si el operador lo pide, y la sección «Checks pendientes» del reporte de la Regla 8, que añade el agente).

5. **Una tarea solo se cierra cuando el operador lo pide explícitamente** (también las chicas, sin plan): al terminar el trabajo se manda el resumen y se espera; si pide correcciones, se hacen y se vuelve a mandar. **Al cerrarla se actualizan, como mínimo:** `handoff.md` (estado actual, o "sin tarea en curso"), `history.md` (la entrada de la tarea, hecha o descartada) y `backlog.md` (se saca la tarea si venía de ahí y se agregan las nuevas; ver "Numeración" en ese archivo), aunque también hayan cambiado otros archivos. La entrada de `history.md` guarda solo el resultado: qué se hizo, una línea de cómo y qué commit(s) lo contienen, sin el recorrido de cambios y decisiones (ese vive en el handoff mientras la tarea está en curso).

6. **`handoff.md` también se actualiza en cada paso del plan** (Regla 2): qué se hizo, qué falta y el próximo paso concreto, para que un chat nuevo retome exactamente ahí si la conversación se corta. Se edita solo lo que cambió (el checkbox y la nota de ese paso, "Qué falta" y "Próximo paso concreto"), no se reescribe el archivo entero. **Evidencia:** al marcar un paso se anota al final de su línea lo que ya se corrió y observó (ej. `- [x] Paso 3 — … · bun test 779 pass`), y `· commit abc1234` solo si ese paso cierra un grupo de cambios ya commiteado; no se corre nada extra solo para tener evidencia. **Cambios a mitad de trabajo:** si el operador pide un ajuste antes de cerrar, se conservan los pasos hechos que no cambian, el invalidado se reabre con el motivo (`- [ ] Paso 2 — … (reabierto: <motivo>)`) y los pasos nuevos se agregan. Esa evidencia vive solo en el handoff (en curso o pausada); al cerrar no pasa a `history.md`.

7. **El último paso de todo plan es "documentar cierre de tarea":** la Regla 5 más revisar las tareas bloqueadas de `backlog.md` por si alguna dejó de estarlo. Al desbloquearla, su campo `Bloqueos` no se borra: pasa a `[Resuelto el <fecha>] — <motivo original>`. Se hace igual en tareas sin plan. También se evalúa si "Tareas libres" superó las 15 (ver "Agrupamiento" en `backlog.md`).

8. **Reporte de cierre.** Al terminar el cierre, resumir en el chat con este formato (se omiten las secciones sin contenido):

   ```
   **Tareas resueltas:**
   - Tarea N — título

   **Tareas descartadas:**
   - Tarea N — título — motivo breve

   **Tareas desbloqueadas:**
   - Tarea N — título

   **Tareas nuevas:**
   - Tarea N — título

   **Checks pendientes:**
   - check — fallido | omitido | pendiente — motivo breve

   **Próximo paso:** <qué sigue>
   ```

   «Checks pendientes» y «Próximo paso» solo se ponen si hay checks fallidos, omitidos o pendientes: nunca se dan por buenos sin decirlo.
