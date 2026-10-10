# agent-context-kit

Kit de herramientas de la skill [agent-context-skill](https://github.com/Gersom/agent-context-skill), que genera, en un repo, la documentación de contexto para agentes de IA (reglas, estado del trabajo, backlog, historial, arquitectura), para que un agente sepa en qué punto está el proyecto sin depender de la memoria de una conversación. La skill vive en su propio repo (se clona en `skill/`, ignorada por git); este repo se documenta con ella.

**Operador:** cada persona que trabaja en el proyecto con su agente, le pide tareas, aprueba decisiones y es a quien se le pregunta cuando algo no está definido.

## Mapa de `docs/`

```
docs/
├── agents/
│   ├── rules.md          # reglas del proyecto, de todos los operadores
│   ├── operators.md      # operadores y sus correos de git
│   ├── team-backlog.md   # tareas sin dueño
│   └── gersom/           # una carpeta por operador
│       ├── handoff.md        # su tarea en curso
│       ├── backlog.md        # las tareas que tomó
│       └── history.md        # sus tareas cerradas
├── architecture.md     # estructura del repo y para qué sirve cada parte
├── philosophy.md       # por qué el kit es como es
└── desing.md           # registro histórico del diseño original (no es la spec vigente)
```

Para ubicarte en el repo o saber dónde va algo nuevo: [`architecture.md`](./architecture.md).
