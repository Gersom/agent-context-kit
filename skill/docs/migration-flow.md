# migration-flow

Flujo que se dispara cuando, durante la detección automática de [`./questions-flow.md`](./questions-flow.md), se determina que el repo destino **ya tiene documentación de contexto para agentes, pero en un formato o convención distinto** al de este skill (no `docs/agents/` + `docs/project/`). En vez de tratarla como contenido ajeno y usar `agent-context/` como respaldo (el camino de «Carpeta destino» en [`questions-flow.md`](./questions-flow.md), para conflicto genuino), se **migra**: se lee el contenido real, se transforma para encajar en la estructura de este skill, reusando `template/` como formato de destino.

No inventa un flujo nuevo de scaffolding — una vez resuelta la migración, se apoya en `questions-flow.md` para completar lo que falte.

---

## Cuándo se dispara

Inmediatamente después del chequeo de "¿Existe `docs/agents/` y/o `docs/project/`?" en `questions-flow.md`:

- **Existen** → flujo de proyecto existente normal (ya cubierto en `../SKILL.md`, no cambia nada acá).
- **No existen, pero `docs/` (o la carpeta que cumpla ese rol) tiene archivos cuyo nombre matchea el catálogo de este skill** (ver heurística abajo) en una proporción significativa → se dispara **este** flujo, en vez de continuar directo con `ALCANCE`.
- **No existen y tampoco hay coincidencias** → sigue el flujo normal de `questions-flow.md` sin cambios (crear `docs/` nuevo, o usar `agent-context/` si hay conflicto real con contenido no relacionado — ver «Carpeta destino» en `questions-flow.md`).

## Intención explícita del operador

Si el operador pide explícitamente migrar (ej. *"usa la skill agent-context-kit y migra mi proyecto"*, o cualquier variante que declare esa intención — ver `README.md` raíz, sección "Cómo usar"), este flujo se dispara **sin depender de que la heurística encuentre una "proporción significativa" de coincidencias por sí sola.** La intención explícita reemplaza ese umbral.

- La heurística de nombres sigue corriendo igual: sirve para construir la tabla de mapeo propuesta, no para decidir si el flujo se dispara.
- Si no encuentra ningún archivo que matchee nada, no se asume en silencio que no hay nada para migrar: se muestra una tabla vacía (o con pocos matches) en la ronda de confirmación, y se pregunta explícitamente (abierta; candidatos: los archivos de `docs/` sin match, o «Lo escribo yo» y «No aplica / omitir») qué archivos del `docs/` existente corresponde migrar a mano.
- Sin intención explícita, el umbral de "proporción significativa" sigue aplicando tal como se describe en "Cuándo se dispara" — evita que un `docs/` con un solo archivo de nombre coincidente por casualidad (ej. un `setup.md` genérico sin relación) dispare una migración completa que nadie pidió.

## Prioridad: firma de este skill sobre la heurística

Antes de aplicar la tabla de heurística, revisar si alguno de los archivos candidatos a `handoff.md` (cualquiera que matchee el patrón `handoff` en el nombre) contiene el comentario de firma `agent-context-kit:signature`. Se mira solo con `head -n 3`, sin abrir el archivo (ver `template/agents/handoff.md`).

- **Si la firma está presente** → este `docs/` ya fue generado por este mismo skill, no es un sistema distinto. No se dispara la migración: se trata como el flujo de proyecto existente de `../SKILL.md` (seguir el `AGENTS.md` del repo y ejecutar la tarea), aunque la estructura de carpetas no calce exactamente con `docs/agents/`+`docs/project/` (por ejemplo, si se movió o renombró algo a mano después de generarla). Si a ese `handoff.md`/`backlog.md` le faltan las anclas de sección, se agregan igual al actualizarlos (ver [`template-architecture.md`](./template-architecture.md), sección "Anclas de sección").
- **Si no está presente** → no descarta nada por sí solo — la firma es opcional (un `handoff.md` de este skill generado antes de que existiera esta firma, o editado a mano, puede no tenerla). Se sigue con la heurística de nombre normalmente.

