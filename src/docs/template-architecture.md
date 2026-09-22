# Arquitectura de `template/`

Este documento describe la estructura de `src/template/` — el catálogo maestro de plantillas de este skill — y para qué sirve cada archivo. Es documentación de este repo (`agent-context-kit`), no de un proyecto destino: acá no se decide si un archivo se copiará o no en un caso concreto (eso lo define [`questions-flow.md`](./questions-flow.md)), solo se explica qué es y para qué existe cada plantilla.

## Estructura

```
template/
├── README.md
│
├── agents/
│   ├── rules.md
│   ├── handoff.md
│   ├── backlog.md
│   ├── changelog.md
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

Guía de estructura/formato para generar el índice raíz de la documentación del proyecto destino. No se copia tal cual: se usa como referencia de qué secciones y tono debe tener el `docs/README.md` que el agente genera al final del flujo, listando únicamente lo que efectivamente se creó.

## `agents/`

Documentación pensada para que un agente de IA sepa cómo trabajar en el proyecto: qué no tocar, en qué está el trabajo ahora mismo, qué falta, qué se hizo y por qué.

- **`rules.md`** — Reglas fijas del proyecto: convenciones de código, qué no tocar, decisiones de estilo no negociables. Es lo primero que un agente debería leer antes de tocar código.
- **`handoff.md`** — Estado "en caliente" del trabajo: en qué tarea se está, qué falta, decisiones a medio camino. Se sobrescribe siempre con el estado actual — no es un historial, es una foto del presente.
- **`backlog.md`** — Cola de tareas pendientes. Responde "qué falta por hacer".
- **`changelog.md`** — Historial de tareas ya cerradas, con el motivo detrás de cada una. Responde "qué se hizo y por qué".
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
