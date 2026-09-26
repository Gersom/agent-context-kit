<!--
Esto es una GUÍA para el agente, no una plantilla que se copia literal.

Al final del flujo (Ronda final de `questions-flow.md`), el agente genera `docs/README.md`
en el repo destino usando este archivo solo como referencia de estructura y tono — nunca
copiándolo tal cual. El `docs/README.md` real debe:

- Listar únicamente los archivos que efectivamente existen en `docs/` tras esta ejecución.
  Si no se copió `glossary.md`, no aparece. Si se crearon 3 archivos en `external/`, los 3
  quedan listados con su nombre real (no "external/_example-service.md").
- Omitir secciones enteras si no aplican (ej. si no hay `plans/`, esa sección no existe,
  no se deja vacía ni con "N/A").
- Mantener el mismo agrupamiento y orden que se usa acá abajo.
- La sección "Qué es este proyecto" se pregunta una sola vez, la primera vez que se genera
  este `README.md` (si no existe todavía o no tiene esa sección) — en corridas futuras se
  preserva tal cual, no se vuelve a preguntar ni se regenera junto con el resto del índice.

Debajo, el esqueleto de referencia. Los ítems marcados con * son condicionales — ver
`questions-flow.md` para el criterio exacto de cuándo se generan.

Este archivo no repite el orden de lectura ("lee esto antes de tocar código") porque esa
instrucción ya vive en `AGENTS.md` (raíz del repo destino) — ver `template/AGENTS.md`. Acá
solo va el índice: qué es el proyecto y qué archivo cubre qué tema.
-->

# [Nombre del proyecto] — Documentación

Punto de entrada a la documentación de contexto de este proyecto para agentes de IA (Claude Code, Cursor, Copilot, etc.). Generada con [`agent-context-kit`](https://github.com/Gersom/agent-context-kit).

## Qué es este proyecto

[Descripción de 1-2 frases: qué es el proyecto, para quién, qué problema resuelve — ej. "tienda online de ropa", "API REST para gestión de pedidos".]

## Proceso de trabajo (`agents/`)

- [`rules.md`](./agents/rules.md) — reglas fijas del proyecto.
- [`handoff.md`](./agents/handoff.md) — estado "en caliente" del trabajo.
- [`backlog.md`](./agents/backlog.md) — qué falta por hacer. *(set intermedio/completo)*
- [`history.md`](./agents/history.md) — qué se hizo o descartó, y por qué. *(set intermedio/completo)*
- [`roadmap.md`](./agents/roadmap.md) — visión a mediano/largo plazo. *(solo set completo, etapa ≠ idea/setup)*
- [`known-issues.md`](./agents/known-issues.md) — bugs conocidos y zonas frágiles. *(solo si hay alguno documentado)*

## El proyecto (`project/`)

- [`architecture.md`](./project/architecture.md) — estructura de carpetas y filosofía de organización. *(set intermedio/completo)*
- [`stack.md`](./project/stack.md) — stack tecnológico. *(set intermedio/completo)*
- [`decisions.md`](./project/decisions.md) — ADRs, el porqué de decisiones ya tomadas. *(solo set completo, etapa ≠ idea/setup)*
- [`entities.md`](./project/entities.md) — modelo de datos, si aplica. *(condicional)*
- [`infrastructure.md`](./project/infrastructure.md) — entornos y deploy, si aplica. *(condicional)*
- [`glossary.md`](./project/glossary.md) — términos de negocio propios, si aplica. *(condicional)*
- [`testing.md`](./project/testing.md) — estrategia de testing, si aplica. *(condicional)*
- [`setup.md`](./project/setup.md) — cómo levantar el proyecto en local, si no es trivial. *(condicional)*

## Integraciones externas (`external/`)

<!-- Listar cada archivo real generado (ej. stripe.md, whatsapp-bot.md), no la plantilla _example-service.md. -->

*(solo si el proyecto integra servicios externos)*

## Negocio (`plans/`)

- [`tiers.md`](./plans/tiers.md) — catálogo de planes y su modelo de cobro.
- [`costs.md`](./plans/costs.md) — estructura de costos de operar el proyecto.
- [`limits.md`](./plans/limits.md) — cuotas y límites de uso.
- [`payments.md`](./plans/payments.md) — pasarelas de pago y facturación.

*(solo si el proyecto tiene costos, límites de uso o pagos)*

## Otros (`others/`)

<!-- Listar cada archivo real que haya terminado ahí, tal como está (sin plantilla propia). -->

*(solo si esta documentación se generó migrando un sistema previo y quedó contenido sin equivalente claro en la estructura de este skill — ver `src/docs/migration-flow.md`)*
