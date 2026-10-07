# task-manager

Gestiona las tareas de un proyecto que usa el skill `agent-context-kit` editando de forma **quirúrgica** sus archivos (`handoff.md`, `backlog.md`, `history.md` y, en modo multi-operador, `team-backlog.md`), en lugar de que un agente o una persona los edite a mano. Los comandos de negocio (`status`, `next`, `show`, `add`, `start`, ...) se van sumando por etapas; hoy están la infraestructura y dos comandos de prueba.

Es **opcional** y es una herramienta de este repo, no parte del skill: no se copia a los repos destino (principio 4 de [`docs/philosophy.md`](../../docs/philosophy.md)). Sin ella, los archivos se editan a mano igual.

## Requisitos

- [Bun](https://bun.sh) (el script está en TypeScript; Bun lo ejecuta sin compilar).
- Instalar las dependencias una vez, desde la raíz de este repo: `bun install`.

## Uso

Desde la raíz de este repo:

```sh
bun run task                          # lista los comandos
bun run task <comando> --help         # ayuda de un comando
bun run task whoami                   # operador, carpeta y archivos resueltos
bun run task anchors                  # verifica las anclas de sección de cada archivo
bun run task <comando> --dry-run      # muestra el diff sin escribir nada
bun run task <comando> --agents D:/proyectos/mi-app --operator ana
```

**Comandos de hoy** (ambos de solo lectura):

| Comando | Qué hace |
|---|---|
| `whoami` | Muestra el modo (multi o plano), el operador y cómo se resolvió, si la carpeta es la propia, y qué archivos existen. |
| `anchors` | Comprueba que cada archivo tenga sus anclas de sección (`in-progress` y `paused` en `handoff.md`; `free`, `blocked` y `grouped` en `backlog.md`; `free` y `blocked` en `team-backlog.md`). `history.md` no usa anclas. Sale con código 1 si falta alguna. |

**Flags globales** (valen para todos los comandos, antes o después de su nombre):

- `--agents <ruta>`: raíz del proyecto, carpeta de agentes (`docs/agents/` o `agent-context/agents/`) o carpeta de un operador. Sin él, el repo git que contiene la carpeta desde la que lanzaste el comando. Las rutas relativas se resuelven desde esa carpeta y se pueden pegar con comillas.
- `--operator <carpeta>`: operador a usar (modo multi-operador). Sin él, el de `git config user.email`.
- `--dry-run`: muestra el diff de lo que se escribiría y no escribe nada.
- `-h`, `--help`: ayuda general o del comando.

**Texto largo por stdin:** un flag de texto que lo admita acepta `-` como valor y lee su contenido de la entrada estándar (se normaliza a LF y se quita el salto de línea final):

```sh
bun run task <comando> --detalles - <<'EOF'
Varias líneas
de texto.
EOF
```

**Códigos de salida:** `0` bien; `1` error (operador o archivo que no se pudo resolver, edición inválida, ...), con el mensaje en español en la salida de error; `2` mal uso de la línea de comandos (comando o flag desconocido, falta un valor).

## Qué operador y qué carpeta usa

Sigue [`skill/docs/multi-operator.md`](../../skill/docs/multi-operator.md) y nunca escribe al resolver:

- **Multi-operador** si la carpeta de agentes tiene `operators.md`; **plano** si no, y trae `handoff.md` directamente (en ese caso no hay operador ni `team-backlog.md`).
- **Operador:** `--operator <carpeta>` si se indicó (sin distinguir mayúsculas); si no, el que figura en `operators.md` con el correo de `git config user.email`. Pasar directamente la carpeta de un operador como `--agents` también sirve.
- **Es un error explícito, que dice qué falta y qué opciones hay:**
  - el correo de git no se puede leer, o no figura en `operators.md`;
  - el operador figura como «solo team-backlog» (no tiene carpeta, handoff, backlog ni history);
  - la carpeta del operador no existe o no tiene `handoff.md`;
  - `operators.md` no tiene operadores legibles (las líneas sin leer se avisan);
  - **falta `operators.md` pero hay carpetas de operador:** no se asume repo plano (es el «estado inconsistente» de `multi-operator.md`); hay que restaurarlo;
  - `--operator` en un repo plano.
- **Carpeta de otro operador:** `--operator` permite apuntar a la de otro, pero esas carpetas son de solo lectura según las reglas del proyecto. `whoami` lo marca (`Carpeta propia: no`) y los comandos que escriban deben tenerlo en cuenta.

## Archivos que lee

Lee `handoff.md`, `backlog.md` e `history.md` de la carpeta del operador y `team-backlog.md` de la raíz de agentes (solo en modo multi-operador). Los parsea con los parsers de [`scripts/_shared/`](../_shared/) (los mismos del task-tracker), que devuelven la posición exacta de cada sección, tarea, campo y paso del plan.

- **Archivo ausente** (el set mínimo del skill solo genera `handoff.md`; `team-backlog.md` puede no existir): no es un error al leer; queda marcado como inexistente y cada comando decide si lo necesita. Este script no crea archivos que faltan.
- **Archivo que no se puede leer** (permisos, trabado, es una carpeta): sí es un error, con su ruta.

## Edición quirúrgica

Un archivo que se modifica no se reformatea: el diff muestra solo el cambio pedido (principio 5 de `philosophy.md`). El helper de `src/edit/` trabaja así:

- **Ediciones por rango u offset** sobre el texto original: reemplazar un rango, insertar en un offset o borrar un rango. Los rangos son los de los parsers (sobre el texto con saltos de línea LF); se traducen al texto crudo y lo insertado se convierte al final de línea del archivo, así un archivo CRLF sigue siendo CRLF y uno LF, LF.
- **Sin solapamientos:** ediciones que se pisan se rechazan antes de escribir.
- **Verificación posterior:** el resultado se vuelve a parsear y, si la edición rompe las anclas o secciones que el archivo tenía, no se escribe nada y falla con el motivo. Lo que ya estaba mal antes de editar no impide editar.
- **Todo o nada al calcular:** un comando que toca varios archivos calcula todos antes de escribir el primero. Si uno falla, no se escribe ninguno.
- **Escritura atómica y solo si cambió:** cada archivo se escribe a un temporal y se renombra sobre el original (con reintentos si Windows lo tiene abierto un instante); un archivo sin cambios no se toca (ni su fecha de modificación). Antes de escribir se comprueba que nadie lo haya modificado desde que se leyó.
- **`--dry-run`:** muestra, por archivo, el diff (`-` quita, `+` agrega, con unas líneas de contexto) y no escribe nada.

## Agregar un comando

Cada comando es un módulo de `src/commands/` que exporta un objeto con `name`, `summary`, `usage`, sus `flags` (opcionales) y `run(ctx)`; se importa y se suma a la lista de `src/commands/index.ts`. El despachador no se toca. Detalle del contrato (`ctx.args`, `ctx.flags`, `ctx.workspace()`, `ctx.docs()`, `ctx.commit()`): `src/cli/types.ts`.

## Estructura

```
scripts/task-manager/
├── index.ts          # Arranque: llama al despachador y fija el código de salida
├── src/
│   ├── cli/          # Despachador, parseo de flags (y stdin), ayuda, errores y contrato de los comandos
│   ├── commands/     # Un módulo por comando + index.ts (el registro)
│   ├── workspace/    # Ruta de agentes, operador (operators.md + correo de git), espacio de trabajo y lectura de archivos
│   └── edit/         # Ediciones por rango, verificación de legibilidad, diff, escritura atómica y cambios de varios archivos
└── test/             # Tests de `bun test` en espejo de src/ + e2e/ (script entero); trabajan en directorios temporales
```

## Desarrollo

Desde la raíz de este repo:

```sh
bun test            # tests (en scripts/task-manager/test/, scripts/task-tracker/test/ y scripts/_shared/test/)
bun run typecheck   # chequeo de tipos (Bun ejecuta TypeScript sin revisar tipos)
```

Los tests nunca tocan los `docs/` reales: usan proyectos temporales armados con los fixtures de `scripts/_shared/test/fixtures/`.
