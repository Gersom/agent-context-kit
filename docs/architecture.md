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
│   └── architecture.md      # Este archivo
│
└── src/
    ├── SKILL.md              # Trigger + instrucciones de alto nivel del skill
    │
    ├── docs/
    │   ├── questions-flow.md           # Árbol de decisión (rondas de preguntas) que ejecuta el skill
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
- **`src/SKILL.md`** — punto de entrada del skill: qué dispara su ejecución y qué hace a alto nivel.
- **`src/docs/questions-flow.md`** — la lógica de decisión propiamente dicha: qué preguntar, en qué orden/rondas, y qué archivos de `src/template/` copiar según las respuestas.
- **`src/docs/template-architecture.md`** — qué es y para qué sirve cada archivo de `src/template/` (para no duplicar esa descripción acá).
- **`src/template/`** — el catálogo de plantillas en sí (el contenido que termina copiado al repo destino). Su estructura interna y el propósito de cada archivo están documentados aparte: ver [`src/docs/template-architecture.md`](../src/docs/template-architecture.md).
