# Arquitectura del proyecto

Este documento describe la estructura general del repo `agent-context-kit` y para qué sirve cada parte.

## Estructura

```
agent-context-kit/
├── README.md              # Presentación del proyecto
├── CLAUDE.md               # Puntero para agentes: remite a AGENTS.md
├── AGENTS.md               # Orden de lectura de la documentación de contexto (docs/README.md, rules, operators, handoff)
├── package.json            # Versión del kit (SemVer) + scripts (tasks, task, check, test, typecheck) y devDependencies de scripts/
├── tsconfig.json           # TypeScript (strict) para scripts/; `bun run typecheck` = tsc --noEmit
│
├── scripts/                # Herramientas propias del repo (TypeScript con Bun); no forman parte del skill
│   ├── _shared/               # Código compartido entre scripts (el `_` marca que no es un script: las carpetas sin `_` sí lo son)
│   │   ├── types.ts             # Tipos del dominio: tarea, campo, sección, entrada de historial, handoff/backlog interpretados
│   │   ├── parse/               # Markdown → datos: secciones por ancla, bloques, handoff, backlog, history, operators, team-backlog
│   │   ├── tasks/               # Tag de bloqueo vigente (block-info) y tareas mencionadas en un texto (task-refs)
│   │   └── test/                # Tests en espejo de parse/ y tasks/ + fixtures/ (docs de ejemplo) + helpers.ts
│   ├── docs-check/            # Verificador de otro repo (`bun run check <ruta>`): comprueba que su documentación de agentes sirva al skill, al tracker y al task-manager
│   │   ├── README.md            # Uso, códigos de hallazgo y estructura
│   │   ├── index.ts             # Arranque: llama a run()
│   │   ├── src/                 # args, run, context, lines, report, types y checks/ (files, anchors, placeholders, tasks, handoff, history, skill-version)
│   │   └── test/                # Tests en espejo de src/ + e2e/ con proyectos en un directorio temporal
│   ├── skill-checks/          # Tests de contenido de la skill clonada en `skill/` (`reading-policy`, `multi-operator`, `snapshot`, `version`, `changelog`): fijan la política de lectura, la estructura de lo que se lee en cada sesión y que la versión de la skill coincida en `plugin.json`, `SKILL.md` y la plantilla de `rules.md`; se saltan si `skill/` no está
│   ├── task-manager/          # Gestión de tareas desde la terminal (`bun run task <comando>`): edita handoff/backlog/history/team-backlog de forma quirúrgica
│   │   ├── README.md            # Uso: comandos, flags, `--apply` y qué escribe cada uno
│   │   ├── index.ts             # Arranque: llama al despachador de comandos
│   │   ├── src/                 # cli/ (args, despachador, ayuda), workspace/ (operador, carpeta, lectura), query/ (estado y búsqueda), edit/ (edición por rangos), write/ (lógica de escritura), commands/ (un archivo por comando)
│   │   └── test/                # Tests de `bun test` en espejo de src/
│   └── task-tracker/          # Seguimiento de tareas en la terminal (`bun run tasks [ruta]`)
│       ├── README.md            # Uso: comandos, atajos, qué muestra y cómo lee los archivos
│       ├── index.ts             # Arranque: argumentos, ruta a vigilar (o la pregunta) y llama a app
│       ├── src/
│       │   ├── app.ts             # Ciclo leer → modelo → pintar; watcher, resize, atajos (q, r, Ctrl+C)
│       │   ├── cli/               # Argumentos (--once, ruta, operador), pregunta interactiva de la ruta, teclas (incl. flechas) y navegación de la vista de equipo (estado puro)
│       │   ├── io/                # Rutas, operador (modo multi: operators.md + correo de git), lectura del equipo, lectura de archivos, watcher y lectura con memoria
│       │   ├── model/             # Modelo de pantalla: arma lo que se pinta con lo que interpretó el parseo (un operador, o el equipo y el team-backlog)
│       │   ├── ui/                # Pintado con picocolors (recuadros por tipo de tarea; selector EQUIPO y SIN DUEÑO en modo multi) y utilidades de formato
│       │   └── shared/            # Tipos de pantalla y de lectura de archivos (types.ts) y formato de hora (time.ts)
│       └── test/                # Tests de `bun test` en espejo de src/ + e2e/ (script entero)
│
├── docs/
│   ├── README.md            # Mapa de docs/: qué es el proyecto y qué hay en cada archivo (lo primero que lee el agente)
│   ├── desing.md            # Registro histórico del diseño original (no es la spec vigente)
│   ├── architecture.md      # Este archivo
│   ├── philosophy.md        # Principios de diseño: por qué el kit es lo que es
│   └── agents/               # Dogfooding: este repo usa el skill sobre sí mismo, en modo multi-operador
│       ├── rules.md            # Reglas de este repo, de todos los operadores
│       ├── operators.md        # Operadores y sus correos de git
│       ├── team-backlog.md     # Tareas sin dueño, sin numeración
│       └── gersom/             # Carpeta de un operador
│           ├── handoff.md        # Estado "en caliente" de su trabajo
│           ├── backlog.md        # Sus tareas pendientes (libres / bloqueadas-pospuestas)
│           └── history.md        # Sus tareas resueltas (hechas ✅ / descartadas ❌)
│
└── skill/                  # NO es parte de este repo: clon de Gersom/agent-context-skill, ignorado por git (.gitignore)
    ├── SKILL.md              # Trigger + instrucciones de alto nivel de la skill
    ├── docs/                 # Flujos (questions-flow, migration-flow, multi-operator) y template-architecture.md
    └── template/             # Catálogo maestro de plantillas que la skill copia al repo destino: agents/, project/, external/, plans/ y multi/ (solo modo multi-operador)
```

