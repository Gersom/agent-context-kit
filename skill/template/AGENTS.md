<!--
GUÍA para el agente, no se copia literal palabra por palabra: ajustar la ruta `docs/`
(puede ser `agent-context/`, ver `docs/desing.md` 4.1) y quitar las líneas de archivos que no
se generaron (en el set mínimo no hay `docs/README.md` ni `backlog.md`/`history.md`).

Se asegura siempre en la raíz del repo destino, en cualquier set. AGENTS.md es la fuente de
verdad de qué leer; CLAUDE.md (y cualquier puntero de otra herramienta) solo redirige acá.
Debe mantenerse lo más corto posible: se lee en cada sesión.

Si el archivo ya existe con contenido propio del operador, no se sobrescribe: se agrega
la sección delimitada de abajo al final, solo si el marcador no está ya presente.
-->

<!-- agent-docs-skill:start -->
## Documentación de contexto para agentes

Antes de cualquier tarea, lee en este orden:

1. [`docs/README.md`](./docs/README.md) — qué es el proyecto y mapa de `docs/`.
2. [`docs/agents/rules.md`](./docs/agents/rules.md) — reglas fijas.
3. [`docs/agents/handoff.md`](./docs/agents/handoff.md) — estado actual del trabajo.

El resto, solo si la tarea lo exige. Con una tarea en curso en `handoff.md`, no leas `backlog.md` ni `history.md` salvo que la tarea lo requiera; sin tarea en curso, mira la lista de títulos del backlog solo si no te pidieron algo concreto. Un archivo grande se lee por búsqueda (`grep -n`) o por rango, no entero.
<!-- agent-docs-skill:end -->
