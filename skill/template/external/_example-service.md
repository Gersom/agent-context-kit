# [Nombre del servicio]

<!-- Al duplicar este archivo para documentar una integración real, renombrarlo a docs/external/<nombre-servicio>.md (ej. stripe.md, whatsapp-bot.md) y reemplazar este título y los placeholders de abajo. El archivo `_example-service.md` en sí queda sin tocar como plantilla disponible para futuras integraciones. -->

Qué es este servicio y para qué lo usa el proyecto, en una o dos líneas.

---

## Para qué se usa

<!-- Qué problema resuelve dentro del proyecto, concretamente — no la descripción genérica del servicio (eso está en su documentación oficial), sino el rol que cumple acá. -->

[Placeholder]

## Cómo se integra

<!-- SDK oficial, API REST directa, webhook entrante, librería de terceros, etc. Si hay un wrapper propio en el código (ej. un cliente interno que envuelve el SDK), mencionar dónde vive. -->

[Placeholder]

## Credenciales y configuración

<!-- Qué variables de entorno o configuración hacen falta (nombres, no valores/secretos) y dónde se consiguen (dashboard del servicio, pedir al equipo, etc.). Si ya está documentado en `project/setup.md`, no lo dupliques: linkea. -->

[Placeholder]

## Límites y costos

<!-- Rate limits o cuotas que impone el propio servicio (no los límites que el proyecto define para sus usuarios — eso va en `plans/limits.md`). Si el costo de este servicio ya está en `plans/costs.md`, linkear en vez de repetir el detalle. -->

[Placeholder, o "Ver `plans/costs.md` / `plans/limits.md`"]

## Comportamiento ante fallos

<!-- Qué pasa si el servicio está caído o responde con error: ¿hay reintentos?, ¿fallback?, ¿se degrada una funcionalidad puntual o se cae todo el flujo? Importante para que un agente no asuma disponibilidad 100% al tocar código que depende de esto. -->

[Placeholder]

## Documentación oficial

<!-- Link a la documentación del servicio/API, para no tener que redescubrir todo desde cero. -->

[Placeholder]
