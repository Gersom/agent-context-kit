# Arquitectura del proyecto

Este documento describe la estructura general del repo `agent-context-kit` y para qué sirve cada parte.

## Estructura

```
agent-context-kit/
├── README.md              # Presentación del proyecto
├── CLAUDE.md               # Puntero para agentes: remite a docs/desing.md
│
├── docs/
│   ├── desing.md            # Documento de diseño: historial de decisiones y pendientes
│   ├── architecture.md      # Este archivo
│   └── agents/               # Dogfooding: este repo usa el skill sobre sí mismo
│       ├── rules.md            # Reglas fijas de este repo
│       ├── handoff.md          # Estado "en caliente" del trabajo
│       ├── backlog.md          # Cola de tareas pendientes
│       └── changelog.md        # Historial de tareas cerradas
│
└── src/
    ├── SKILL.md              # Trigger + instrucciones de alto nivel del skill
    │
    ├── docs/
    │   ├── questions-flow.md           # Árbol de decisión (rondas de preguntas) que ejecuta el skill
    │   ├── migration-flow.md           # Flujo para migrar documentación previa en otro formato
    │   └── template-architecture.md   # Detalle de qué es y para qué sirve cada archivo de template/
    │
    └── template/              # Catálogo maestro de plantillas que el skill copia al repo destino
        ├── README.md
        ├── agents/
        ├── project/
        ├── external/
        └── plans/
```

## Qué es cada parte

- **`docs/desing.md`** — registro histórico de la conversación de diseño: por qué se tomaron las decisiones de estructura, nombre y flujo. No se actualiza en cada cambio; es el punto de partida, no el estado actual.
- **`docs/architecture.md`** (este archivo) — foto actual de cómo está organizado el repo, para orientarse rápido sin tener que leer todo `desing.md`.
- **`docs/agents/`** — este repo usa el skill sobre sí mismo (dogfooding): `rules.md`, `handoff.md`, `backlog.md` y `changelog.md` documentan el trabajo de este mismo repo, con la misma estructura que el skill genera en un repo destino.
- **`src/SKILL.md`** — punto de entrada del skill: qué dispara su ejecución y qué hace a alto nivel.
- **`src/docs/questions-flow.md`** — la lógica de decisión propiamente dicha: qué preguntar, en qué orden/rondas, y qué archivos de `src/template/` copiar según las respuestas.
- **`src/docs/migration-flow.md`** — qué hacer cuando el repo destino ya tiene documentación de contexto en otro formato: cómo detectarla, mapearla y transformarla a la estructura de este skill en vez de tratarla como contenido ajeno.
- **`src/docs/template-architecture.md`** — qué es y para qué sirve cada archivo de `src/template/` (para no duplicar esa descripción acá).
- **`src/template/`** — el catálogo de plantillas en sí (el contenido que termina copiado al repo destino). Su estructura interna y el propósito de cada archivo están documentados aparte: ver [`src/docs/template-architecture.md`](../src/docs/template-architecture.md).
