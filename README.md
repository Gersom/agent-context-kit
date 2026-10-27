# agent-context-suite

Suite de herramientas para trabajar con la skill [agent-context-skill](https://github.com/Gersom/agent-context-skill), que genera documentación de contexto de proyecto para que **cualquier agente de IA** (Claude Code, Cursor, Copilot, etc.) entienda en qué momento está un proyecto, qué falta, qué se hizo y por qué — sin depender de la memoria de una sola conversación. La skill vive en su propio repo (`agent-context-skill`); este repo tiene las herramientas (seguimiento, gestión y verificación de tareas).

## Herramientas

La suite trae tres herramientas, que se usan con el comando `acsuite`:

- **`acsuite board`**: tablero de tareas en vivo en la terminal (en progreso, pausadas, pendientes y últimas completadas), que se redibuja cuando cambian los archivos.
- **`acsuite task`**: consulta y edita las tareas sin tocar a mano `handoff.md`, `backlog.md` ni `history.md`.
- **`acsuite check`**: verifica que la documentación de agentes del proyecto esté en orden, con errores y avisos por archivo y línea.

## Instalar la suite

### Requisitos

- Node 20 o superior, o Bun.
- Haber iniciado la skill [agent-context-skill](https://github.com/Gersom/agent-context-skill) en el proyecto en el que ejecutas la suite.

### Recomendado: instalarla de forma global

Se instala una vez y desde entonces existe el comando `acsuite` en cualquier carpeta:

```sh
bun add -g agent-context-suite@latest
```

O con npm:

```sh
npm install -g agent-context-suite@latest
```

Para actualizarla, ejecuta el mismo comando.

### Alternativa: usarla sin instalar nada

Con `npx` o `bunx` se descarga, se ejecuta y termina, sin dejar instalado el comando `acsuite`, así que cada vez se escribe completo:

```sh
npx agent-context-suite@latest board
```

```sh
bunx agent-context-suite@latest board
```

`@latest` trae siempre la versión más reciente. Sin ruta, usa el proyecto de la carpeta donde lo ejecutas; si quieres otro, pásale su ruta al final (`npx agent-context-suite@latest board D:/otro-proyecto`).

**Nombres.** El *paquete* (lo que escribes con `npm install`, `npx` o `bunx`) es `agent-context-suite`; el *comando* (una vez instalada) es `acsuite`.

**Compatibilidad.** Probada en Windows 11 con Node 20, 22 y 24, y con Bun. En Linux y macOS debería funcionar igual (es Node estándar), pero no está comprobado: si encuentras algún problema, abre un [Issue](https://github.com/Gersom/agent-context-suite/issues).

## Uso de los comandos

Los tres subcomandos trabajan sobre un proyecto que use la skill. Con la suite instalada (si no, antepón `npx agent-context-suite@latest` al subcomando):

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `acsuite board [ruta]` | Tablero de tareas en vivo en la terminal (en progreso, pausadas, pendientes y últimas completadas) | `acsuite board` |
| `acsuite task <comando>` | Consulta y edita las tareas sin tocar a mano `handoff.md`, `backlog.md` ni `history.md`; las escrituras exigen `--apply` | `acsuite task status` |
| `acsuite check [ruta]` | Verifica que la documentación de agentes del proyecto esté en orden, con errores y avisos por archivo y línea | `acsuite check` |

Sin ruta, `board` y `check` usan el proyecto de la carpeta donde ejecutas el comando (como `task`): se sube desde ahí hasta la raíz del repo git. Si quieres revisar otro proyecto, pásale la ruta (`acsuite check D:/otro-proyecto`).

`acsuite` sin argumentos lista los subcomandos, y `acsuite <subcomando> --help` muestra la ayuda de cada uno. Detalle de cada herramienta: [`board`](./scripts/task-tracker/README.md), [`task`](./scripts/task-manager/README.md) y [`check`](./scripts/docs-check/README.md).

## Seguimiento de tareas en la terminal

Este repo incluye una herramienta para ver, en una terminal aparte, el estado de las tareas de cualquier proyecto que use la skill (tarea en progreso, pausadas, pendientes y últimas completadas), redibujándose sola cuando cambian sus archivos:

```sh
acsuite board
```

Vigila el proyecto de la carpeta actual; para otro, pásale la ruta (`acsuite board D:/otro-proyecto`). Uso, atajos y cómo lee los archivos: [`scripts/task-tracker/README.md`](./scripts/task-tracker/README.md).

## Gestión de tareas desde la terminal

Una herramienta opcional para consultar y editar las tareas de un proyecto por comandos, sin tocar a mano `handoff.md`, `backlog.md` ni `history.md`; las escrituras exigen `--apply` (sin él muestra el diff):

```sh
acsuite task status
acsuite task <comando> --help
```

Comandos, flags y cómo escribe: [`scripts/task-manager/README.md`](./scripts/task-manager/README.md).

## Verificar un proyecto antes de trabajar en él

Un verificador de solo lectura que revisa si la documentación de agentes de otro repo sirve a la skill, al seguimiento y a la gestión de tareas, y lista errores y avisos con archivo y línea:

```sh
acsuite check
```

Revisa el proyecto de la carpeta actual; para otro, pásale la ruta (`acsuite check D:/otro-proyecto`). Uso y códigos de hallazgo: [`scripts/docs-check/README.md`](./scripts/docs-check/README.md).

## Estructura del repositorio

```
agent-context-suite/
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

## Colaborar

Si deseas colaborar con el proyecto, consulta la [guía de colaboración](https://github.com/Gersom/agent-context-suite/blob/main/CONTRIBUTING.md).
