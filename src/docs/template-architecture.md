# Arquitectura de `template/`

Este documento describe la estructura de `src/template/` — el catálogo maestro de plantillas de este skill — y para qué sirve cada archivo. Es documentación de este repo (`agent-context-kit`), no de un proyecto destino: acá no se decide si un archivo se copiará o no en un caso concreto (eso lo define [`questions-flow.md`](./questions-flow.md)), solo se explica qué es y para qué existe cada plantilla.

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

Guía de estructura/formato para generar el índice raíz de la documentación del proyecto destino. No se copia tal cual: se usa como referencia de qué secciones y tono debe tener el `docs/README.md` que el agente genera al final del flujo, listando únicamente lo que efectivamente se creó. Su primera sección ("Qué es este proyecto") es la única que no se recalcula del listado de archivos: se pregunta una sola vez y se preserva en corridas futuras — es el hueco que cubre "esto es un ecommerce", "esto es una API REST", etc., algo que no encaja en `project/architecture.md` (esa es estructura de carpetas y filosofía de organización, no qué es el proyecto).

## `AGENTS.md` / `CLAUDE.md` (raíz de `template/`)

Los punteros que se aseguran en la raíz del repo destino, en **cualquier** set (incluso el mínimo) — son lo único que le permite a un agente genérico (no solo este skill) encontrar la documentación de contexto sin invocarlo de nuevo. `AGENTS.md` es la fuente de verdad: dice qué leer primero. `CLAUDE.md` nunca duplica ese contenido, solo redirige a `AGENTS.md`. Ambos llevan la sección delimitada `<!-- agent-docs-skill:start/end -->` para poder agregarse al final de un archivo ya existente del operador sin sobrescribirlo ni duplicarse en corridas futuras. Ver el paso 3-4 de la "Ronda final" en [`questions-flow.md`](./questions-flow.md).

## `agents/`

Documentación pensada para que un agente de IA sepa cómo trabajar en el proyecto: qué no tocar, en qué está el trabajo ahora mismo, qué falta, qué se hizo y por qué.

- **`rules.md`** — Reglas fijas del proyecto: convenciones de código, qué no tocar, decisiones de estilo no negociables, y el idioma en que se redacta toda esta documentación (detectado una sola vez y persistido acá). Es lo primero que un agente debería leer antes de tocar código.
- **`handoff.md`** — Estado "en caliente" del trabajo: la tarea en progreso (una sola) más las tareas pausadas (si hay), qué falta, decisiones a medio camino. Se sobrescribe siempre con el estado actual — no es un historial, es una foto del presente.
- **`backlog.md`** — Cola de tareas pendientes, dividida en libres y bloqueadas/pospuestas. Responde "qué falta por hacer". Si "Tareas libres" crece mucho (más de 15), las que comparten un objetivo real se agrupan en una línea corta, con el detalle movido a "Tareas agrupadas" para no tener que leerlo salvo que haga falta.
- **`history.md`** — Historial de tareas ya resueltas (hechas ✅ o descartadas ❌), con el motivo detrás de cada una. Responde "qué pasó y por qué".
- **`roadmap.md`** — Visión a mediano/largo plazo del proyecto. Da contexto de hacia dónde va el proyecto más allá de la tarea inmediata.
- **`known-issues.md`** — Bugs conocidos y zonas frágiles del código, con su workaround temporal si existe. Evita que un agente "arregle" o refactorice algo sin saber que ese comportamiento raro es intencional o ya está siendo mitigado.

## `project/`

Documentación técnica y de dominio sobre el proyecto en sí (no sobre el proceso de trabajo).

- **`architecture.md`** — Estructura de carpetas del proyecto destino y la filosofía de organización detrás (por qué está organizado así, no solo qué carpetas hay).
- **`stack.md`** — Stack tecnológico usado: lenguajes, frameworks, librerías clave y por qué se eligieron, si es relevante.
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
