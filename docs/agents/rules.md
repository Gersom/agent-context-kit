# Reglas del proyecto

Lo primero que cualquier agente debe leer antes de tocar código en este proyecto.

## Reglas por defecto (fijas — no se editan por proyecto)

Estas reglas vienen con el skill y aplican sin importar el proyecto. No se borran ni se reescriben al completar este archivo; si hace falta una regla de proceso adicional, se agrega debajo de estas, no en su reemplazo.

1. **Cada contenido vive en un único archivo: el que le corresponde según su tema** (ej. una decisión técnica va en `decisions.md`, un bug conocido en `known-issues.md`, no repetidos en `rules.md` o `handoff.md`). Cuando un agente escribe o actualiza esta documentación, el contenido nuevo va en su archivo correspondiente. Si ese mismo contenido necesita mencionarse desde otro archivo, no se vuelve a escribir ahí: se pone una mención breve y un link al archivo que tiene el contenido completo. Este archivo mismo lo hace: ver la sección de enlaces más abajo.

2. **El tamaño de la tarea decide el proceso:**
   - **Tarea pequeña o muy pequeña** → ejecutarla directamente, sin plan previo.
   - **Tarea mediana a grande** → primero armar un plan con los pasos a seguir. Después, en una sola tanda de preguntas agrupadas (no una por una), preguntarle al operador:
     a. si los pasos están bien o hay que ajustarlos, y
     b. si prefiere que se ejecuten todos los pasos seguidos sin pausas, o uno a la vez — esperando su confirmación después de cada paso para recién ahí seguir al siguiente, debatir el paso actual, o modificarlo.

3. **Idioma de la documentación:** todo el contenido que un agente redacte en esta documentación (prosa y headers de sección) va en el idioma registrado abajo — detectado una sola vez, la primera vez que se generó esta documentación (ver `src/docs/questions-flow.md`, sección "Idioma de la documentación"). No se vuelve a preguntar en sesiones futuras. Excepción, siempre en inglés: nombres de archivo/carpeta del catálogo, y términos propios de este kit o jerga técnica sin traducción natural asentada (ej. "Handoff", "Backlog", "Placeholder", "linter", "commit", "deploy").

   **Idioma de la documentación:** Español

4. **El código es la fuente de verdad.** Esta documentación describe el proyecto, pero puede desactualizarse o entrar en conflicto con lo que el código realmente hace. Ante un conflicto entre lo que dice un archivo de acá y lo que el código muestra, **el código gana siempre** — la documentación está equivocada o desactualizada, no al revés. Excepción: que el operador diga explícitamente lo contrario para ese caso puntual. Si se detecta un desvío así, además de seguir el código, conviene corregir el archivo de documentación afectado para que refleje la realidad. En este repo en particular, aplica también entre `src/template/` (el catálogo real) y `docs/desing.md` (registro histórico de diseño, no spec vigente) — ante discrepancia, gana lo que hay en `src/template/`.

5. **Al cerrar una tarea, como mínimo se actualizan `handoff.md`, `backlog.md` y `history.md`:**
   - `handoff.md` → se sobrescribe con el estado actual (o "sin tarea en curso" si no queda nada abierto).
   - `history.md` → se agrega la entrada de la tarea cerrada (hecha o descartada — ver Regla 7).
   - `backlog.md` → si la tarea venía de ahí, se saca de la lista; si en el camino surgieron tareas nuevas todavía no hechas, se agregan (ver su sección "Numeración").

   Esto es lo mínimo indispensable, independientemente de qué otro archivo también haya cambiado por el contenido específico de la tarea.

6. **`handoff.md` se actualiza en cada paso del plan, no solo al cerrar la tarea.** Además del "al cerrar" que ya exige la Regla 5, en tareas con plan (Regla 2) se sobrescribe `handoff.md` cada vez que se completa un paso, reflejando qué se hizo, qué falta y el próximo paso concreto. El objetivo es continuidad entre sesiones: si la conversación se corta a mitad del plan (ej. en el paso 2 de 5), otro chat debe poder abrir `handoff.md` y retomar exactamente ahí, sin depender de la memoria de la sesión anterior.

