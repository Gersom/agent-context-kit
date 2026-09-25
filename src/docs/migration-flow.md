# migration-flow

Flujo que se dispara cuando, durante la detección automática de [`./questions-flow.md`](./questions-flow.md), se determina que el repo destino **ya tiene documentación de contexto para agentes, pero en un formato o convención distinto** al de este skill (no `docs/agents/` + `docs/project/`). En vez de tratarla como contenido ajeno y usar `agent-context/` como respaldo (el camino descrito en `docs/desing.md`, sección 4.1, para conflicto genuino), se **migra**: se lee el contenido real, se transforma para encajar en la estructura de este skill, reusando `template/` como formato de destino.

No inventa un flujo nuevo de scaffolding — una vez resuelta la migración, se apoya en `questions-flow.md` para completar lo que falte.

---

## Cuándo se dispara

Inmediatamente después del chequeo de "¿Existe `docs/agents/` y/o `docs/project/`?" en `questions-flow.md`:

- **Existen** → flujo de proyecto existente normal (ya cubierto en `questions-flow.md`, no cambia nada acá).
- **No existen, pero `docs/` (o la carpeta que cumpla ese rol) tiene archivos cuyo nombre matchea el catálogo de este skill** (ver heurística abajo) en una proporción significativa → se dispara **este** flujo, en vez de continuar directo con `ALCANCE`.
- **No existen y tampoco hay coincidencias** → sigue el flujo normal de `questions-flow.md` sin cambios (crear `docs/` nuevo, o usar `agent-context/` si hay conflicto real con contenido no relacionado — ver `docs/desing.md` 4.1).

## Intención explícita del operador

Si el operador pide explícitamente migrar (ej. *"usa la skill agent-context-kit y migra mi proyecto"*, o cualquier variante que declare esa intención — ver `README.md` raíz, sección "Cómo usar"), este flujo se dispara **sin depender de que la heurística encuentre una "proporción significativa" de coincidencias por sí sola.** La intención explícita reemplaza ese umbral.

- La heurística de nombres sigue corriendo igual: sirve para construir la tabla de mapeo propuesta, no para decidir si el flujo se dispara.
- Si no encuentra ningún archivo que matchee nada, no se asume en silencio que no hay nada para migrar: se muestra una tabla vacía (o con pocos matches) en la ronda de confirmación, y se pregunta explícitamente qué archivos del `docs/` existente corresponde migrar a mano.
- Sin intención explícita, el umbral de "proporción significativa" sigue aplicando tal como se describe en "Cuándo se dispara" — evita que un `docs/` con un solo archivo de nombre coincidente por casualidad (ej. un `setup.md` genérico sin relación) dispare una migración completa que nadie pidió.

## Prioridad: firma de este skill sobre la heurística

Antes de aplicar la tabla de heurística, revisar si alguno de los archivos candidatos a `handoff.md` (cualquiera que matchee el patrón `handoff` en el nombre) contiene el comentario de firma `agent-context-kit:signature` en sus primeras líneas (ver `template/agents/handoff.md`).

- **Si la firma está presente** → este `docs/` ya fue generado por este mismo skill, no es un sistema distinto. No se dispara la migración: se trata como el flujo de proyecto existente de `questions-flow.md` (leer `rules.md`/`handoff.md`/`backlog.md`, ejecutar la tarea, actualizar al final), aunque la estructura de carpetas no calce exactamente con `docs/agents/`+`docs/project/` (por ejemplo, si se movió o renombró algo a mano después de generarla).
- **Si no está presente** → no descarta nada por sí solo — la firma es opcional (un `handoff.md` de este skill generado antes de que existiera esta firma, o editado a mano, puede no tenerla). Se sigue con la heurística de nombre normalmente.

La firma es una señal de alta confianza cuando aparece, pero su ausencia es neutral, no una señal de "es de otro sistema".

## Heurística de detección y mapeo

Por cada archivo dentro del `docs/` existente (recursivo, sin importar en qué subcarpeta esté), comparar su nombre (normalizado: minúsculas, sin guiones/underscores) contra este catálogo — coincidencia por nombre exacto o por contener el término:

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

Antes de mover o escribir un solo archivo, mostrar al operador la tabla de mapeo propuesta completa (origen → destino), incluyendo qué archivos van a `docs/others/` por no tener match y cuáles quedarían fusionados. Preguntar en una sola tanda:

1. ¿La tabla de mapeo está bien, o hay que corregir algún archivo puntual?
2. Si hay fusiones propuestas, ¿corresponde fusionarlas tal cual, o deberían quedar separadas de otra forma?

Solo después de la confirmación se ejecuta la migración — nunca se mueve o transforma contenido en base a una heurística sin confirmar.

## Ejecución

1. **Resguardar el original primero, intacto.** Copiar la carpeta `docs/` existente completa a `docs-legacy/` en la raíz del repo destino, sin modificarla. Si `docs-legacy/` ya existe (de una migración anterior), preguntar antes de sobrescribir — no pisar un respaldo previo en silencio.
2. **Migrar cada archivo mapeado.** Por cada par (origen ya resguardado en `docs-legacy/`, destino confirmado): leer el contenido real y reescribirlo para que encaje en la plantilla correspondiente de `src/template/<categoría>/<archivo>.md` — conservando toda la información del original (no se descarta contenido), pero con la estructura y convenciones de este skill. La plantilla real de cada archivo define el formato esperado.
3. **Copiar el contenido sin mapeo, tal cual.** Por cada archivo sin match, copiarlo sin transformar a `docs/others/`, preservando su nombre original. `docs/others/` no tiene plantilla propia en `template/` — es una carpeta de resguardo para no perder contenido, no un catálogo curado como el resto de `docs/`.
4. **Completar lo que falte.** Seguir con el resto de `questions-flow.md` como si `ALCANCE = d` (desarrollo prolongado): lo que el `docs/` viejo no tenía (ej. si nunca existió un `rules.md`) se genera vacío/con placeholders igual que en cualquier scaffolding nuevo, y las Rondas 2-4 se preguntan igual para lo que no se pudo inferir del contenido migrado.
5. **Ronda final.** Igual que en `questions-flow.md`: generar `docs/README.md` (listando `others/` en el índice si terminó existiendo), asegurar el puntero en `CLAUDE.md`/`AGENTS.md`.
6. **Dejar registro de la migración.** La primera entrada de `docs/agents/history.md` no queda vacía ni es un volcado de `git log`: se registra la migración en sí (como ✅ Hecha) — qué se migró, desde qué archivos de `docs-legacy/`, y qué quedó en `others/` sin mapear.

## Qué NO hace este flujo

- No borra `docs-legacy/` automáticamente. Queda como respaldo indefinido hasta que el operador decida borrarlo a mano — el flujo no vuelve a tocarlo después de crearlo.
- No reformatea contenido dentro de `docs/others/` — ese contenido no se transforma, solo se resguarda para que no se pierda ni quede invisible.
- No decide fusiones ambiguas por su cuenta sin pasar por la ronda de confirmación.
