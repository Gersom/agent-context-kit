---
name: agent-context-kit
description: Genera o actualiza la documentación de contexto de un proyecto (reglas, estado en caliente, backlog, changelog, arquitectura, stack, integraciones externas) para que cualquier agente de IA sepa en qué momento está el proyecto sin depender de la memoria de una conversación. Úsalo al empezar a trabajar en un repositorio — para inicializar esta documentación si no existe, o para leerla y mantenerla al día si ya existe.
---

# agent-context-kit

## Cuándo se dispara

Al empezar a trabajar sobre un repositorio, antes de tocar código: para saber si ya existe documentación de contexto de este skill y, si no existe, decidir cuánta generar según el alcance de la tarea pedida.

## Qué hace (alto nivel)

1. **Detecta** si el repo destino ya tiene `docs/agents/` y/o `docs/project/` (o sus equivalentes bajo `agent-context/`, si `docs/` está ocupado por otra documentación no relacionada).
   - **Si ya existen** → el skill ya fue inicializado antes en este repo. No se repite el scaffolding: se lee `agents/rules.md` + `agents/handoff.md` + lo relevante de `agents/backlog.md`, se ejecuta la tarea pedida, y al terminar se actualiza `agents/handoff.md` (se sobrescribe) y se agrega la entrada correspondiente a `agents/changelog.md`.
   - **Si no existen** → se dispara el árbol de preguntas para decidir qué generar, según el alcance de la tarea (puntual, feature, testear, desarrollo prolongado) y, si aplica, la etapa del proyecto.
2. **Genera o completa** la carpeta de documentación copiando desde `template/` solo lo que corresponda según las respuestas — nunca el catálogo completo por defecto.
3. **Asegura un puntero explícito** en `CLAUDE.md` y `AGENTS.md` en la raíz del repo destino, para que cualquier agente sepa dónde está la documentación real sin adivinar ni duplicarla.

La lógica de decisión completa — qué preguntar, en qué rondas, y qué archivo de `template/` copiar según cada respuesta — vive en [`docs/questions-flow.md`](./docs/questions-flow.md). Este archivo no la repite: es el punto de entrada, no el árbol de decisión.

## Dónde está cada cosa

- **Árbol de decisión (qué preguntar y qué copiar)** → [`docs/questions-flow.md`](./docs/questions-flow.md)
- **Catálogo de plantillas y para qué sirve cada una** → [`docs/template-architecture.md`](./docs/template-architecture.md), plantillas en [`template/`](./template/)
- **Lógica de detección de conflicto `docs/` vs. `agent-context/` y de los archivos puntero `CLAUDE.md`/`AGENTS.md`** → sección 4 de [`../docs/desing.md`](../docs/desing.md)
