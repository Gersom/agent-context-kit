# Arquitectura de `template/`

Este documento describe la estructura de `skill/template/` — el catálogo maestro de plantillas de este skill — y para qué sirve cada archivo. Es documentación de este repo (`agent-context-kit`), no de un proyecto destino: acá no se decide si un archivo se copiará o no en un caso concreto (eso lo define [`questions-flow.md`](./questions-flow.md)), solo se explica qué es y para qué existe cada plantilla.

Las plantillas llevan comentarios HTML de guía para quien las completa; al generar la documentación se quitan (salvo la firma, las anclas y los marcadores `agent-docs-skill`), ver "Al copiar una plantilla al repo destino" en [`questions-flow.md`](./questions-flow.md).

## Estructura

```
template/
├── README.md
├── AGENTS.md
├── CLAUDE.md
│
├── agents/
│   ├── rules.md
│   ├── handoff.md
│   ├── backlog.md
│   ├── history.md
│   ├── roadmap.md
│   └── known-issues.md
│
├── multi/                 (solo modo multi-operador)
│   ├── AGENTS.md
│   ├── operators.md
│   ├── team-backlog.md
│   ├── preferences.md
│   └── rules.md            (bloque para agregar a agents/rules.md)
│
├── project/
│   ├── architecture.md
│   ├── stack.md
│   ├── entities.md
│   ├── infrastructure.md
│   ├── decisions.md
│   ├── glossary.md
│   ├── testing.md
│   └── setup.md
│
├── external/
│   └── _example-service.md
│
└── plans/
    ├── README.md
    ├── tiers.md
    ├── costs.md
    ├── limits.md
    └── payments.md
```

## `README.md` (raíz de `template/`)

Guía para generar el `docs/README.md` del proyecto destino: lo primero que lee el agente en cada sesión, un mapa mínimo (~1,5 KB). No se copia tal cual: contiene la descripción del proyecto, la definición de "operador" y el árbol de `docs/` con una línea por archivo, listando únicamente lo que efectivamente se creó. La descripción es lo único que no se recalcula: se pregunta una sola vez y se preserva en corridas futuras — cubre "esto es un ecommerce", "esto es una API REST", etc., algo que no encaja en `project/architecture.md` (esa es la estructura del código y su filosofía de organización, no qué es el proyecto).

## `AGENTS.md` / `CLAUDE.md` (raíz de `template/`)

Los punteros que se aseguran en la raíz del repo destino, en **cualquier** set (incluso el mínimo) — son lo único que le permite a un agente genérico (no solo este skill) encontrar la documentación de contexto sin invocarlo de nuevo. `AGENTS.md` es la fuente de verdad: dice qué leer (README, reglas y handoff) y qué no leer salvo necesidad (el resto, y `backlog.md`/`history.md` con una tarea en curso). `CLAUDE.md` nunca duplica ese contenido, solo redirige a `AGENTS.md`. Ambos llevan la sección delimitada `<!-- agent-docs-skill:start/end -->` para poder agregarse al final de un archivo ya existente del operador sin sobrescribirlo ni duplicarse en corridas futuras. Ver el paso 3-4 de la "Ronda final" en [`questions-flow.md`](./questions-flow.md).

## `multi/` (modo multi-operador, opcional)

Plantillas que se usan solo si el operador dice que varias personas trabajan en paralelo (ver [`multi-operator.md`](./multi-operator.md)); un proyecto de una sola persona no las toca. `multi/AGENTS.md` reemplaza al `AGENTS.md` plano. `operators.md` mapea cada carpeta de operador con sus correos de git. `team-backlog.md` es el backlog del equipo, de tareas sin dueño y sin numeración (se copia como `docs/agents/team-backlog.md`; el `backlog.md` de cada operador es el de las tareas que tomó). `preferences.md` es la forma de trabajar de un operador, que no puede contradecir `rules.md`. `rules.md` no es un archivo: es un bloque, "Trabajo en paralelo", que se agrega al `rules.md` del proyecto sin tocar sus Reglas por defecto. El `handoff.md`, `backlog.md` e `history.md` de cada operador salen de las plantillas de `agents/`, copiadas a `docs/agents/<operador>/`.

## `agents/`

Documentación pensada para que un agente de IA sepa cómo trabajar en el proyecto: qué no tocar, en qué está el trabajo ahora mismo, qué falta, qué se hizo y por qué.

