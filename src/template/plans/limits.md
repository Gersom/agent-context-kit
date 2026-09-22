# Límites de uso

Cuotas, rate limits y topes por plan que aplican en el proyecto. Sirve para que un agente no proponga o implemente algo que un usuario/plan no puede usar, y para saber qué pasa cuando alguien llega al tope.

Si el límite viene impuesto por un servicio de terceros (ej. rate limit de una API externa) y ya está documentado en `external/<servicio>.md`, no lo dupliques acá: menciónalo y linkea. Acá van los límites que el **propio proyecto** define para sus usuarios/planes.

---

<!--
Un bloque por límite, con este formato:

## [Nombre corto del límite]

- **Qué limita:** la acción o recurso concreto (ej. "mensajes enviados por día", "número de proyectos activos")
- **Valor:** el tope, y si varía por plan, uno por plan
- **Aplica a:** usuario / cuenta / organización / global
- **Qué pasa al superarlo:** se bloquea, se cobra extra, se degrada el servicio, etc.
- **Configurable en:** dónde vive el valor en el código/config (archivo, variable de entorno, tabla en base de datos) — para que un agente sepa dónde tocar si hay que cambiarlo
-->

## [Placeholder — nombre corto del límite]

- **Qué limita:** [Placeholder]
- **Valor:** [Placeholder]
- **Aplica a:** [Placeholder]
- **Qué pasa al superarlo:** [Placeholder]
- **Configurable en:** [Placeholder]
