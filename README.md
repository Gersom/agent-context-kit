# agent-context-suite

Suite de herramientas para trabajar con la skill [agent-context-skill](https://github.com/Gersom/agent-context-skill), que genera documentación de contexto de proyecto para que **cualquier agente de IA** (Claude Code, Cursor, Copilot, etc.) entienda en qué momento está un proyecto, qué falta, qué se hizo y por qué — sin depender de la memoria de una sola conversación. La skill vive en su propio repo (`agent-context-skill`); este repo tiene las herramientas (seguimiento, gestión y verificación de tareas) y la documentación del proyecto.

La razón de ser de la suite y sus principios de diseño (markdown plano como fuente de verdad, herramientas opcionales, el código gana ante un conflicto) están en [`docs/philosophy.md`](./docs/philosophy.md).

## Qué hace

Al ejecutarse sobre un repositorio, la skill:

1. Detecta si ya existe documentación de contexto (`docs/` o `agent-context/`) generada por esta skill.
   - Si existe, lee `rules.md`, `handoff.md` y lo relevante de `backlog.md`, ejecuta la tarea pedida y al terminar actualiza `handoff.md`/`history.md`.
   - Si no existe, dispara un flujo de preguntas para decidir qué documentación generar, según el alcance de la tarea (puntual, feature, desarrollo prolongado) y la etapa del proyecto.
2. Genera (o completa) una carpeta de documentación con una estructura predecible: reglas del proyecto, estado "en caliente" del trabajo, backlog, historial, arquitectura, stack, integraciones externas, etc.
3. Asegura un puntero explícito en `CLAUDE.md` / `AGENTS.md` en la raíz del repo para que cualquier agente sepa dónde está la documentación, sin adivinar ni duplicar contenido.

## Cómo usar

Invocar la skill explícitamente, pidiéndoselo al agente (se llama igual que su repo, `agent-context-skill`):

- **"Usa la skill agent-context-skill"** — dispara la detección automática normal: si el repo ya tiene documentación de esta skill, sigue el flujo de proyecto existente; si no, evalúa si hay contenido de otro sistema para migrar, o dispara el scaffolding normal según el alcance de la tarea.
- **"Usa la skill agent-context-skill y migra mi proyecto"** — misma detección, pero fuerza el chequeo de migración aunque la heurística de nombres de archivo no encuentre por sí sola suficientes coincidencias como para dispararse (ver "Intención explícita del operador" en `docs/migration-flow.md` del [repo de la skill](https://github.com/Gersom/agent-context-skill)).

## Instalar la suite

No hace falta clonar este repo. Requiere Node 20 o superior (o Bun). Hay dos formas de usarla; elige una:

### A. Sin instalar nada (`npx` o `bunx`)

Un solo comando: descarga la suite, la ejecuta y termina. **No deja instalado el comando `acsuite`**, así que cada vez se escribe completo:

```sh
npx agent-context-suite@latest check <ruta-del-proyecto>
bunx agent-context-suite@latest check <ruta-del-proyecto>   # igual, con Bun
```

`@latest` trae siempre la versión más reciente.

### B. Instalada (comando `acsuite`)

Se instala una vez y desde entonces existe el comando `acsuite`:

```sh
npm install -g agent-context-suite
acsuite check <ruta-del-proyecto>
```

Para actualizarla: `npm install -g agent-context-suite@latest`.

### Nombres

El **paquete** (lo que escribes con `npx`, `bunx` o `npm install`) es `agent-context-suite`; el **comando** (lo que escribes una vez instalada) es `acsuite`. Los subcomandos son `board`, `task` y `check`, y funcionan igual en A y en B.

**Compatibilidad.** Probada en Windows 11 con Node 20, 22 y 24, y con Bun. En Linux y macOS debería funcionar igual (es Node estándar), pero no está comprobado: si encuentras algún problema, abre un [Issue](https://github.com/Gersom/agent-context-suite/issues).

## Clonar la skill

La skill no está en este repo: vive en [Gersom/agent-context-skill](https://github.com/Gersom/agent-context-skill) y se clona dentro de la suite, en `skill/` (ya está en `.gitignore`):

```sh
git clone https://github.com/Gersom/agent-context-skill skill
```

Sin ese clon todo lo demás funciona, pero los tests de `scripts/skill-checks/` se saltan, y con ellos la comparación del snapshot de plantillas que usa `docs-check` (`scripts/docs-check/test/fixtures/template/`), así que ese snapshot no se valida. Los cambios en la skill se commitean allí (`git -C skill ...`), no en la suite. Si la clonas en otra carpeta, indícala con la variable de entorno `SKILL_DIR`.

## Un solo comando: acsuite

Las tres herramientas de abajo se invocan desde un único CLI, `acsuite <subcomando>` (`board`, `task` y `check`). Para desarrollar la suite, desde la raíz de este repo, `bun run acsuite <subcomando> ...` y los atajos `bun run board`, `bun run task` y `bun run check` son lo mismo:

```sh
bun run acsuite            # lista los subcomandos
bun run acsuite board <ruta-del-proyecto>
```

## Seguimiento de tareas en la terminal

Este repo incluye una herramienta para ver, en una terminal aparte, el estado de las tareas de cualquier proyecto que use la skill (tarea en progreso, pausadas, pendientes y últimas completadas), redibujándose sola cuando cambian sus archivos:

```sh
bun install
bun run board <ruta-del-proyecto>
```

Uso, atajos y cómo lee los archivos: [`scripts/task-tracker/README.md`](./scripts/task-tracker/README.md).

## Gestión de tareas desde la terminal

Una herramienta opcional para consultar y editar las tareas de un proyecto por comandos, sin tocar a mano `handoff.md`, `backlog.md` ni `history.md`; las escrituras exigen `--apply` (sin él muestra el diff):

```sh
bun run task status
bun run task <comando> --help
```

Comandos, flags y cómo escribe: [`scripts/task-manager/README.md`](./scripts/task-manager/README.md).

## Verificar un proyecto antes de trabajar en él

Un verificador de solo lectura que revisa si la documentación de agentes de otro repo sirve a la skill, al seguimiento y a la gestión de tareas, y lista errores y avisos con archivo y línea:

```sh
bun run check <ruta-del-proyecto>
```

Uso y códigos de hallazgo: [`scripts/docs-check/README.md`](./scripts/docs-check/README.md).

## Estructura del repositorio

```
agent-context-suite/
├── skill/           # Clon de Gersom/agent-context-skill (otro repo, ignorado por git): SKILL.md, flujos (docs/) y plantillas (template/)
├── scripts/         # Herramientas de la suite, no parte de la skill: acsuite (CLI único), task-tracker, task-manager, docs-check y código compartido (_shared/)
├── docs/            # Documentación del propio repo: filosofía, arquitectura, diseño y su estado (agents/)
├── package.json     # Versión de la suite (SemVer), licencia y comandos de los scripts
├── LICENSE          # Licencia MIT
└── tsconfig.json    # TypeScript (strict) para scripts/
```

El árbol completo y para qué sirve cada parte están en [`docs/architecture.md`](./docs/architecture.md); qué es cada plantilla del catálogo, en `docs/template-architecture.md` del [repo de la skill](https://github.com/Gersom/agent-context-skill).

## Licencia

[MIT](./LICENSE). La skill, que vive en su propio repo, tiene la misma licencia.

## Apoyar el proyecto

Si la suite o la skill te sirven y quieres apoyar su desarrollo, puedes hacer una donación por PayPal: [paypal.me/gersomalaja](https://paypal.me/gersomalaja).

## Estado

Proyecto en diseño. Ver [`docs/architecture.md`](./docs/architecture.md) para la estructura vigente. Las tareas pendientes viven en `docs/agents/`.
