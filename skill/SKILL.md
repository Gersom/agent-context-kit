---
name: agent-context-kit
description: Genera o actualiza la documentación de contexto de un proyecto (reglas, estado en caliente, backlog, historial, arquitectura, stack, integraciones externas) para que cualquier agente de IA sepa en qué momento está el proyecto sin depender de la memoria de una conversación. Úsalo al empezar a trabajar en un repositorio — para inicializar esta documentación si no existe, o para leerla y mantenerla al día si ya existe.
---

# agent-context-kit

## Cuándo se dispara

Al empezar a trabajar sobre un repositorio, antes de tocar código. También se puede invocar explícitamente — ver "Cómo usar" en el `README.md` raíz; pedir explícitamente migrar (ej. *"...y migra mi proyecto"*) fuerza el chequeo de [`docs/migration-flow.md`](./docs/migration-flow.md) aunque la heurística automática no encuentre suficientes coincidencias.

## Paso 1 — ¿Ya existe documentación de este skill?

Revisar si el repo destino tiene `docs/agents/` y/o `docs/project/` (o sus equivalentes bajo `agent-context/`, si `docs/` está ocupado por otra documentación).

### Si existe → flujo de proyecto existente (se resuelve acá, sin abrir más archivos)

1. Leer `docs/agents/rules.md` (ahí está registrado el idioma de la documentación: usarlo, no volver a preguntar) y `docs/agents/handoff.md`.
2. Leer de `docs/agents/backlog.md` solo lo relevante a la tarea pedida (buscar por título, sin leerlo entero). `history.md` no se lee salvo que haga falta el porqué de algo concreto.
3. Ejecutar la tarea pedida.
4. Actualizar `handoff.md` (se sobrescribe; en cada paso del plan, Regla 6) y, al cerrar, `history.md` y `backlog.md` (Reglas 5 y 7 de `rules.md`). Si `handoff.md` o `backlog.md` no tienen las anclas de sección (`<!-- agent-context-kit:section=... -->`), agregarlas — ver [`docs/template-architecture.md`](./docs/template-architecture.md), "Anclas de sección".
5. Fin: no seguir con el árbol de preguntas.

### Si no existe → abrir el flujo que corresponda

- **Hay documentación de contexto previa en otro formato** (ej. un `docs/claude/` con su propio `backlog.md`/`handoff.md`) → [`docs/migration-flow.md`](./docs/migration-flow.md): reutiliza ese contenido en vez de perderlo.
- **No hay nada reconocible para migrar** → [`docs/questions-flow.md`](./docs/questions-flow.md): árbol de preguntas (idioma, alcance de la tarea, etapa del proyecto) que decide qué generar copiando solo lo que corresponda desde `template/`, nunca el catálogo completo, y asegura el puntero en `CLAUDE.md` y `AGENTS.md` de la raíz.

## Dónde está cada cosa

- **Qué preguntar y qué copiar** → [`docs/questions-flow.md`](./docs/questions-flow.md)
- **Migración desde otro sistema de documentación** → [`docs/migration-flow.md`](./docs/migration-flow.md)
- **Catálogo de plantillas y para qué sirve cada una** → [`docs/template-architecture.md`](./docs/template-architecture.md); plantillas en [`template/`](./template/)
- **Lógica de detección de conflicto `docs/` vs. `agent-context/` y de los archivos puntero `CLAUDE.md`/`AGENTS.md`** → sección 4 de [`../docs/desing.md`](../docs/desing.md)