La firma es una señal de alta confianza cuando aparece, pero su ausencia es neutral, no una señal de "es de otro sistema".

## Heurística de detección y mapeo

Por cada archivo dentro del `docs/` existente (recursivo, sin importar en qué subcarpeta esté), comparar su nombre (normalizado: minúsculas, sin guiones/underscores) contra este catálogo — coincidencia por nombre exacto o por contener el término. El mapeo se arma **solo con nombres y tamaños** (`ls`, `wc -c`), sin abrir el contenido (política de lectura de [`../SKILL.md`](../SKILL.md)):

| Patrón en el nombre | Destino en este skill |
|---|---|
| `backlog` | `agents/backlog.md` |
| `changelog` / `history` | `agents/history.md` |
| `handoff` | `agents/handoff.md` |
| `roadmap` | `agents/roadmap.md` |
| `known-issues` / `issues` | `agents/known-issues.md` |
| `rules` / `conventions` / `guidelines` | `agents/rules.md` |
| `architecture` / `structure` | `project/architecture.md` |
| `stack` (ej. `stack-backend`, `tech-stack`) | `project/stack.md` |
| `entities` / `schema` / `data-model` / `database` | `project/entities.md` |
| `infrastructure` / `infra` / `deploy` | `project/infrastructure.md` |
| `decisions` / `adr` | `project/decisions.md` |
| `glossary` / `terms` | `project/glossary.md` |
| `testing` / `tests` | `project/testing.md` |
| `setup` / `getting-started` / `onboarding` | `project/setup.md` |
| `tiers` / `plans` (catálogo de planes) | `plans/tiers.md` |
| `costs` / `pricing` | `plans/costs.md` |
| `limits` / `quotas` / `rate-limits` | `plans/limits.md` |
| `payments` / `billing` | `plans/payments.md` |
| cualquier archivo dentro de una carpeta `external/` propia | `external/<mismo-nombre>.md` (ya es 1:1 con la convención de este skill, se mantiene el nombre) |
| `README.md` en la raíz de la carpeta vieja | no se migra 1:1 — se regenera en la Ronda final de `questions-flow.md`, como con cualquier scaffolding |

Si **dos o más archivos viejos matchean al mismo destino** (ej. `stack-backend.md` y `stack-frontend.md` apuntando ambos a `stack.md`), no se pisan entre sí: se fusionan en un único archivo destino conservando el contenido de ambos. La fusión se muestra explícita en la ronda de confirmación, no se asume en silencio.

Si un archivo **no matchea ningún patrón** → va a `docs/others/<nombre-original>.md`, sin transformar (ver "Contenido sin mapeo" más abajo).

## Ronda de confirmación (siempre, antes de tocar nada)