7. **El último paso de todo plan (tareas medianas/grandes, Regla 2) es "documentar cierre de tarea".** Ese paso incluye el mínimo de la Regla 5 (actualizar `handoff`/`backlog`/`history`) y, además, revisar todas las tareas marcadas como bloqueadas en `backlog.md` por si alguna dejó de estarlo. Al desbloquear una, no se borra su campo `Bloqueos` original: se reemplaza por `[Resuelto el <fecha>] — <motivo original>`, conservando el rastro de por qué había estado bloqueada. Para tareas pequeñas (sin plan, Regla 2), esta misma revisión de bloqueadas se hace igual, como parte del mínimo ya exigido por la Regla 5.

8. **Reporte de cierre.** Al terminar de cerrar una tarea, el agente resume en el chat qué cambió, con este formato (las secciones sin contenido se omiten):

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
- Historial de decisiones de diseño → [`../desing.md`](../desing.md) (registro histórico, no spec vigente — ver regla 4)
- Catálogo de plantillas y para qué sirve cada una → [`../../src/docs/template-architecture.md`](../../src/docs/template-architecture.md)

## Reglas específicas de este proyecto

- No hay linter/formatter configurado: es un repo de documentación markdown pura (`SKILL.md`, plantillas `.md`), sin código ejecutable ni build step.
- Los nombres de archivo del catálogo (`backlog.md`, `handoff.md`, `stack.md`, etc.) se mantienen siempre en inglés, independientemente del idioma del contenido (ver regla por defecto 3).
- Versionado con SemVer: `package.json` (`version`) + tags de git `vX.Y.Z`, con releases manuales en GitHub por tag — no automatizado vía CI, porque los releases son poco frecuentes y esto es un repo de documentación, no software que se despliega. Criterio de bump:
  - **patch** — fixes/ajustes de redacción en plantillas existentes.
  - **minor** — contenido nuevo que no rompe nada (nueva plantilla, nueva rama del árbol de preguntas).
  - **major** — cambios que rompen algo que un repo destino ya pudiera estar usando (mover/renombrar archivos de `template/` referenciados desde `questions-flow.md`, cambiar la estructura generada en `docs/agents`/`docs/project`).
- El catálogo de `src/template/` no se copia literal a un repo destino: el agente lo usa como guía de estructura y redacta el contenido real por proyecto (incluyendo el idioma, ver regla por defecto 3).

### Qué NO tocar sin autorización explícita

- La estructura de carpetas de `src/template/` — moverla o renombrar archivos rompe las referencias de `questions-flow.md` y `migration-flow.md`, y requiere bump de versión major (ver arriba).
- Las "Reglas por defecto" de este mismo archivo (y de `src/template/agents/rules.md`, su plantilla) — son fijas por diseño, no se editan por proyecto (ver "Cómo actualizar este archivo" más abajo).
- `docs/desing.md` — no se actualiza en cada cambio, es un registro histórico de la conversación de diseño original, no el estado actual (para eso está `docs/architecture.md`).

### Decisiones no negociables

- Versionado con SemVer + tags de git, releases manuales en GitHub (no CI). Ver criterio de bump arriba.
- No se mantienen plantillas duplicadas por idioma (`template/es/`, `template/en/`) — el idioma se resuelve dinámicamente por el agente al redactar contenido (ver regla por defecto 3, y la entrada de `history.md` del 2026-09-24 sobre soporte multi-idioma).
- Cada tarea de `backlog.md`/`history.md` tiene un número correlativo fijo que nunca se reutiliza (ver sección "Numeración" en `backlog.md`).

## Cómo actualizar este archivo

Agregar una regla específica solo cuando surge de una instrucción explícita del operador (algo que corrigió, algo que pidió que se respete siempre) — no inventar reglas por inferencia propia. Si la regla ya está cubierta por `architecture.md` o `desing.md`, no duplicarla: enlazarla. Las reglas por defecto de la primera sección no se tocan.
