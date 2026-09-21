# agent-context-kit

Skill reutilizable que genera documentación de contexto de proyecto para que **cualquier agente de IA** (Claude Code, Cursor, Copilot, etc.) entienda en qué momento está un proyecto, qué falta, qué se hizo y por qué — sin depender de la memoria de una sola conversación.

## Qué hace

Al ejecutarse sobre un repositorio, el skill:

1. Detecta si ya existe documentación de contexto (`docs/` o `agent-context/`) generada por este skill.
   - Si existe, lee `rules.md`, `handoff.md` y lo relevante de `backlog.md`, ejecuta la tarea pedida y al terminar actualiza `handoff.md`/`changelog.md`.
   - Si no existe, dispara un flujo de preguntas para decidir qué documentación generar, según el alcance de la tarea (puntual, feature, desarrollo prolongado) y la etapa del proyecto.
2. Genera (o completa) una carpeta de documentación con una estructura predecible: reglas del proyecto, estado "en caliente" del trabajo, backlog, changelog, arquitectura, stack, integraciones externas, etc.
3. Asegura un puntero explícito en `CLAUDE.md` / `AGENTS.md` en la raíz del repo para que cualquier agente sepa dónde está la documentación, sin adivinar ni duplicar contenido.

## Estructura del repositorio

```
agent-context-kit/
├── SKILL.md              # Trigger + instrucciones de alto nivel del skill
├── questions-flow.md     # Árbol completo de preguntas y ramas de decisión
└── example/               # Catálogo maestro de plantillas
    ├── README.md
    ├── agents/            # rules, handoff, backlog, changelog, roadmap
    ├── project/           # architecture, stack, entities, infrastructure, decisions, glossary, testing, setup
    ├── external/           # plantilla por cada servicio externo integrado
    └── plans/              # documentación de negocio (costos, límites, pagos)
```

## Estado

Proyecto en diseño. Ver [`agent-context-kit-diseno.md`](./agent-context-kit-diseno.md) para el documento de diseño completo (estructura, lógica de detección, flujo de preguntas) y los pendientes actuales.
