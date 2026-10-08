---
name: agent-context-kit
description: Genera o actualiza la documentación de contexto de un proyecto (reglas, estado en caliente, backlog, historial, arquitectura, stack, integraciones externas) para que cualquier agente de IA sepa en qué momento está el proyecto sin depender de la memoria de una conversación. Úsalo al empezar a trabajar en un repositorio — para inicializar esta documentación si no existe, o para leerla y mantenerla al día si ya existe.
---

# agent-context-kit

## Cuándo se dispara

Al empezar a trabajar sobre un repositorio, antes de tocar código. También se puede invocar explícitamente — ver "Cómo usar" en el `README.md` raíz; pedir explícitamente migrar (ej. *"...y migra mi proyecto"*) fuerza el chequeo de [`docs/migration-flow.md`](./docs/migration-flow.md) aunque la heurística automática no encuentre suficientes coincidencias.

## Política de lectura (obligatoria al aplicar el skill)

Este skill se aplica una vez por repo (generar o migrar); en las sesiones siguientes el agente lee solo la documentación ya generada, guiado por el `AGENTS.md` del repo. Esta política rige lo que se lee **ahora**, incluidos los flujos que enlaza; si un paso la contradice, gana ella.

1. **Leer solo lo que el paso actual necesita.** Si ningún paso requiere un archivo, no se abre.
2. **Medir antes de leer** (`wc -c`). Se lee entero solo si pesa ≤ 8 KB o el flujo lo manda expresamente; si pesa más, por búsqueda (`grep -n`) o por rango (`offset`/`limit`).
3. **Clasificar con nombres, tamaños y primeras líneas** (`ls`, `wc -c`, `head`), sin abrir el contenido.
4. **Mover o copiar con `cp`/`mv`**, nunca leyendo y reescribiendo. Un archivo se lee solo para transformarlo.
5. **De a un archivo, sin acarrear ni releer:** procesar uno, escribir su resultado y pasar al siguiente.

## Cómo preguntarle al operador (obligatorio al aplicar el skill)

Toda pregunta al operador —en este archivo y en los flujos que enlaza— se hace con `AskUserQuestion` (recuadro con opciones), también las abiertas, no como texto en el chat. Reglas completas (opciones, abiertas, tandas, respaldo) en [`docs/asking-questions.md`](./docs/asking-questions.md).

## Paso 1 — ¿Ya existe documentación de este skill?

Revisar si el repo destino tiene `docs/agents/` y/o `docs/project/` (o sus equivalentes bajo `agent-context/`, si `docs/` está ocupado por otra documentación).

### Si existe → no hay nada que generar

Seguir el `AGENTS.md` del repo (qué leer y en qué orden; el idioma de la documentación está en `rules.md`: no se vuelve a preguntar) y ejecutar la tarea pedida. Si el operador pide pasar a multi-operador (se suma otra persona), abrir [`docs/migration-flow.md`](./docs/migration-flow.md), sección "Pasar de plano a multi-operador". Si a `handoff.md` o `backlog.md` les faltan las anclas de sección (`<!-- agent-context-kit:section=... -->`), agregarlas — ver [`docs/template-architecture.md`](./docs/template-architecture.md), "Anclas de sección". No seguir con el árbol de preguntas.

### Si no existe → abrir el flujo que corresponda

- **Hay documentación de contexto previa en otro formato** (ej. un `docs/claude/` con su propio `backlog.md`/`handoff.md`) → [`docs/migration-flow.md`](./docs/migration-flow.md): reutiliza ese contenido en vez de perderlo.
- **No hay nada reconocible para migrar** → [`docs/questions-flow.md`](./docs/questions-flow.md): árbol de preguntas (idioma, alcance de la tarea, etapa del proyecto) que decide qué generar copiando solo lo que corresponda desde `template/`, nunca el catálogo completo, y asegura el puntero en `CLAUDE.md` y `AGENTS.md` de la raíz.

## Dónde está cada cosa

- **Qué preguntar y qué copiar** → [`docs/questions-flow.md`](./docs/questions-flow.md)
- **Migración desde otro sistema de documentación** → [`docs/migration-flow.md`](./docs/migration-flow.md)
- **Varias personas trabajando en paralelo (modo multi-operador, opcional)** → [`docs/multi-operator.md`](./docs/multi-operator.md); solo se abre si el operador lo activa
- **Catálogo de plantillas y para qué sirve cada una** → [`docs/template-architecture.md`](./docs/template-architecture.md); plantillas en [`template/`](./template/)
- **Lógica de detección de conflicto `docs/` vs. `agent-context/` y de los archivos puntero `CLAUDE.md`/`AGENTS.md`** → sección 4 de [`../docs/desing.md`](../docs/desing.md)
