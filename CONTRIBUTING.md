# Guía de colaboración

## Cómo colaborar

La colaboración es por pull requests; para reportar problemas, usa los Issues. Este repo es la suite `agent-context-suite`: el comando `acsuite` con los subcomandos `board` (tablero de tareas), `task` (gestión de tareas) y `check` (verificación de la documentación de agentes de un proyecto).

Para el mapa del repo, lee [`docs/architecture.md`](./docs/architecture.md); para los principios de diseño, [`docs/philosophy.md`](./docs/philosophy.md).

## Requisitos

- [Bun](https://bun.sh), para desarrollar y correr los tests.
- Node 20 o superior.

## Preparar el entorno

1. Haz un fork del repo y clónalo.
2. Instala las dependencias:

```sh
bun install
```

## Probar tus cambios

```sh
bun test                      # tests
bun run typecheck             # TypeScript
bun run check .               # verifica la documentación de agentes de este repo
bun run acsuite <subcomando>  # corre el CLI desde el repo (board, task o check)
bun run build                 # genera dist/cli.js
```

## La skill (repo aparte)

La skill `agent-context-skill` vive en https://github.com/Gersom/agent-context-skill, con su propia versión, tags y plugin. Los PRs que la afecten van allí.

Para tocar las plantillas, el snapshot de `docs-check` o los tests de `scripts/skill-checks/`, necesitas clonarla dentro de este repo:

```sh
git clone https://github.com/Gersom/agent-context-skill
```

Eso crea la carpeta `agent-context-skill/`. También se acepta que se llame `skill/`, o apuntar a otra carpeta con la variable de entorno `SKILL_DIR`. Git ignora las dos carpetas.

Sin la skill, los tests de `skill-checks` se saltan con un aviso. Eso no bloquea un PR que no los toque.

## Pull requests

- Crea tu rama desde `main`.
- Haz cambios pequeños y enfocados.
- Asegúrate de que pasen `bun test` y `bun run typecheck`.
- Escribe los mensajes de commit con el estilo Conventional Commits, `tipo: descripción` (por ejemplo `fix: …`, `feat: …`, `docs: …`). No incluyas el número de tarea `T-N`: es del flujo interno del mantenedor.
- `docs/agents/` es el estado de trabajo del mantenedor; no hace falta que lo edites.

## Reportar problemas

Abre un Issue en https://github.com/Gersom/agent-context-suite/issues. Se agradece probar en Linux y macOS: hoy la suite solo está probada en Windows 11.