- **`rules.md`** — Reglas fijas del proyecto: convenciones de código, qué no tocar, decisiones de estilo no negociables, y el idioma en que se redacta toda esta documentación (detectado una sola vez y persistido acá). Es lo primero que un agente debería leer antes de tocar código.
- **`handoff.md`** — Estado "en caliente" del trabajo: la tarea en progreso (una sola) más las tareas pausadas (si hay), qué falta, decisiones a medio camino. Se sobrescribe siempre con el estado actual — no es un historial, es una foto del presente.
- **`backlog.md`** — Cola de tareas pendientes, dividida en libres y bloqueadas/pospuestas. Responde "qué falta por hacer". Si "Tareas libres" crece mucho (más de 15), las que comparten un objetivo real se agrupan en una línea corta, con el detalle movido a "Tareas agrupadas" para no tener que leerlo salvo que haga falta.
- **`history.md`** — Historial de tareas ya resueltas (hechas ✅ o descartadas ❌), con el motivo detrás de cada una. Responde "qué pasó y por qué". Se lee solo por entrada (por número o título) o las primeras; entradas de 3 a 5 líneas con el porqué, sin lo que ya dicen el código o el commit.
- **`roadmap.md`** — Visión a mediano/largo plazo del proyecto. Da contexto de hacia dónde va el proyecto más allá de la tarea inmediata.
- **`known-issues.md`** — Bugs conocidos y zonas frágiles del código, con su workaround temporal si existe. Evita que un agente "arregle" o refactorice algo sin saber que ese comportamiento raro es intencional o ya está siendo mitigado.

### Anclas de sección (`handoff.md` y `backlog.md`)

Fuente de verdad de este mecanismo — las plantillas y los flujos solo lo mencionan y enlazan acá.

Las secciones de tareas de `handoff.md` y `backlog.md` van precedidas, en la línea inmediatamente anterior a su header `##`, por un comentario HTML de máquina:

```md
<!-- agent-context-kit:section=<id> -->
## <header en el idioma de la documentación>
```

| Archivo | `id` | Sección |
|---|---|---|
| `handoff.md` | `in-progress` | Tarea en progreso |
| `handoff.md` | `paused` | Tareas pausadas |
| `backlog.md` | `free` | Tareas libres |
| `backlog.md` | `blocked` | Tareas bloqueadas / pospuestas |
| `backlog.md` | `grouped` | Tareas agrupadas |

- **Por qué existen:** los headers se redactan en el idioma de la documentación del proyecto (Regla 3 de `rules.md`), así que una herramienta no puede buscar "Tareas libres" o "Tarea en progreso" literal. Las anclas dan un punto fijo, independiente del idioma, para el script de seguimiento de tareas de este repo (`scripts/task-tracker/`). Mismo prefijo que la firma `agent-context-kit:signature` de `handoff.md`.
- **Se preservan siempre:** no se traducen, no se borran ni se mueven al actualizar el archivo. En `handoff.md`, que se sobrescribe completo en cada actualización, se reescriben cada vez. Los ejemplos dentro de comentarios de las plantillas no llevan anclas reales.
- **Tarea en progreso:** se identifica por la primera línea `Tarea N — título` de la sección `in-progress` que aparezca antes de su primera subsección `###` (en la plantilla, la línea `**Tarea:**`), sin contar ítems de lista como los pasos del plan; si no hay ninguna, no hay tarea en curso (no depende del texto traducido "Sin tarea en curso"). Las tareas de `backlog.md` y las pausadas son headers `### Tarea N — título` (`#### Tarea N — título` dentro de un grupo de "Tareas agrupadas").
- **Plan de una tarea pausada:** el script muestra el avance del plan de cada pausada a partir de los checkboxes (`- [ ]` / `- [x]`) de su bloque — en la plantilla, los del campo opcional `Plan`, que se copia tal cual de "Tarea en progreso" al pausar la tarea. Ese campo no se repite como texto en la pantalla.
- **Tag de bloqueo:** de cada tarea bloqueada se toma el tag `[...]` **con el que empieza el campo** (`[dependencia]`, `[postergada]` o su traducción), buscando en cualquier campo porque las etiquetas también se traducen; un tag en medio del texto (ej. un `[algo]` dentro de una descripción) no cuenta. Por eso el valor de `Bloqueos` tiene que **empezar** con el tag (o ser "Ninguno"). Si el tag con el que empieza un campo es `[Resuelto…]`, ese campo entero es historial (Regla 7) y no cuenta. Por eso, cuando una tarea ya desbloqueada se vuelve a bloquear, el bloqueo vigente va **primero** en `Bloqueos` y el historial resuelto después: `` `[dependencia]` espera la Tarea 9. Antes: `[Resuelto el <fecha>]` — era … ``. Una tarea en "Tareas bloqueadas / pospuestas" sin ningún bloqueo vigente se avisa en pantalla como candidata a volver a "Tareas libres".
- **Si faltan** (docs generados antes de existir este mecanismo, o editados a mano): el agente las agrega al actualizar el archivo — en el flujo de proyecto existente de [`../SKILL.md`](../SKILL.md) y al migrar con [`migration-flow.md`](./migration-flow.md). Mientras tanto, el script cae a un plan B: ubica las secciones `##` por su orden de aparición y avisa que está en ese modo.
- **Set mínimo:** genera `handoff.md` pero no `backlog.md` ni `history.md` (ver [`questions-flow.md`](./questions-flow.md)), así que solo existen las anclas `in-progress` y `paused`; las herramientas que las leen tienen que tolerar que falten `backlog.md` e `history.md`.
- **`history.md` (sin anclas):** el script de seguimiento de tareas también muestra las últimas entradas de `history.md`. No usa anclas: cada entrada es un header `## <fecha> — ✅|❌ [Tarea N —] título` (el segmento `Tarea N —` solo si la tarea tenía número; las descartadas pueden terminar con un sufijo entre paréntesis, ej. `(descartada)`), con las entradas nuevas **arriba** — el script toma las primeras. Lo que identifica una entrada es la marca ✅ (hecha) o ❌ (descartada), así que no se reemplaza por texto al traducir; los headers sin marca, dentro de comentarios o con placeholders se ignoran.

