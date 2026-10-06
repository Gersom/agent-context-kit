<!--
GUÍA para el agente, no se copia literal. Variante de `template/AGENTS.md` para el modo
multi-operador (ver `docs/multi-operator.md`): reemplaza al `AGENTS.md` plano, no se suman.
Ajustar la ruta `docs/` (puede ser `agent-context/`), igual que en la plantilla plana.
Debe mantenerse lo más corto posible: se lee en cada sesión.

Si el archivo ya existe con contenido propio del operador, no se sobrescribe: se agrega
la sección delimitada de abajo al final, solo si el marcador no está ya presente.
-->

<!-- agent-docs-skill:start -->
## Documentación de contexto para agentes

Antes de cualquier tarea, lee en este orden:

1. [`docs/README.md`](./docs/README.md) — qué es el proyecto y mapa de `docs/`.
2. [`docs/agents/rules.md`](./docs/agents/rules.md) — reglas del proyecto, de todos los operadores; la sección final «Al cerrar una tarea», solo al cerrar una.
3. [`docs/agents/operators.md`](./docs/agents/operators.md) — tu carpeta, según `git config user.email`. Si tu correo no figura, pregúntale al operador con qué nombre registrarlo. Si el archivo falta pero `docs/agents/` tiene carpetas de operador, no asumas nada: avísale y pregúntale si lo restauras desde `HEAD`, desde un commit anterior, lo dejas así (el repo se trata como plano) o lo restaura él.
4. `docs/agents/<tu-carpeta>/handoff.md` — estado actual de tu trabajo; y `preferences.md` si existe.

El resto, solo si la tarea lo exige. Con una tarea en curso en tu `handoff.md`, no leas ningún `backlog.md` ni `history.md` salvo que la tarea lo requiera; sin tarea en curso, mira la lista de títulos de tu `backlog.md` y la del `docs/agents/backlog.md` compartido solo si no te pidieron algo concreto. Las carpetas de otros operadores, solo si te lo piden o tu tarea depende de ellas, y **nunca las edites**. Un archivo grande se lee por búsqueda (`grep -n`) o por rango, no entero.
<!-- agent-docs-skill:end -->
