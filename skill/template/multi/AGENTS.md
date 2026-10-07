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
3. [`docs/agents/operators.md`](./docs/agents/operators.md) — tu carpeta, según `git config user.email`. Si tu correo no figura, pregúntale al operador con qué nombre corto registrarlo y si va a tomar tareas o solo a agregarlas al `team-backlog.md`: lo primero crea su carpeta con `handoff.md`, `backlog.md` e `history.md` vacíos y agrega su línea; lo segundo lo registra «solo team-backlog», sin carpeta; si ya figuraba con otro correo, agrégalo a su línea. Si el archivo falta pero `docs/agents/` tiene carpetas de operador, no asumas nada: avísale y pregúntale si lo restauras desde `HEAD`, desde un commit anterior, lo dejas así (el repo se trata como plano) o lo restaura él.
4. `docs/agents/<tu-carpeta>/handoff.md` — estado actual de tu trabajo; y `preferences.md` si existe.

El resto, solo si la tarea lo exige. Con una tarea en curso en tu `handoff.md`, no leas ningún `backlog.md` ni `history.md` salvo que la tarea lo requiera; sin tarea en curso, mira la lista de títulos de tu `backlog.md` y la de `docs/agents/team-backlog.md` solo si no te pidieron algo concreto. Una tarea que te pidan agregar va a tu `backlog.md`, salvo que digan explícitamente que es para el equipo (`team-backlog.md`); di en cuál la agregaste. Si figuras en `operators.md` como «solo team-backlog», no tienes carpeta: tus tareas van al `team-backlog.md`. Las carpetas de otros operadores, solo si te lo piden o tu tarea depende de ellas, y **nunca las edites**. Un archivo grande se lee por búsqueda (`grep -n`) o por rango, no entero.
<!-- agent-docs-skill:end -->
