<!--
GUÍA para el agente, no se copia literal palabra por palabra: la ruta `docs/`
puede ser `agent-context/` según el conflicto descrito en `docs/desing.md` 4.1,
y la línea de `docs/README.md` solo aplica si ese archivo existe (set intermedio/completo);
en el set mínimo se numera directo desde `agents/rules.md`.

Se asegura siempre en la raíz del repo destino, en cualquier set — incluso el mínimo.
AGENTS.md es la fuente de verdad: dice qué leer primero. CLAUDE.md (y cualquier
archivo puntero de otra herramienta) nunca duplica este contenido, solo redirige acá.

Si el archivo ya existe con contenido propio del operador, no se sobrescribe: se agrega
la sección delimitada de abajo al final, solo si el marcador no está ya presente.
-->

<!-- agent-docs-skill:start -->
## Documentación de contexto para agentes

Antes de cualquier tarea, lee:

1. [`docs/README.md`](./docs/README.md) — qué es este proyecto y el índice de su documentación.
2. [`docs/agents/rules.md`](./docs/agents/rules.md) — reglas fijas del proyecto.
3. [`docs/agents/handoff.md`](./docs/agents/handoff.md) — estado actual del trabajo.
<!-- agent-docs-skill:end -->
