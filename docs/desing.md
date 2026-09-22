# agent-context-kit — Documento de diseño

> Este documento resume todo lo definido en la conversación de diseño, para que pueda usarse como contexto al continuar el trabajo (ej. en Claude Code) y construir el skill real: `SKILL.md`, `questions-flow.md` y las plantillas de `example/`.

## 1. Objetivo del proyecto

Crear un skill reutilizable que, al ejecutarse sobre cualquier repositorio, genere documentación de contexto de proyecto pensada para que **cualquier agente de IA** (Claude Code, Cursor, Copilot, etc.) sepa en qué momento está el proyecto, qué falta, qué se hizo y por qué, sin depender de la memoria de una sola conversación.

## 2. Nombre del proyecto

**`agent-context-kit`**

Elegido por ser autoexplicativo (se entiende qué hace sin leer la descripción) y fácil de encontrar si se publica. Es consistente con el nombre de la carpeta de respaldo (`agent-context/`) usada en el repo destino.

## 3. Estructura del repositorio del skill

```
agent-context-kit/
├── SKILL.md                 # Trigger + instrucciones de alto nivel del skill
├── questions-flow.md         # Árbol completo de preguntas y ramas de decisión
└── example/                  # Catálogo maestro de plantillas
    ├── README.md              # Plantilla del índice raíz de la documentación
    │
    ├── agents/
    │   ├── rules.md            # Reglas fijas del proyecto (convenciones, qué NO tocar)
    │   ├── handoff.md           # Estado "en caliente": en qué tarea va, qué falta,
    │   │                        # decisiones a medio camino. Se sobrescribe siempre.
    │   ├── backlog.md           # Cola de tareas pendientes (el qué falta)
    │   ├── changelog.md         # Historial de tareas cerradas (el qué se hizo y por qué)
    │   └── roadmap.md           # Visión a mediano/largo plazo (opcional, según etapa)
    │
    ├── project/
    │   ├── architecture.md      # Estructura de carpetas y filosofía de organización
    │   ├── stack.md             # Stack tecnológico usado
    │   ├── entities.md          # Modelo de datos / esquema de base de datos (opcional)
    │   ├── infrastructure.md    # Deploy, entornos, infra (opcional)
    │   ├── decisions.md         # ADRs: el "por qué" de decisiones técnicas ya tomadas (opcional)
    │   ├── glossary.md          # Términos de negocio/dominio propios del proyecto (opcional)
    │   ├── testing.md           # Estrategia y convenciones de testing (opcional)
    │   └── setup.md             # Cómo levantar el proyecto en local (opcional)
    │
    ├── external/
    │   └── _example-service.md  # Plantilla que se duplica y renombra por cada
    │                             # servicio externo/API de terceros que integre el proyecto
    │
    └── plans/                   # Documentación de negocio (opcional, solo si aplica)
        ├── README.md
        ├── costs.md
        ├── limits.md
        └── payments.md
```

Archivo opcional adicional detectado durante el diseño (no confirmado aún si se agrega al catálogo):
- `known-issues.md` — bugs conocidos, zonas frágiles del código, workarounds temporales. Especialmente útil en proyectos en etapa de producción/mantenimiento.

## 4. Qué genera/modifica el skill en el repo destino

```
<repo-destino>/
├── docs/                      # o agent-context/ si docs/ ya existe con otro contenido
│   ├── README.md
│   ├── agents/...
│   ├── project/...
│   ├── external/... (si aplica)
│   └── plans/... (si aplica)
│
├── CLAUDE.md                  # creado, o con sección añadida si ya existía
└── AGENTS.md                  # creado, o con sección añadida si ya existía
```

### 4.1 Lógica de detección de carpeta (docs/ vs agent-context/)

1. ¿Existe `docs/agents/` o `docs/project/` (subcarpetas específicas de este skill)? → **Sí** → el skill ya fue inicializado en este repo antes. No se repite el scaffolding completo; se activa el flujo de "proyecto existente" (leer `handoff.md` + `rules.md` + lo relevante de `backlog.md`, ejecutar la tarea, y al terminar actualizar `handoff.md`/`changelog.md`).
2. ¿Existe `docs/` pero **sin** esas subcarpetas (documentación de otra naturaleza: guía de usuario, Docusaurus, etc.)? → **conflicto** → no se toca esa carpeta. Se usa `agent-context/` en la raíz como ubicación de respaldo.
3. ¿No existe `docs/`? → se crea `docs/` normalmente con la estructura definida.

### 4.2 Archivos puntero en la raíz (CLAUDE.md / AGENTS.md)

Para que ningún agente tenga que "adivinar" si se usó `docs/` o `agent-context/`, el skill siempre asegura un puntero explícito en la raíz:

- **Si `CLAUDE.md` / `AGENTS.md` no existen** → se crean con un párrafo mínimo, por ejemplo: *"La documentación de contexto de este proyecto para agentes está en `docs/` (o `agent-context/`). Antes de cualquier tarea, lee `docs/README.md`, `docs/agents/rules.md` y `docs/agents/handoff.md`."* El contenido pesado vive solo en la carpeta real, no se duplica.
- **Si ya existen con otro contenido** (reglas propias del operador) → no se sobrescriben. Se les agrega una sección delimitada al final, por ejemplo:
  ```
  <!-- agent-docs-skill:start -->
  ... párrafo puntero ...
  <!-- agent-docs-skill:end -->
  ```
  Este marcador permite que, si el skill se vuelve a ejecutar, detecte que el puntero ya fue insertado y no lo duplique.

