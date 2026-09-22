# Pagos

Cómo funciona el cobro/facturación del proyecto y qué pasarelas de pago están involucradas. El detalle técnico de cómo se integra cada pasarela (SDK, webhooks, credenciales) va en `external/<pasarela>.md`; acá va el modelo de negocio: qué se cobra, cuándo, y con qué pasarela.

---

## Modelo de facturación

<!-- Cómo se cobra a nivel general: suscripción recurrente, por uso (metered), pago único, freemium con upsell, etc. Si hay varios planes, mencionarlos acá o linkear a donde estén definidos (ej. un archivo de configuración de planes). -->

[Placeholder]

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
