# Reglas del proyecto

## Reglas por defecto (fijas — no se editan por proyecto)

Vienen con el skill y aplican a cualquier proyecto; las reglas de proceso adicionales se agregan debajo, no en su reemplazo. Las Reglas 5 a 8 están al final, en "Al cerrar una tarea".

1. **Cada contenido vive en un único archivo, el de su tema** (una decisión en `decisions.md`, un bug en `known-issues.md`). Si otro archivo lo necesita, va una mención breve con link, no una copia.

2. **El tamaño de la tarea decide el proceso:**
   - **Pequeña o muy pequeña** → se ejecuta directo, sin plan.
   - **Mediana a grande** → primero un plan con los pasos; después, en una sola tanda de preguntas (con la herramienta `AskUserQuestion`, que muestra opciones seleccionables, no como texto en el chat; también las demás preguntas al operador), preguntarle al operador (a) si los pasos están bien o hay que ajustarlos y (b) si prefiere ejecutarlos todos seguidos o uno a la vez, esperando su confirmación después de cada paso.

3. **Idioma de la documentación:** todo lo que un agente redacte acá (prosa y headers) va en el idioma registrado abajo, detectado una sola vez al generar esta documentación; no se vuelve a preguntar. Siempre en inglés: nombres de archivo/carpeta del catálogo y términos del kit o jerga técnica sin traducción asentada ("Handoff", "Backlog", "Placeholder", "linter", "commit", "deploy").

   **Idioma de la documentación:** Español

4. **El código es la fuente de verdad.** Si un archivo de acá (`architecture.md`, `stack.md`, `entities.md`, etc.) contradice lo que el código hace, gana el código: seguirlo y corregir el archivo, salvo que el operador diga explícitamente lo contrario para ese caso. En este repo, lo mismo entre `skill/template/` (el catálogo real) y `docs/desing.md` (registro histórico, no spec vigente): gana `skill/template/`.

## Trabajo en paralelo (modo multi-operador)

Varias personas trabajan a la vez, cada una con su agente. Estas reglas se suman a las anteriores:

- **Tus archivos:** el `handoff.md`, `backlog.md` e `history.md` de las Reglas 2 a 8 son los de tu carpeta, `docs/agents/<operador>/`. Solo editas tu carpeta y los archivos compartidos; las carpetas de otros operadores son de solo lectura.
- **Referencias:** dentro de tu carpeta, `Tarea N`; hacia la tarea de otro operador, `T-N@operador`. Los commits siguen como `tipo(T-N): descripción`.
- **Tareas:** se toman del `team-backlog.md` y el número lo asignas tú, en tu secuencia. Una tarea vive en un solo lugar. "Agrega una tarea" va a tu `backlog.md`, salvo que digan explícitamente que es para el equipo.
- **`rules.md` es de todos:** antes de agregar una regla, recuérdale al operador que se aplicará a todo el proyecto y a los demás operadores, y confirma que no es solo suya; si lo es, va en su `preferences.md`.
- **Plan de ejecución (Regla 2):** si tu `preferences.md` fija cómo prefieres ejecutar los planes, no se te vuelve a preguntar.

## Enlaces (evitar duplicar contexto)

- Estructura de carpetas y por qué está organizado así → [`../architecture.md`](../architecture.md)
- Razón de ser y principios de diseño → [`../philosophy.md`](../philosophy.md)
- Historial de decisiones de diseño → [`../desing.md`](../desing.md) (registro histórico, no spec vigente — ver regla 4)
- Catálogo de plantillas y para qué sirve cada una → [`../../skill/docs/template-architecture.md`](../../skill/docs/template-architecture.md)

## Reglas específicas de este proyecto

