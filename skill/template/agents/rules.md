# Reglas del proyecto

Lo primero que cualquier agente debe leer antes de tocar código en este proyecto.

> **Operador:** la persona humana dueña de este proyecto — quien pide las tareas, aprueba decisiones y a quien se le pregunta cuando algo no está definido. El término aparece así en todo este catálogo (`docs/agents/`, `docs/project/`), sin importar el idioma de la documentación (ver Regla 3).

## Reglas por defecto (fijas — no se editan por proyecto)

Estas reglas vienen con el skill y aplican sin importar el proyecto. No se borran ni se reescriben al completar este archivo; si hace falta una regla de proceso adicional, se agrega debajo de estas, no en su reemplazo.

1. **Cada contenido vive en un único archivo: el que le corresponde según su tema** (ej. una decisión técnica va en `decisions.md`, un bug conocido en `known-issues.md`, no repetidos en `rules.md` o `handoff.md`). Cuando un agente escribe o actualiza esta documentación, el contenido nuevo va en su archivo correspondiente. Si ese mismo contenido necesita mencionarse desde otro archivo, no se vuelve a escribir ahí: se pone una mención breve y un link al archivo que tiene el contenido completo. Este archivo mismo lo hace: ver la sección de enlaces más abajo.

2. **El tamaño de la tarea decide el proceso:**
   - **Tarea pequeña o muy pequeña** → ejecutarla directamente, sin plan previo.
   - **Tarea mediana a grande** → primero armar un plan con los pasos a seguir. Después, en una sola tanda de preguntas agrupadas (no una por una), preguntarle al operador:
     a. si los pasos están bien o hay que ajustarlos, y
     b. si prefiere que se ejecuten todos los pasos seguidos sin pausas, o uno a la vez — esperando su confirmación después de cada paso para recién ahí seguir al siguiente, debatir el paso actual, o modificarlo.

3. **Idioma de la documentación:** todo el contenido que un agente redacte en esta documentación (prosa y headers de sección) va en el idioma registrado abajo — detectado una sola vez, la primera vez que se generó esta documentación (ver `questions-flow.md`, sección "Idioma de la documentación"). No se vuelve a preguntar en sesiones futuras. Excepción, siempre en inglés: nombres de archivo/carpeta del catálogo, y términos propios de este kit o jerga técnica sin traducción natural asentada (ej. "Handoff", "Backlog", "Placeholder", "linter", "commit", "deploy").

   **Idioma de la documentación:** [Placeholder — se completa la primera vez que se genera esta documentación]

4. **El código es la fuente de verdad.** Esta documentación describe el proyecto, pero puede desactualizarse o entrar en conflicto con lo que el código realmente hace. Ante un conflicto entre lo que dice un archivo de acá (`architecture.md`, `stack.md`, `entities.md`, etc.) y lo que el código muestra, **el código gana siempre** — la documentación está equivocada o desactualizada, no al revés. Excepción: que el operador diga explícitamente lo contrario para ese caso puntual. Si se detecta un desvío así, además de seguir el código, conviene corregir el archivo de documentación afectado para que refleje la realidad (no dejar la discrepancia para la próxima vez).

5. **Al cerrar una tarea, como mínimo se actualizan `handoff.md`, `backlog.md` y `history.md`:**
   - `handoff.md` → se sobrescribe con el estado actual (o "sin tarea en curso" si no queda nada abierto).
   - `history.md` → se agrega la entrada de la tarea cerrada (hecha o descartada — ver Regla 7).
   - `backlog.md` → si la tarea venía de ahí, se saca de la lista; si en el camino surgieron tareas nuevas todavía no hechas, se agregan (ver su sección "Numeración").
   
   Esto es lo mínimo indispensable, independientemente de qué otro archivo (`architecture.md`, `decisions.md`, etc.) también haya cambiado por el contenido específico de la tarea.

6. **`handoff.md` se actualiza en cada paso del plan, no solo al cerrar la tarea.** Además del "al cerrar" que ya exige la Regla 5, en tareas con plan (Regla 2) se sobrescribe `handoff.md` cada vez que se completa un paso, reflejando qué se hizo, qué falta y el próximo paso concreto. El objetivo es continuidad entre sesiones: si la conversación se corta a mitad del plan (ej. en el paso 2 de 5), otro chat debe poder abrir `handoff.md` y retomar exactamente ahí, sin depender de la memoria de la sesión anterior.

7. **El último paso de todo plan (tareas medianas/grandes, Regla 2) es "documentar cierre de tarea".** Ese paso incluye el mínimo de la Regla 5 (actualizar `handoff`/`backlog`/`history`) y, además, revisar todas las tareas marcadas como bloqueadas en `backlog.md` por si alguna dejó de estarlo. Al desbloquear una, no se borra su campo `Bloqueos` original: se reemplaza por `[Resuelto el <fecha>] — <motivo original>`, conservando el rastro de por qué había estado bloqueada. Para tareas pequeñas (sin plan, Regla 2), esta misma revisión de bloqueadas se hace igual, como parte del mínimo ya exigido por la Regla 5. Este mismo paso también evalúa si "Tareas libres" de `backlog.md` superó las 15 tareas — si es así, ver el mecanismo de agrupamiento descrito en `backlog.md`.

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

- Estructura de carpetas y por qué está organizado así → [`../project/architecture.md`](../project/architecture.md)
- Stack tecnológico → [`../project/stack.md`](../project/stack.md)
- El "por qué" de decisiones técnicas ya tomadas → [`../project/decisions.md`](../project/decisions.md)
- Bugs conocidos / zonas frágiles → [`./known-issues.md`](./known-issues.md)

## Reglas específicas de este proyecto

<!-- Reglas concretas de estilo/naming/formato que el proyecto ya sigue. Si hay un linter/formatter configurado, nombrarlo y enlazar su config en vez de repetir sus reglas acá (ej. "seguir la config de `.eslintrc`", no transcribirla). -->

- [Placeholder]

### Qué NO tocar sin autorización explícita

<!-- Zonas del código que son sensibles: workarounds intencionales, integraciones frágiles, código legado que "funciona pero no se entiende". Si ya está en known-issues.md, enlazar en vez de repetir el detalle acá. -->

- [Placeholder, o "Ninguna zona marcada como sensible todavía"]

### Decisiones no negociables

<!-- Cosas ya decididas y cerradas que un agente no debería re-litigar ni revertir por su cuenta (ej. "no se usa Redux", "los tests van con Vitest, no Jest"). Si la decisión tiene un ADR detrás, enlazar la entrada correspondiente de decisions.md en vez de reexplicar el porqué. -->

- [Placeholder]

## Cómo actualizar este archivo

Agregar una regla específica solo cuando surge de una instrucción explícita del operador (algo que corrigió, algo que pidió que se respete siempre) — no inventar reglas por inferencia propia. Si la regla ya está cubierta por `architecture.md`, `stack.md` o `decisions.md`, no duplicarla: enlazarla. Las reglas por defecto de la primera sección no se tocan.
