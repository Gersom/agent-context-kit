# Reglas del proyecto

Lo primero que cualquier agente debe leer antes de tocar código en este proyecto.

> **Operador:** la persona humana dueña de este proyecto — quien pide las tareas, aprueba decisiones y a quien se le pregunta cuando algo no está definido. Se llama así en todo el catálogo, sin importar el idioma de la documentación (Regla 3).

## Reglas por defecto (fijas — no se editan por proyecto)

Vienen con el skill y aplican a cualquier proyecto. No se borran ni se reescriben al completar este archivo; las reglas de proceso adicionales se agregan debajo, no en su reemplazo.

1. **Cada contenido vive en un único archivo, el de su tema** (una decisión técnica en `decisions.md`, un bug conocido en `known-issues.md`; no repetidos en `rules.md` ni `handoff.md`). Si otro archivo necesita mencionarlo, va una mención breve con link, no una copia. Este archivo lo hace en la sección de enlaces.

2. **El tamaño de la tarea decide el proceso:**
   - **Pequeña o muy pequeña** → se ejecuta directo, sin plan.
   - **Mediana a grande** → primero un plan con los pasos. Después, en una sola tanda de preguntas agrupadas, preguntarle al operador (a) si los pasos están bien o hay que ajustarlos y (b) si prefiere ejecutarlos todos seguidos o uno a la vez, esperando su confirmación después de cada paso.

3. **Idioma de la documentación:** todo lo que un agente redacte acá (prosa y headers) va en el idioma registrado abajo, detectado una sola vez al generar esta documentación (ver `questions-flow.md`, "Idioma de la documentación"); no se vuelve a preguntar. Siempre en inglés: los nombres de archivo/carpeta del catálogo y los términos del kit o la jerga técnica sin traducción asentada ("Handoff", "Backlog", "Placeholder", "linter", "commit", "deploy").

   **Idioma de la documentación:** Español

4. **El código es la fuente de verdad.** Ante un conflicto entre un archivo de acá (`architecture.md`, `stack.md`, `entities.md`, etc.) y lo que el código hace, **gana el código**: la documentación está desactualizada. Excepción: que el operador diga explícitamente lo contrario para ese caso. Al detectar el desvío, seguir el código y corregir el archivo afectado en vez de dejar la discrepancia. En este repo en particular, aplica también entre `skill/template/` (el catálogo real) y `docs/desing.md` (registro histórico de diseño, no spec vigente): ante discrepancia, gana lo que hay en `skill/template/`.

5. **Al cerrar una tarea se actualizan, como mínimo:** `handoff.md` (se sobrescribe con el estado actual, o "sin tarea en curso"), `history.md` (la entrada de la tarea, hecha o descartada) y `backlog.md` (se saca la tarea si venía de ahí y se agregan las nuevas que surgieron; ver "Numeración" en ese archivo). Aplica aunque también hayan cambiado otros archivos (`architecture.md`, `decisions.md`, etc.).

6. **`handoff.md` también se actualiza en cada paso del plan** (Regla 2): qué se hizo, qué falta y el próximo paso concreto, para que un chat nuevo pueda retomar exactamente ahí si la conversación se corta.

7. **El último paso de todo plan es "documentar cierre de tarea":** la Regla 5 más revisar las tareas bloqueadas de `backlog.md` por si alguna dejó de estarlo. Al desbloquear una no se borra su campo `Bloqueos`: se reemplaza por `[Resuelto el <fecha>] — <motivo original>`. En tareas sin plan, esta revisión se hace igual al cerrar. También se evalúa si "Tareas libres" superó las 15 tareas (ver "Agrupamiento" en `backlog.md`).

8. **Reporte de cierre.** Al terminar el cierre, el agente resume en el chat con este formato (se omiten las secciones sin contenido):

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

## Enlaces (evitar duplicar contexto)

- Estructura de carpetas y por qué está organizado así → [`../architecture.md`](../architecture.md)
- Razón de ser y principios de diseño → [`../philosophy.md`](../philosophy.md)
- Historial de decisiones de diseño → [`../desing.md`](../desing.md) (registro histórico, no spec vigente — ver regla 4)
- Catálogo de plantillas y para qué sirve cada una → [`../../skill/docs/template-architecture.md`](../../skill/docs/template-architecture.md)

## Reglas específicas de este proyecto