Antes de mover o escribir un solo archivo, mostrar al operador la tabla de mapeo propuesta completa (origen → destino, con tamaños), incluyendo qué archivos van a `docs/others/` por no tener match y cuáles quedarían fusionados. La tabla se muestra como texto (es contenido a revisar, no una pregunta); las preguntas van después, en una sola llamada de `AskUserQuestion` (máximo 4, son independientes; regla general en [`../SKILL.md`](../SKILL.md#cómo-preguntarle-al-operador-obligatorio-al-aplicar-el-skill)), con la recomendada primero:

1. Header `Mapeo`: ¿la tabla de mapeo está bien, o hay que corregir algún archivo puntual? Opciones: «Está bien (Recomendado)» y «Corregir archivos» (cuáles, por «Otro»).
2. Header `Fusiones` (solo si hay fusiones propuestas): ¿corresponde fusionarlas tal cual, o deberían quedar separadas de otra forma? Opciones: «Fusionar tal cual (Recomendado)» y «Dejarlas separadas».
3. Header `Legacy`: **¿querés conservar la documentación vieja en `docs-legacy/`?** Opciones: «Conservar (Recomendado)» y «No conservar». Si `docs-legacy/` ya existe (de una migración anterior), decirlo en la pregunta y ofrecer «Conservar la existente» (se conserva tal cual y no se crea otro respaldo) y «Reemplazarla».
4. Header `Texto`: **¿querés condensar el texto para ahorrar tokens, o mantenerlo tal cual?** Opciones: «Mantener (Recomendado)» y «Condensar». Condensar = quitar relleno y repeticiones, enlazar en vez de duplicar y fusionar lo redundante, conservando todos los hechos, decisiones, fechas y números; mantener = no se reescribe el texto, solo se adapta a la estructura y las anclas de este skill.

Solo después de la confirmación se ejecuta la migración — nunca se mueve o transforma contenido en base a una heurística sin confirmar.

## Ejecución

1. **Resguardar el original, según la respuesta 3.**
   - **Conservar** → copiar la carpeta `docs/` completa a `docs-legacy/` en la raíz del repo destino con `cp -r`, sin modificarla ni leerla. Si `docs-legacy/` ya existía, solo se reemplaza si el operador lo eligió así en la pregunta 3; si no, queda como estaba y no se copia nada.
   - **No conservar** → no se crea `docs-legacy/`. Antes de seguir, verificar con `git status --porcelain` que el repo sea git y que `docs/` no tenga cambios sin commitear; si no, avisar que el original quedaría sin respaldo y pedir confirmación. Los archivos viejos se leen en su lugar y se reemplazan por los nuevos con `git mv`/`mv`.
2. **Migrar cada archivo mapeado, de a uno.** Por cada par (origen, destino confirmado): medir el origen (`wc -c`); leerlo (entero si pesa ≤ 8 KB, por trozos si pesa más: se procesa y se escribe cada trozo antes de leer el siguiente) y reescribirlo para que encaje en la plantilla correspondiente de `skill/template/<categoría>/<archivo>.md`, con la estructura y convenciones de este skill. Se conserva toda la información del original: con "mantener" el texto no se reescribe; con "condensar" se aplica lo definido en la pregunta 4 (los hechos, decisiones, fechas y números no se pierden). La plantilla real de cada archivo define el formato esperado — incluidas, en `handoff.md` y `backlog.md`, las anclas de sección (`<!-- agent-context-kit:section=... -->`), que se insertan siempre aunque el original no tuviera nada equivalente (ver [`template-architecture.md`](./template-architecture.md), sección "Anclas de sección").
3. **Copiar el contenido sin mapeo, tal cual y sin leerlo.** Por cada archivo sin match, copiarlo con `cp` a `docs/others/`, preservando su nombre original. `docs/others/` no tiene plantilla propia en `template/` — es una carpeta de resguardo para no perder contenido, no un catálogo curado como el resto de `docs/`.
4. **Completar lo que falte.** Seguir con el resto de `questions-flow.md` como si `ALCANCE = d` (desarrollo prolongado): lo que el `docs/` viejo no tenía (ej. si nunca existió un `rules.md`) se genera vacío/con placeholders igual que en cualquier scaffolding nuevo, y las Rondas 2-4 se preguntan igual para lo que no se pudo inferir del contenido migrado.
   - **Numeración del backlog:** si las tareas migradas a `backlog.md` no tienen número, numerarlas de arriba hacia abajo, dejar "Próximo número de tarea" en max+1 y anotar en el archivo "Numeración iniciada el <fecha>; las tareas cerradas antes (en `history.md`) no tienen número retroactivo". No se renumera `history.md` hacia atrás.
5. **Ronda final.** Igual que en `questions-flow.md`: generar `docs/README.md` (listando `others/` en el índice si terminó existiendo), asegurar el puntero en `CLAUDE.md`/`AGENTS.md`.
6. **Dejar registro de la migración.** La primera entrada de `docs/agents/history.md` no queda vacía ni es un volcado de `git log`: se registra la migración en sí (como ✅ Hecha) — qué se migró y desde qué archivos (de `docs-legacy/` o del git si no se conservó), si se condensó o se mantuvo el texto, y qué quedó en `others/` sin mapear.

## Qué NO hace este flujo

- No borra `docs-legacy/` automáticamente. Si se conserva, queda como respaldo indefinido hasta que el operador decida borrarlo a mano — el flujo no vuelve a tocarlo después de crearlo.
- No lee el contenido de archivos para clasificarlos ni los que no tienen mapeo.
- No reformatea contenido dentro de `docs/others/` — ese contenido no se transforma, solo se resguarda para que no se pierda ni quede invisible.
- No decide fusiones ambiguas por su cuenta sin pasar por la ronda de confirmación.

---

## Pasar de plano a multi-operador

Caso distinto al de arriba: el repo **ya usa este skill** en estructura plana (`docs/agents/handoff.md`, etc.) y se suma otra persona. Se pasa al modo de [`multi-operator.md`](./multi-operator.md) sin perder nada. Se dispara solo si el operador lo pide (ej. *"usa agent-context-kit para pasar a multi-operador"*); la política de lectura de [`../SKILL.md`](../SKILL.md) rige igual.

**Antes de tocar nada**, verificar con `git status --porcelain docs/agents` que no haya cambios sin commitear (si los hay, avisar y pedir que se commiteen) y preguntar con `AskUserQuestion` (regla general en [`../SKILL.md`](../SKILL.md#cómo-preguntarle-al-operador-obligatorio-al-aplicar-el-skill); las 3 son independientes, van en una sola llamada; las abiertas ofrecen candidatos o «Lo escribo yo» y «No aplica / omitir»):

1. Header `Operador`: ¿con qué nombre corto y qué correo(s) de git se registra el operador actual? (candidato recomendado: el correo de `git config user.email`)
2. Header `Otros`: ¿quiénes más van a trabajar? Su nombre corto y correo se agregan a `operators.md`; quien solo agregue tareas se registra como `(solo team-backlog)` y no tiene carpeta. Opciones: «Nadie más por ahora (Recomendado)» y «Lo escribo yo».
3. Header `Team-backlog`: ¿alguna tarea del `backlog.md` actual debe pasar al `team-backlog.md` (sin dueño)? Los títulos (`grep -n "^###"`) se listan en el texto de la pregunta. Opciones: «Ninguna (Recomendado)» (todas quedan con el operador actual y la numeración continúa) y «Elegir tareas» (cuáles, por «Otro»).

**Ejecución** (comandos de archivo, sin leer los archivos enteros):

1. `docs/agents/<operador>/`: crear la carpeta y mover con `git mv` `handoff.md`, `backlog.md` e `history.md`. No se renombra ni se reescribe nada de su contenido, salvo el enlace a `rules.md` del `handoff.md`, que pasa a `../rules.md`.
2. Crear `docs/agents/operators.md` desde `template/multi/operators.md` con las líneas de las respuestas 1 y 2, y `docs/agents/team-backlog.md` desde `template/multi/team-backlog.md`. Si se eligieron tareas en la respuesta 3, moverlas ahí sin número, con `Agregada: <fecha> por <operador>`, y sacarlas del `backlog.md` (el contador no retrocede).
3. `AGENTS.md` de la raíz: reemplazar la sección delimitada por `<!-- agent-docs-skill:start -->`/`end` por la de `template/multi/AGENTS.md`; `CLAUDE.md` no cambia.
4. `docs/README.md`: actualizar solo el árbol de `agents/` (ver la guía de `template/README.md`).
5. `docs/agents/rules.md`: agregar, antes de "## Enlaces", el bloque "Trabajo en paralelo" de `template/multi/rules.md` (ver "Reglas en modo multi-operador" de [`multi-operator.md`](./multi-operator.md)); las Reglas por defecto no se tocan. En `docs/README.md`, pasar la definición de "operador" a plural.
6. Dejar registro: una entrada ✅ Hecha en el `history.md` del operador (qué pasó a multi y quiénes quedaron registrados), sin número de tarea.

Los demás operadores no hacen nada especial: al hacer `pull`, su agente no encuentra su correo (o lo encuentra, si se registró en la respuesta 2) y se lo pregunta con `AskUserQuestion`.

**No hace:** volver de multi a plano (se hace a mano: mover los tres archivos del único operador de vuelta a `docs/agents/` y borrar `operators.md` y `team-backlog.md`) ni tocar `docs/project/`, `external/` o `plans/`.
