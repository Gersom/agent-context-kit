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
│   └── task-tracker/          # Seguimiento de tareas en la terminal (`bun run tasks [ruta]`)
│       ├── README.md            # Uso: comandos, atajos, qué muestra y cómo lee los archivos
│       ├── index.ts             # Arranque: argumentos, ruta a vigilar (o la pregunta) y llama a app
│       ├── src/
│       │   ├── app.ts             # Ciclo leer → modelo → pintar; watcher, resize, atajos (q, r, Ctrl+C)
│       │   ├── cli/               # Argumentos (--once, ruta), pregunta interactiva de la ruta y atajos de teclado
│       │   ├── io/                # Rutas, lectura de archivos, watcher y lectura con memoria
│       │   ├── parse/             # Markdown → datos: secciones por ancla, bloques, handoff, backlog, history
│       │   ├── model/             # Modelo de pantalla, tag de bloqueo vigente y tareas de las que depende
│       │   ├── ui/                # Pintado con picocolors (recuadros por tipo de tarea) y utilidades de formato
│       │   └── shared/            # Tipos compartidos (types.ts) y formato de hora (time.ts)
│       └── test/                # Tests de `bun test` en espejo de src/ + e2e/ (script entero) + fixtures
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
- **`docs/philosophy.md`** — la razón de ser del kit (contexto que sobrevive entre sesiones, modelos y herramientas de IA) y sus principios de diseño (markdown plano como fuente de verdad, el código gana ante un conflicto, versionado y portable, herramientas opcionales, tolerancia a la edición manual) y las preguntas que debe superar un cambio nuevo. Es el "por qué"; este archivo es el "qué".
- **`docs/agents/`** — este repo usa el skill sobre sí mismo (dogfooding): `rules.md`, `handoff.md`, `backlog.md` y `history.md` documentan el trabajo de este mismo repo, con la misma estructura que el skill genera en un repo destino.
- **`scripts/task-tracker/`** — herramienta de este repo (no del skill: no se copia a los repos destino) que vigila el `docs/agents/` de cualquier proyecto que use el skill y muestra en la terminal la tarea en progreso, las pausadas, las pendientes y las últimas completadas, redibujando cada vez que cambian `handoff.md`, `backlog.md` o `history.md`. Se lanza desde la raíz de este repo con `bun run tasks [ruta]` (sin ruta, la pregunta al arrancar); acepta la raíz del proyecto o su carpeta `docs/agents/`, y se pueden correr varias instancias en paralelo, una por proyecto. Ubica las secciones por las anclas descritas en [`src/docs/template-architecture.md`](../src/docs/template-architecture.md) ("Anclas de sección"), con un plan B por orden de secciones para docs que todavía no las tienen. Está escrito en TypeScript (Bun lo ejecuta sin compilar); se verifica con `bun test` y `bun run typecheck`. Uso, atajos y formatos que lee: [`scripts/task-tracker/README.md`](../scripts/task-tracker/README.md).
- **`src/SKILL.md`** — punto de entrada del skill: qué dispara su ejecución y qué hace a alto nivel.
- **`src/docs/questions-flow.md`** — la lógica de decisión propiamente dicha: qué preguntar, en qué orden/rondas, y qué archivos de `src/template/` copiar según las respuestas.
- **`src/docs/migration-flow.md`** — qué hacer cuando el repo destino ya tiene documentación de contexto en otro formato: cómo detectarla, mapearla y transformarla a la estructura de este skill en vez de tratarla como contenido ajeno.
- **`src/docs/template-architecture.md`** — qué es y para qué sirve cada archivo de `src/template/` (para no duplicar esa descripción acá).
- **`src/template/`** — el catálogo de plantillas en sí (el contenido que termina copiado al repo destino). Su estructura interna y el propósito de cada archivo están documentados aparte: ver [`src/docs/template-architecture.md`](../src/docs/template-architecture.md).
