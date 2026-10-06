# agent-context-kit

Skill que genera, en un repo, la documentación de contexto para agentes de IA (reglas, estado del trabajo, backlog, historial, arquitectura), para que un agente sepa en qué punto está el proyecto sin depender de la memoria de una conversación. Este repo se documenta con su propio skill.

**Operador:** la persona dueña del proyecto que le pide tareas al agente, aprueba decisiones y a quien se le pregunta cuando algo no está definido.

## Mapa de `docs/`

```
docs/
├── agents/
│   ├── rules.md        # reglas fijas del proyecto
│   ├── handoff.md      # estado actual del trabajo
│   ├── backlog.md      # tareas pendientes
│   └── history.md      # tareas cerradas y por qué
├── architecture.md     # estructura del repo y para qué sirve cada parte
├── philosophy.md       # por qué el kit es como es
└── desing.md           # registro histórico del diseño original (no es la spec vigente)
```

Para ubicarte en el repo o saber dónde va algo nuevo: [`architecture.md`](./architecture.md).
