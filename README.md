# agent-context-kit

Skill reutilizable que genera documentación de contexto de proyecto para que **cualquier agente de IA** (Claude Code, Cursor, Copilot, etc.) entienda en qué momento está un proyecto, qué falta, qué se hizo y por qué — sin depender de la memoria de una sola conversación.

## Qué hace

Al ejecutarse sobre un repositorio, el skill:

1. Detecta si ya existe documentación de contexto (`docs/` o `agent-context/`) generada por este skill.
   - Si existe, lee `rules.md`, `handoff.md` y lo relevante de `backlog.md`, ejecuta la tarea pedida y al terminar actualiza `handoff.md`/`changelog.md`.
   - Si no existe, dispara un flujo de preguntas para decidir qué documentación generar, según el alcance de la tarea (puntual, feature, desarrollo prolongado) y la etapa del proyecto.
2. Genera (o completa) una carpeta de documentación con una estructura predecible: reglas del proyecto, estado "en caliente" del trabajo, backlog, changelog, arquitectura, stack, integraciones externas, etc.
3. Asegura un puntero explícito en `CLAUDE.md` / `AGENTS.md` en la raíz del repo para que cualquier agente sepa dónde está la documentación, sin adivinar ni duplicar contenido.

## Cómo usar

Invocar el skill explícitamente, pidiéndoselo al agente:

- **"Usa la skill agent-context-kit"** — dispara la detección automática normal: si el repo ya tiene documentación de este skill, sigue el flujo de proyecto existente; si no, evalúa si hay contenido de otro sistema para migrar, o dispara el scaffolding normal según el alcance de la tarea.
- **"Usa la skill agent-context-kit y migra mi proyecto"** — misma detección, pero fuerza el chequeo de migración aunque la heurística de nombres de archivo no encuentre por sí sola suficientes coincidencias como para dispararse (ver "Intención explícita del operador" en [`src/docs/migration-flow.md`](./src/docs/migration-flow.md)).

## Estructura del repositorio

```
agent-context-kit/
├── SKILL.md              # Trigger + instrucciones de alto nivel del skill
├── docs/
│   └── questions-flow.md # Árbol completo de preguntas y ramas de decisión
└── template/              # Catálogo maestro de plantillas
    ├── README.md
    ├── agents/            # rules, handoff, backlog, changelog, roadmap
    ├── project/           # architecture, stack, entities, infrastructure, decisions, glossary, testing, setup
    ├── external/           # plantilla por cada servicio externo integrado
    └── plans/              # documentación de negocio (costos, límites, pagos)
```

## Estado

Proyecto en diseño. Ver [`docs/desing.md`](./docs/desing.md) para el documento de diseño completo (estructura, lógica de detección, flujo de preguntas) y los pendientes actuales.
