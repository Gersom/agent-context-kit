# Arquitectura del proyecto

Este documento describe la estructura general del repo `agent-context-kit` y para qué sirve cada parte.

## Estructura

```
agent-context-kit/
├── README.md              # Presentación del proyecto
├── CLAUDE.md               # Puntero para agentes: remite a docs/desing.md
├── package.json            # Versión del skill (SemVer) + scripts (tasks, test, typecheck) y devDependencies de scripts/
├── tsconfig.json           # TypeScript (strict) para scripts/; `bun run typecheck` = tsc --noEmit
│
├── scripts/                # Herramientas propias del repo (TypeScript con Bun); no forman parte del skill
│   ├── _shared/               # Código compartido entre scripts (el `_` marca que no es un script: las carpetas sin `_` sí lo son)
│   │   ├── types.ts             # Tipos del dominio: tarea, campo, sección, entrada de historial, handoff/backlog interpretados
│   │   ├── parse/               # Markdown → datos: secciones por ancla, bloques, handoff, backlog, history
│   │   ├── tasks/               # Tag de bloqueo vigente (block-info) y tareas mencionadas en un texto (task-refs)
│   │   └── test/                # Tests en espejo de parse/ y tasks/ + fixtures/ (docs de ejemplo) + helpers.ts
│   └── task-tracker/          # Seguimiento de tareas en la terminal (`bun run tasks [ruta]`)
│       ├── README.md            # Uso: comandos, atajos, qué muestra y cómo lee los archivos
│       ├── index.ts             # Arranque: argumentos, ruta a vigilar (o la pregunta) y llama a app
│       ├── src/
│       │   ├── app.ts             # Ciclo leer → modelo → pintar; watcher, resize, atajos (q, r, Ctrl+C)
│       │   ├── cli/               # Argumentos (--once, ruta), pregunta interactiva de la ruta y atajos de teclado
│       │   ├── io/                # Rutas, lectura de archivos, watcher y lectura con memoria
│       │   ├── model/             # Modelo de pantalla: arma lo que se pinta con lo que interpretó el parseo
│       │   ├── ui/                # Pintado con picocolors (recuadros por tipo de tarea) y utilidades de formato
│       │   └── shared/            # Tipos de pantalla y de lectura de archivos (types.ts) y formato de hora (time.ts)
│       └── test/                # Tests de `bun test` en espejo de src/ + e2e/ (script entero)
│
├── docs/
│   ├── desing.md            # Documento de diseño: historial de decisiones y pendientes
│   ├── architecture.md      # Este archivo
│   ├── philosophy.md        # Principios de diseño: por qué el kit es lo que es
│   └── agents/               # Dogfooding: este repo usa el skill sobre sí mismo
│       ├── rules.md            # Reglas fijas de este repo
│       ├── handoff.md          # Estado "en caliente" del trabajo
│       ├── backlog.md          # Cola de tareas pendientes (libres / bloqueadas-pospuestas)
│       └── history.md          # Historial de tareas resueltas (hechas ✅ / descartadas ❌)
│
└── skill/
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

- **`docs/philosophy.md`** — la razón de ser del kit y sus principios de diseño.
- **`docs/desing.md`** — registro histórico de la conversación de diseño original; no es el estado actual (para eso, este archivo).
- **`docs/agents/`** — dogfooding: este repo usa el skill sobre sí mismo (`rules.md`, `handoff.md`, `backlog.md` y `history.md` documentan el trabajo de este repo, con la estructura que el skill genera en un repo destino).
- **`skill/`** — el skill: [`SKILL.md`](../skill/SKILL.md) es el punto de entrada (resuelve el caso "ya existe documentación"), [`docs/`](../skill/docs/) tiene los flujos (`questions-flow.md`, `migration-flow.md`) y qué es cada plantilla ([`template-architecture.md`](../skill/docs/template-architecture.md)), y `template/` es el catálogo de plantillas.
- **`scripts/_shared/`** — código compartido entre los scripts: parseo de `handoff.md`, `backlog.md` y `history.md` (`parse/`), tag de bloqueo y referencias entre tareas (`tasks/`), tipos del dominio y fixtures. Lo usan el task-tracker y los scripts que vengan.
- **`scripts/task-tracker/`** — herramienta de este repo (no del skill, no se copia a los repos destino) que muestra en la terminal el estado de las tareas de un proyecto y se redibuja sola; se lanza con `bun run tasks [ruta]`. Uso, formatos y estructura interna: [`scripts/task-tracker/README.md`](../scripts/task-tracker/README.md).
