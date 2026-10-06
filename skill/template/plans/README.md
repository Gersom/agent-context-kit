# Plans

Documentación de negocio del proyecto: costos, límites de uso y pagos. Solo se copia esta carpeta cuando el proyecto tiene un componente comercial — si no lo tiene, no debería existir `plans/` en el repo destino.

Es documentación de negocio, no técnica: describe cómo se cobra, cuánto cuesta operar y qué límites existen, no cómo está implementado el código que lo resuelve (eso va en `project/` si aplica, ej. qué pasarela de pago se integra técnicamente va también en `external/`).

## Contenido

- [`tiers.md`](./tiers.md) — catálogo de planes: cuáles existen, a quién apunta cada uno y su modelo de cobro (suscripción, pago único, freemium, etc.).
- [`costs.md`](./costs.md) — estructura de costos de operar el proyecto (infraestructura, servicios de terceros, etc.), no de desarrollarlo.
- [`limits.md`](./limits.md) — límites de uso: cuotas, rate limits, topes por plan.
- [`payments.md`](./payments.md) — cómo se procesa el cobro/facturación y qué pasarelas de pago están involucradas.