- No hay linter/formatter. `skill/` (`SKILL.md`, flujos y plantillas `.md`) es markdown puro, sin código ni build. `scripts/` (TypeScript con Bun, ej. `scripts/task-tracker/`) son herramientas propias que **no forman parte del skill distribuido** ni se copian a los repos destino.
- Dependencias de `scripts/`: solo en `devDependencies` del `package.json` raíz (no uno por script); `bun install` en la raíz; `node_modules/` no se commitea y `bun.lock` sí. Tests con `bun test` desde la raíz.
- Los scripts nuevos se escriben en **TypeScript** (decisión del operador, 2026-10-05), con el `tsconfig.json` raíz (`strict`). Bun no revisa tipos: `bun run typecheck` (`tsc --noEmit`) tiene que pasar junto con `bun test`.
- Los nombres de archivo del catálogo (`backlog.md`, `handoff.md`, etc.) van siempre en inglés, sea cual sea el idioma del contenido (regla 3).
- **Decisión no negociable —** versionado SemVer: `package.json` (`version`) + tags de git `vX.Y.Z`, con releases manuales en GitHub, no por CI (los releases son poco frecuentes y es un repo de documentación). Bump:
  - **patch** — fixes/ajustes de redacción en plantillas existentes.
  - **minor** — contenido nuevo que no rompe nada (nueva plantilla, nueva rama del árbol de preguntas).
  - **major** — cambios que rompen algo que un repo destino ya pudiera usar (mover/renombrar archivos de `template/` referenciados desde `questions-flow.md`, cambiar la estructura generada en `docs/agents`/`docs/project`).
- `skill/template/` no se copia literal a un repo destino: es guía de estructura y el agente redacta el contenido real por proyecto (incluido el idioma, regla 3).
- **Ninguna tarea se cierra sin que el operador lo pida explícitamente** (decisión del operador, 2026-10-05). Al terminar el trabajo se manda el resumen y se espera: si pide correcciones, se hacen y se vuelve a mandar; solo cuando diga que se cierre se hace el cierre (Reglas 5 y 7) y el reporte (Regla 8). Aplica también a las tareas chicas sin plan.
- **Commits coherentes** (decisión del operador, 2026-10-06): cada commit representa un trabajo hecho. Una tarea puede tener varios; si toca varios módulos o también documentación, se separa por unidad coherente (ej. uno por módulo, otro para la documentación); si es chica, uno alcanza, a criterio del agente. Los commits del trabajo se hacen durante la tarea, a medida que cada unidad queda hecha. El título lleva el número de tarea como scope de Conventional Commits, `tipo(T-N): descripción` (ej. `feat(T-27): ocultar pausadas vacías`), también el de cierre (`docs(T-N): close task`); los commits esporádicos o extras van sin `(T-N)`. El commit de cierre pasa la tarea a completada (`handoff.md`, `backlog.md` y `history.md`, Reglas 5 y 7). Los commits de otros cambios (ej. agregar tareas al backlog) se hacen cuando el operador lo pide.

### Si usas el script de tareas

- El script `task-manager` (`bun run task`, [`scripts/task-manager/README.md`](../../scripts/task-manager/README.md)) es opcional y **no exime de las Reglas 5 a 8**: solo automatiza las ediciones de `handoff.md`, `backlog.md` e `history.md`. Con o sin él, el `handoff.md` se actualiza en cada paso del plan (Regla 6), la tarea solo se cierra cuando el operador lo pide y el cierre cubre lo de las Reglas 5 y 7, y se manda el reporte de la Regla 8. Revisa el diff antes de aplicar con `--apply`.

### Qué NO tocar sin autorización explícita

- La estructura de carpetas de `skill/template/`: moverla o renombrar archivos rompe las referencias de `questions-flow.md` y `migration-flow.md` y requiere bump major.
- Las "Reglas por defecto" de este archivo y de `skill/template/agents/rules.md` (su plantilla): son fijas por diseño.
- `docs/desing.md`: registro histórico de la conversación de diseño original, no el estado actual (para eso, `docs/architecture.md`).

### Decisiones no negociables

- No se mantienen plantillas duplicadas por idioma (`template/es/`, `template/en/`): el agente resuelve el idioma al redactar (regla 3; ver la entrada de `history.md` del 2026-09-24 sobre soporte multi-idioma).
- Cada tarea de `backlog.md`/`history.md` tiene un número correlativo fijo que nunca se reutiliza (ver "Numeración" en `backlog.md`).

## Al cerrar una tarea (fijas — leer solo al cerrar)

5. **Al cerrar una tarea se actualizan, como mínimo:** `handoff.md` (estado actual, o "sin tarea en curso"), `history.md` (la entrada de la tarea, hecha o descartada) y `backlog.md` (se saca la tarea si venía de ahí y se agregan las nuevas; ver "Numeración" en ese archivo), aunque también hayan cambiado otros archivos.

6. **`handoff.md` también se actualiza en cada paso del plan** (Regla 2): qué se hizo, qué falta y el próximo paso concreto, para que un chat nuevo retome exactamente ahí si la conversación se corta.

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
   ```
