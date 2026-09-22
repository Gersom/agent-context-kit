# Pagos

Cómo se procesa el cobro/facturación del proyecto y qué pasarelas de pago están involucradas. El catálogo de planes y su modelo de cobro (suscripción, pago único, etc.) vive en [`./tiers.md`](./tiers.md) — acá va el detalle operativo de cómo se cobra, no qué se cobra. El detalle técnico de cómo se integra cada pasarela (SDK, webhooks, credenciales) va en `external/<pasarela>.md`.

---

## Pasarelas de pago

<!--
Un bloque por pasarela, con este formato:

### [Nombre de la pasarela]

- **Para qué se usa:** qué tipo de cobro maneja esta pasarela específicamente (si hay más de una, ej. una para suscripciones y otra para pagos únicos)
- **Integración técnica:** → link a `external/<pasarela>.md`
- **Moneda(s):** en qué moneda(s) se cobra
-->

### [Placeholder — nombre de la pasarela]

- **Para qué se usa:** [Placeholder]
- **Integración técnica:** [Placeholder]
- **Moneda(s):** [Placeholder]

## Casos particulares

<!-- Reembolsos, fallos de pago, reintentos, downgrades/upgrades a mitad de ciclo, impuestos — cualquier caso de negocio no obvio que un agente debería conocer antes de tocar código relacionado a pagos. -->

[Placeholder, o "Ninguno documentado todavía"]