## `project/`

Documentación técnica y de dominio sobre el proyecto en sí (no sobre el proceso de trabajo).

- **`architecture.md`** — El mapa del código del proyecto destino: un árbol anotado de los niveles superiores (una línea de propósito por entrada, para orientarse sin explorar), las convenciones de organización que no se deducen de las carpetas (por qué está organizado así, reglas de dependencia) y dónde va cada cosa nueva. Se lee solo cuando hace falta ubicarse en el código.
- **`stack.md`** — Las decisiones de stack que no se ven en los archivos de dependencias: qué se eligió a propósito, por qué cuando no es la opción obvia y qué alternativas se descartaron. No es un inventario de lenguajes y librerías.
- **`entities.md`** — Modelo de datos o esquema de base de datos, cuando vale la pena documentarlo aparte del código (por ejemplo, si no hay un ORM autodescriptivo o el esquema es complejo).
- **`infrastructure.md`** — Cómo y dónde se despliega el proyecto: entornos, infraestructura, pipeline de deploy.
- **`decisions.md`** — ADRs (Architecture Decision Records): el "por qué" detrás de decisiones técnicas ya tomadas, para no repetir debates ya cerrados ni revertir algo sin saber por qué se hizo así.
- **`glossary.md`** — Términos de negocio/dominio propios del proyecto que un agente externo no entendería a simple vista.
- **`testing.md`** — Estrategia y convenciones de testing: qué se testea, cómo, con qué herramientas.
- **`setup.md`** — Comandos exactos que un agente necesita (dev, build, lint, typecheck) y cómo levantar el proyecto en local, cuando el setup no es trivial (variables de entorno, seeds, servicios externos corriendo, etc.).

## `external/`

- **`_example-service.md`** — Plantilla base que se duplica y renombra por cada servicio externo o API de terceros que integre el proyecto (por ejemplo, `stripe.md`, `whatsapp-bot.md`). El prefijo `_` la marca como plantilla a duplicar, no como archivo final.

## `plans/`

Documentación de negocio, relevante solo cuando el proyecto tiene un componente comercial (costos, límites de uso, pagos).

- **`README.md`** — Índice de la carpeta `plans/`.
- **`tiers.md`** — Catálogo de planes: cuáles existen, a quién apunta cada uno y su modelo de cobro (suscripción, pago único, freemium, etc.).
- **`costs.md`** — Estructura de costos del proyecto (de operarlo, no de desarrollarlo).
- **`limits.md`** — Límites de uso: cuotas, rate limits, topes por plan.
- **`payments.md`** — Cómo funciona el cobro/facturación, pasarelas de pago involucradas.
