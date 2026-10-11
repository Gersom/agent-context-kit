<!-- agent-context-kit:version 1.10.0 — versión de la skill con la que se generaron las Reglas por defecto de este archivo; ignorar al leer, no es contenido. Lo usa la skill para detectar versiones más nuevas (ver docs/version-check.md de la skill). -->
# Reglas del proyecto

## Reglas por defecto (fijas — no se editan por proyecto)

Vienen con el skill y aplican a cualquier proyecto; las reglas de proceso adicionales se agregan debajo, no en su reemplazo. Las Reglas 5 a 8 están al final, en "Al cerrar una tarea".

1. **Cada contenido vive en un único archivo, el de su tema** (una decisión en `decisions.md`, un bug en `known-issues.md`). Si otro archivo lo necesita, va una mención breve con link, no una copia.

2. **El tamaño de la tarea decide el proceso:**
   - **Pequeña o muy pequeña** → se ejecuta directo, sin plan.
   - **Mediana a grande** → primero un plan con los pasos; después, en una sola tanda de preguntas, preguntarle al operador (a) si los pasos están bien o hay que ajustarlos y (b) si prefiere ejecutarlos todos seguidos o uno a la vez, esperando su confirmación después de cada paso.
   - **Antes de actuar, de cualquier tamaño:** (a) *pedir no es autorizar*: una pregunta, investigación, explicación, revisión, comparación o proponer una solución es solo lectura, y no se edita ni se ejecuta ningún cambio hasta que el operador pida implementar; si la intención es ambigua, una sola aclaración y seguir en solo lectura. (b) *Explorar primero*: mirar el código y los requisitos relevantes, en proporción a la tarea, antes de proponer o escribir. (c) *Ante una duda real de producto*, una sola pregunta concreta y esperar la respuesta; no asumir.

3. **Idioma de la documentación:** todo lo que un agente redacte acá (prosa y headers) va en el idioma registrado abajo, detectado una sola vez al generar esta documentación; no se vuelve a preguntar. Siempre en inglés: nombres de archivo/carpeta del catálogo y términos del kit o jerga técnica sin traducción asentada ("Handoff", "Backlog", "Placeholder", "linter", "commit", "deploy").

   **Idioma de la documentación:** [Placeholder — se completa la primera vez que se genera esta documentación]

4. **El código es la fuente de verdad.** Si un archivo de acá (`architecture.md`, `stack.md`, `entities.md`, etc.) contradice lo que el código hace, gana el código: seguirlo y corregir el archivo, salvo que el operador diga explícitamente lo contrario para ese caso.

9. **Commits coherentes:** cada commit representa un trabajo hecho. Una tarea puede tener varios; si toca varios módulos o también documentación, se separa por unidad coherente (ej. uno por módulo, otro para la documentación); si es chica, uno alcanza, a criterio del agente. Los commits del trabajo se hacen durante la tarea, a medida que cada unidad queda hecha. El título lleva el número de tarea como scope de Conventional Commits, `tipo(T-N): descripción` (ej. `feat(T-27): ocultar pausadas vacías`), también el de cierre (`docs(T-N): close task`); los commits esporádicos o extras van sin `(T-N)`. El commit de cierre pasa la tarea a completada (`handoff.md`, `backlog.md` y `history.md`, Reglas 5 y 7). Los commits de otros cambios (ej. agregar tareas al backlog) se hacen cuando el operador lo pide.

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