## Qué es cada parte

- **`docs/philosophy.md`** — la razón de ser del kit y sus principios de diseño.
- **`docs/desing.md`** — registro histórico de la conversación de diseño original; no es el estado actual (para eso, este archivo).
- **`docs/agents/`** — dogfooding: este repo usa el skill sobre sí mismo en modo multi-operador (`rules.md`, `operators.md` y `team-backlog.md` son compartidos; cada operador tiene su carpeta con `handoff.md`, `backlog.md` e `history.md`, con la estructura que el skill genera en un repo destino).
- **`skill/`** — la skill, que vive en su propio repo ([Gersom/agent-context-skill](https://github.com/Gersom/agent-context-skill)) con su propia versión y tags; acá solo se clona (ignorada por git) para que los tests de `scripts/skill-checks/` la lean. `SKILL.md` es el punto de entrada (resuelve el caso "ya existe documentación"), `docs/` tiene los flujos (`questions-flow.md`, `migration-flow.md`, y `multi-operator.md` para el modo de varias personas, que solo se abre si se activa) y qué es cada plantilla (`template-architecture.md`), y `template/` es el catálogo de plantillas. Cómo clonarla: [README raíz](../README.md#clonar-la-skill).
- **`scripts/_shared/`** — código compartido entre los scripts: parseo de `handoff.md`, `backlog.md`, `history.md`, `operators.md` y `team-backlog.md` (`parse/`), tag de bloqueo y referencias entre tareas (`tasks/`), tipos del dominio y fixtures. Lo usan el task-tracker y el task-manager.
- **`scripts/docs-check/`** — herramienta de este repo (no del skill, no se copia a los repos destino) que se corre contra otro proyecto (`bun run check <ruta>`) y reporta, con archivo y línea, si su documentación de agentes cumple lo que necesitan el skill, el task-tracker y el task-manager (anclas, tareas, números, bloqueos, placeholders) y avisa (`skill-version`) si `rules.md` no lleva el marcador de versión de la skill; solo lee, y sale con código distinto de 0 si hay errores. Reutiliza `resolveWorkspace` del task-manager y el parser de `_shared/`. Uso y códigos: [`scripts/docs-check/README.md`](../scripts/docs-check/README.md).
- **`scripts/task-tracker/`** — herramienta de este repo (no del skill, no se copia a los repos destino) que muestra en la terminal el estado de las tareas de un proyecto y se redibuja sola; se lanza con `bun run tasks [ruta]`. Uso, formatos y estructura interna: [`scripts/task-tracker/README.md`](../scripts/task-tracker/README.md).
- **`scripts/task-manager/`** — herramienta de este repo (no del skill, no se copia a los repos destino y opcional: sin ella los archivos se editan a mano) que gestiona las tareas por comandos (`status`, `next`, `show`, `add`, `start`, `step`, `pause`, `resume`, `block`, `unblock`, `close`) editando de forma quirúrgica `handoff.md`, `backlog.md`, `history.md` y `team-backlog.md`; las escrituras exigen `--apply`. Se lanza con `bun run task <comando>`. Comandos, flags y estructura interna: [`scripts/task-manager/README.md`](../scripts/task-manager/README.md).
