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

   **Idioma de la documentación:** [Placeholder — se completa la primera vez que se genera esta documentación]

4. **El código es la fuente de verdad.** Ante un conflicto entre un archivo de acá (`architecture.md`, `stack.md`, `entities.md`, etc.) y lo que el código hace, **gana el código**: la documentación está desactualizada. Excepción: que el operador diga explícitamente lo contrario para ese caso. Al detectar el desvío, seguir el código y corregir el archivo afectado en vez de dejar la discrepancia.

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

- Convenciones de organización y dónde va cada cosa nueva → [`../project/architecture.md`](../project/architecture.md)
- Decisiones de stack y qué no usar → [`../project/stack.md`](../project/stack.md)
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