## 5. Flujo de preguntas (para `questions-flow.md`)

### Paso -1 — Alcance (gate, siempre primero)

Pregunta: **"¿Qué vas a hacer ahora?"**
- a) Tarea puntual (bug fix, ajuste menor)
- b) Agregar una feature a un proyecto existente
- c) Testear/validar algo puntual
- d) Iniciar o continuar un desarrollo prolongado

### Paso -0.5 — Detección automática (sin preguntar al operador)

El agente revisa si `docs/` (o `agent-context/`) ya existe con la estructura de este skill:

- **Si ya existe** → no se dispara el flujo de scaffolding completo. Se lee `rules.md` + `handoff.md` + lo relevante de `backlog.md`, se ejecuta la tarea, y al terminar se actualiza `handoff.md`/`changelog.md`.
- **Si no existe** → según la respuesta del Paso -1:
  - **(a) tarea puntual / (c) testear** → set mínimo: solo `rules.md` + `handoff.md`. Al final, opt-in: *"¿quieres igual la documentación completa porque vas a seguir trabajando este proyecto?"*
  - **(b) agregar feature** → set medio: los "siempre" del Paso 1 + `architecture.md` + `stack.md`, sin forzar `plans/`, `testing.md`, etc. salvo que la feature lo amerite.
  - **(d) desarrollo prolongado** → dispara el flujo completo (Pasos 0 a 5).

### Paso 0 — Contexto base (siempre, solo si se dispara el flujo completo)

1. ¿Es un proyecto nuevo o uno existente al que se le agrega documentación retroactiva? → si es existente, revisar historial de git/commits para reconstruir un `changelog.md` inicial en vez de dejarlo vacío.
2. ¿En qué etapa está el proyecto? → `idea/setup` | `desarrollo activo (MVP)` | `producción/mantenimiento`
3. ¿Qué tipo de proyecto es? → `frontend` | `backend` | `fullstack (repo único)` | `fullstack (monorepo)`

### Paso 1 — Siempre se copian, sin preguntar

`README.md`, `agents/rules.md`, `agents/handoff.md`, `agents/backlog.md`, `agents/changelog.md`, `project/architecture.md`, `project/stack.md`

### Paso 2 — Condicionadas por la etapa (Paso 0.2)

- Si etapa ≠ `idea/setup` → copiar `agents/roadmap.md` y `project/decisions.md`.
- Si etapa = `producción/mantenimiento` → preguntar: ¿hay bugs conocidos o zonas frágiles que un agente debería evitar tocar sin cuidado? → si sí, agregar `known-issues.md`.

### Paso 3 — Condicionadas por el dominio/negocio

4. ¿El proyecto maneja términos de negocio específicos que un agente externo no entendería a simple vista? → si sí, copiar `project/glossary.md`.
5. ¿El proyecto tiene componente de costos, límites de uso o pagos? → si sí, copiar toda la carpeta `plans/`.

### Paso 4 — Condicionadas por integraciones técnicas

6. ¿El proyecto integra servicios externos (APIs de terceros, IA, pasarelas de pago, etc.)? → si sí, preguntar cuántos/cuáles y duplicar `external/_example-service.md` renombrado por cada uno.
7. ¿Hay infraestructura/deploy relevante que documentar? → si sí, copiar `project/infrastructure.md`.
8. ¿El proyecto tiene un modelo de datos o esquema de base de datos que valga la pena documentar aparte? → si sí, copiar `project/entities.md`.

### Paso 5 — Condicionadas por prácticas de desarrollo

9. ¿Hay una estrategia de testing establecida (o se quiere establecer)? → si sí, copiar `project/testing.md`.
10. ¿El setup local requiere pasos no triviales (variables de entorno, seeds, servicios externos corriendo)? → si sí, copiar `project/setup.md`.

## 6. Referencia: estructura original que inspiró este diseño

Proyecto anterior del operador (capturado en una imagen), usado como punto de partida para la comparación:

```
docs/
├── claude/
│   ├── backlog.md
│   ├── changelog.md
│   ├── handoff.md
│   ├── production-watch.md
│   └── roadmap.md
├── external/
│   ├── ai-service.md
│   ├── frontend.md
│   └── whatsapp-bot.md
├── plans/
│   ├── costs.md
│   ├── limits.md
│   ├── payments.md
│   └── README.md
├── architecture.md
├── entities.md
├── idempotency.md
├── infrastructure.md
├── README.md
├── recurring.md
└── stack-backend.md
```

## 7. Estado actual / pendientes

- [x] Estructura de carpetas y archivos del skill definida
- [x] Nombre del proyecto decidido: `agent-context-kit`
- [x] Lógica de detección de conflicto `docs/` vs `agent-context/` definida
- [x] Lógica de archivos puntero `CLAUDE.md` / `AGENTS.md` definida
- [x] Flujo completo de preguntas definido (Paso -1 a Paso 5)
- [ ] Redactar el contenido real de `questions-flow.md` en formato que un agente pueda seguir paso a paso
- [ ] Redactar el contenido real de `SKILL.md`
- [ ] Redactar el contenido/plantilla de cada archivo dentro de `example/`
- [ ] Decidir si se agrega `known-issues.md` al catálogo (quedó mencionado pero no confirmado)
- [ ] Crear el repositorio en GitHub (`https://github.com/Gersom/agent-context-kit` ya existe vacío) y subir esta estructura de archivos