- No hay linter/formatter configurado. El skill en sí (`skill/`: `SKILL.md`, flujos y plantillas `.md`) es documentación markdown pura, sin código ejecutable ni build step. El repo tiene además herramientas propias en `scripts/` (TypeScript con Bun, ej. `scripts/task-tracker/`) que **no forman parte del skill distribuido** ni se copian a los repos destino.
- Dependencias de `scripts/`: solo en `devDependencies` del `package.json` raíz — no un `package.json` por script. Se instalan con `bun install` en la raíz; `node_modules/` no se commitea y `bun.lock` sí. Tests con `bun test` desde la raíz.
- Los scripts nuevos de `scripts/` se escriben en **TypeScript** por defecto (decisión del operador, 2026-10-05), con el `tsconfig.json` de la raíz (`strict`). Bun ejecuta `.ts` sin revisar tipos, así que `bun run typecheck` (`tsc --noEmit`) tiene que pasar sin errores junto con `bun test`.
- Los nombres de archivo del catálogo (`backlog.md`, `handoff.md`, `stack.md`, etc.) se mantienen siempre en inglés, independientemente del idioma del contenido (ver regla por defecto 3).
- **Decisión no negociable —** versionado con SemVer: `package.json` (`version`) + tags de git `vX.Y.Z`, con releases manuales en GitHub por tag — no automatizado vía CI, porque los releases son poco frecuentes y esto es un repo de documentación, no software que se despliega. Criterio de bump:
  - **patch** — fixes/ajustes de redacción en plantillas existentes.
  - **minor** — contenido nuevo que no rompe nada (nueva plantilla, nueva rama del árbol de preguntas).
  - **major** — cambios que rompen algo que un repo destino ya pudiera estar usando (mover/renombrar archivos de `template/` referenciados desde `questions-flow.md`, cambiar la estructura generada en `docs/agents`/`docs/project`).
- El catálogo de `skill/template/` no se copia literal a un repo destino: el agente lo usa como guía de estructura y redacta el contenido real por proyecto (incluyendo el idioma, ver regla por defecto 3).
- **Ninguna tarea se cierra sin que el operador lo pida explícitamente** (decisión del operador, 2026-10-05). Al terminar el trabajo de una tarea, el agente le manda el resumen y espera: si el operador pide correcciones, se hacen y se vuelve a mandar el resumen; recién cuando dice que se cierre se hace el cierre de las Reglas 5 y 7 (`handoff`/`backlog`/`history`, revisión de bloqueadas) y el reporte de la Regla 8. Aplica también a las tareas chicas que se ejecutan sin plan (Regla 2).
- **Commits coherentes** (decisión del operador, 2026-10-06): cada commit representa un trabajo hecho y se redacta para eso. Una tarea puede tener más de un commit; si toca varios módulos o también documentación, se separa por unidad coherente (ej. uno por módulo, otro para la documentación); si es chica, uno solo alcanza — queda a criterio del agente. Los commits del trabajo se hacen durante la tarea, a medida que cada unidad queda hecha. El título de cada commit de una tarea lleva su número como scope de Conventional Commits, `tipo(T-N): descripción` (ej. `feat(T-27): ocultar pausadas vacías`), también el de cierre (`docs(T-N): close task`); así el log de git distingue los commits de una tarea de los esporádicos o extras, que van sin `(T-N)`. Lo que se commitea **al cerrar** es el commit de cierre: el paso de la tarea a completada (`handoff.md`, `backlog.md` y `history.md`, Reglas 5 y 7). Los commits de otros cambios (ej. agregar tareas al backlog) se hacen cuando el operador lo pide.

### Qué NO tocar sin autorización explícita

- La estructura de carpetas de `skill/template/` — moverla o renombrar archivos rompe las referencias de `questions-flow.md` y `migration-flow.md`, y requiere bump de versión major (ver arriba).
- Las "Reglas por defecto" de este mismo archivo (y de `skill/template/agents/rules.md`, su plantilla) — son fijas por diseño, no se editan por proyecto (ver "Cómo actualizar este archivo" más abajo).
- `docs/desing.md` — no se actualiza en cada cambio, es un registro histórico de la conversación de diseño original, no el estado actual (para eso está `docs/architecture.md`).

### Decisiones no negociables

- No se mantienen plantillas duplicadas por idioma (`template/es/`, `template/en/`) — el idioma se resuelve dinámicamente por el agente al redactar contenido (ver regla por defecto 3, y la entrada de `history.md` del 2026-09-24 sobre soporte multi-idioma).
- Cada tarea de `backlog.md`/`history.md` tiene un número correlativo fijo que nunca se reutiliza (ver sección "Numeración" en `backlog.md`).

## Cómo actualizar este archivo

Agregar una regla específica solo cuando surge de una instrucción explícita del operador (algo que corrigió, algo que pidió que se respete siempre) — no inventar reglas por inferencia propia. Si la regla ya está cubierta por `architecture.md` o `desing.md`, no duplicarla: enlazarla. Las reglas por defecto de la primera sección no se tocan.
