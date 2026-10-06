# Reglas del proyecto

## Reglas por defecto (fijas — no se editan por proyecto)

Vienen con el skill y aplican a cualquier proyecto; las reglas de proceso adicionales se agregan debajo, no en su reemplazo. Las Reglas 5 a 8 están al final, en "Al cerrar una tarea".

1. **Cada contenido vive en un único archivo, el de su tema** (una decisión en `decisions.md`, un bug en `known-issues.md`). Si otro archivo lo necesita, va una mención breve con link, no una copia.

2. **El tamaño de la tarea decide el proceso:**
   - **Pequeña o muy pequeña** → se ejecuta directo, sin plan.
   - **Mediana a grande** → primero un plan con los pasos; después, en una sola tanda de preguntas, preguntarle al operador (a) si los pasos están bien o hay que ajustarlos y (b) si prefiere ejecutarlos todos seguidos o uno a la vez, esperando su confirmación después de cada paso.

3. **Idioma de la documentación:** todo lo que un agente redacte acá (prosa y headers) va en el idioma registrado abajo, detectado una sola vez al generar esta documentación; no se vuelve a preguntar. Siempre en inglés: nombres de archivo/carpeta del catálogo y términos del kit o jerga técnica sin traducción asentada ("Handoff", "Backlog", "Placeholder", "linter", "commit", "deploy").

   **Idioma de la documentación:** [Placeholder — se completa la primera vez que se genera esta documentación]

4. **El código es la fuente de verdad.** Si un archivo de acá (`architecture.md`, `stack.md`, `entities.md`, etc.) contradice lo que el código hace, gana el código: seguirlo y corregir el archivo, salvo que el operador diga explícitamente lo contrario para ese caso.

## Enlaces (evitar duplicar contexto)

- Estructura del código y dónde va cada cosa nueva → [`../project/architecture.md`](../project/architecture.md)
- Decisiones de stack y qué no usar → [`../project/stack.md`](../project/stack.md)
- El "por qué" de decisiones técnicas ya tomadas → [`../project/decisions.md`](../project/decisions.md)
- Bugs conocidos / zonas frágiles → [`./known-issues.md`](./known-issues.md)

## Reglas específicas de este proyecto

<!-- Reglas concretas de estilo/naming/formato que el proyecto ya sigue. Si hay un linter/formatter configurado, nombrarlo y enlazar su config en vez de repetir sus reglas. Solo se agregan por instrucción explícita del operador, nunca por inferencia propia; si ya están en architecture.md, stack.md o decisions.md, enlazarlas. -->

- [Placeholder]

### Qué NO tocar sin autorización explícita

<!-- Zonas sensibles: workarounds intencionales, integraciones frágiles, código legado que "funciona pero no se entiende". Si ya está en known-issues.md, enlazar. -->

- [Placeholder, o "Ninguna zona marcada como sensible todavía"]

### Decisiones no negociables

<!-- Cosas ya decididas que un agente no debe re-litigar ni revertir por su cuenta (ej. "no se usa Redux"). Si hay un ADR, enlazar la entrada de decisions.md. -->

- [Placeholder]

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
