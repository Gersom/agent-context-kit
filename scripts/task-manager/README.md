# task-manager

Gestiona las tareas de un proyecto que usa el skill `agent-context-kit` editando de forma **quirúrgica** sus archivos (`handoff.md`, `backlog.md`, `history.md` y, en modo multi-operador, `team-backlog.md`), en lugar de que un agente o una persona los edite a mano. Los comandos de negocio se van sumando por etapas; hoy están la infraestructura, dos comandos de diagnóstico y los de lectura (`status`, `next`, `show`). Los de escritura (`add`, `start`, ...) vienen después.

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
bun run task status                   # foto compacta: en curso, pausadas, libres, bloqueadas, últimas cerradas
bun run task next                     # qué hacer ahora
bun run task show 24                  # el bloque completo de la Tarea 24, viva donde esté
bun run task status --json            # lo mismo, estructurado, para otros scripts
bun run task <comando> --dry-run      # muestra el diff sin escribir nada
bun run task <comando> --agents D:/proyectos/mi-app --operator ana
```

**Comandos de hoy** (todos de solo lectura):

| Comando | Qué hace |
|---|---|
| `whoami` | Muestra el modo (multi o plano), el operador y cómo se resolvió, si la carpeta es la propia, y qué archivos existen. |
| `anchors` | Comprueba que cada archivo tenga sus anclas de sección (`in-progress` y `paused` en `handoff.md`; `free`, `blocked` y `grouped` en `backlog.md`; `free` y `blocked` en `team-backlog.md`). `history.md` no usa anclas. Sale con código 1 si falta alguna. |
| `status` | Foto compacta del operador: tarea en curso, pausadas, libres, bloqueadas, últimas 3 cerradas, team-backlog. |
| `next` | Qué hacer ahora: el siguiente paso de la tarea en curso o, sin ella, lo que se puede tomar. |
| `show <N>` | El bloque completo de una tarea y de dónde salió. |

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

## Comandos de lectura

Pensados para un agente que quiere ahorrar tokens: en vez de leer `history.md` entero o todo el backlog, pide lo que necesita. Ninguno escribe, y de `history.md` solo imprimen la cabecera de las entradas (`status`) o la entrada pedida (`show`), nunca el archivo entero. Todos aceptan `--json` y los flags globales (`--agents`, `--operator`). Las secciones vacías no se imprimen.

### `status`

Foto del estado del operador resuelto, en este orden:

- **En curso:** `Tarea N — título` con su archivo y línea, el avance del plan (`Plan 2/8 — siguiente: <primer paso pendiente>`) y el **próximo paso concreto**, con el título de su subsección. Como los títulos de subsección están traducidos, ese paso se elige por **posición**: es la última subsección de detalle de «Tarea en progreso» (sin la del plan —la que tiene checkboxes— y sin placeholders). Sin tarea: `En curso: Sin tarea en curso` (es la única línea que no se oculta).
- **Pausadas**, **Libres** (en el orden del archivo; las de un grupo, con `[grupo: …]`) y **Bloqueadas** con su tag (`[dependencia]`/`[postergada]`) y las tareas que menciona el motivo con su estado (`Tarea 3 (libre)`, `Tarea 11 (cerrada)`...). Una bloqueada cuyas tareas mencionadas están **todas cerradas en history.md**, o que ya no tiene bloqueo vigente, se marca `⇒ candidata a desbloquear (Regla 7)`.
- **Próximo número de tarea** de `backlog.md`: se busca por forma (un campo en negrita con solo un número en la introducción del archivo), no por el texto de su etiqueta.
- **Últimas cerradas:** las 3 primeras entradas de `history.md` (fecha, ✅/❌, número y título).
- **Team-backlog:** conteo y títulos de libres y bloqueadas (solo modo multi y si existe el archivo).
- **Avisos:** archivos sin anclas o sin una sección, número de tarea bajo o repetido, tarea cerrada en history que sigue en el backlog, bloqueada sin bloqueo vigente, y que la carpeta es de otro operador (solo lectura).

### `next`

El mínimo para decidir qué hacer; no elige por el operador.

- **Con tarea en curso:** su primer paso pendiente y el próximo paso concreto (o «Plan completo: falta cerrar la tarea»).
- **Sin tarea en curso:** las pausadas (retomables), las libres en el orden del archivo, las libres del team-backlog y las bloqueadas candidatas a desbloquear, más una sugerencia. Cada libre muestra su `Disparador` si es corto (hasta 100 caracteres) y no se repite igual en otra tarea: un disparador repetido es el genérico de la plantilla y no ayuda a elegir. El campo se reconoce por su etiqueta `Disparador` o `Trigger` (las etiquetas están traducidas).

### `show <N>`

Imprime el bloque **completo** de la tarea, viva donde esté, con una cabecera `--- Tarea N · <lugar> · <archivo> líneas A-B ---`. Solo lee ese fragmento (el rango que da el parser, sin las líneas en blanco de los extremos):

| Lugar | Qué imprime |
|---|---|
| `en curso (handoff)` | La sección «Tarea en progreso»: la línea de la tarea, la descripción, el plan y las subsecciones. |
| `pausada (handoff)`, `libre`, `bloqueada` | Su bloque `### Tarea N — título` con sus campos. |
| `agrupada (backlog)` | Su bloque `####` (el grupo se indica en la cabecera). |
| `history` | Su entrada `## fecha — ✅/❌ Tarea N — título` (con «hecha» o «descartada»). |

Variantes del argumento:

- `T-N` o `N`: una tarea propia. `T-N@operador` (o `N@operador`): la de otro operador, resolviendo su carpeta por `operators.md`; es solo lectura (las carpetas ajenas no se editan) y no lee su team-backlog.
- Cualquier otro texto es el **título, o una parte única del título, de una tarea de `team-backlog.md`** (sin distinguir mayúsculas ni acentos). Si la parte coincide con varias, lista los títulos y pide uno más específico.
- **Número inexistente:** error claro con los números conocidos (`Números conocidos: 1 a 31 (30 tareas).`) y el próximo número de tarea.
- **Número en más de un lugar** (ej. en history y aún en el backlog por error): se muestran todos con su origen y se avisa.

### Esquema `--json`

La salida es un objeto con `schema` (versión del esquema, hoy `1`; sube si un campo cambia de forma o de significado, agregar campos no la sube) y `command`. Los campos ausentes son `null` o una lista vacía, nunca se omiten. Las rutas `file` son relativas a la raíz del proyecto y con `/`; las líneas son 1-based.

`status`:

```jsonc
{
  "schema": 1, "command": "status",
  "operator": "gersom",            // null en el repo plano
  "mode": "multi",                 // "multi" | "flat"
  "current": {                     // null si no hay tarea en curso
    "number": 24, "title": "...", "line": 16, "file": "docs/agents/gersom/handoff.md",
    "plan": { "done": 2, "total": 8, "nextStep": "Paso 3 — ..." },       // plan: null si no trae checkboxes; nextStep: null si está completo
    "nextConcreteStep": { "title": "Próximo paso concreto", "text": "..." }  // null si no hay subsección de detalle
  },
  "paused": [{ "number": 8, "title": "...", "plan": { "done": 1, "total": 2, "nextStep": "..." } }],
  "free": [{ "number": 14, "title": "...", "group": "título del grupo" /* o null */, "trigger": "..." /* o null */ }],
  "blocked": [{
    "number": 4, "title": "...", "tag": "dependencia" /* null si ya no hay bloqueo vigente */, "reason": "...",
    "refs": [{ "number": 3, "title": "..." /* o null */, "state": "free" }],  // state: closed | current | paused | free | blocked | unknown
    "unblockCandidate": false
  }],
  "nextTaskNumber": 32,            // null si backlog.md no existe o no tiene la línea
  "recentHistory": [{ "date": "2026-10-07", "status": "done", "number": 31 /* o null */, "title": "..." }],  // status: done | discarded; hasta 3
  "team": { "free": [{ "title": "...", "tag": null, "trigger": null }], "blocked": [{ "title": "...", "tag": "postergada", "trigger": null }] },  // null si no hay team-backlog.md
  "warnings": ["..."]
}
```

`next`: `{ schema, command, mode, current, paused, free, team, unblockCandidates, suggestion }`. `mode` es `current` (con tarea en curso; `current` como en `status` y el resto vacío), `pick` (sin tarea en curso y algo que tomar) o `empty` (nada pendiente). Las listas `paused`, `free` y `unblockCandidates` tienen la forma de `status`; `team` es la lista de libres del team-backlog (`{ title, tag, trigger }`). Los disparadores salen siempre completos (el filtro de «corto y no repetido» es solo del texto). `suggestion` es `null` con tarea en curso.

`show`: `{ schema, command, query, matches, warnings }`. Cada elemento de `matches`:

```jsonc
{
  "place": "history",     // in-progress | paused | free | blocked | grouped | history | team-free | team-blocked
  "number": 23,           // null en las de team-backlog
  "title": "...",
  "group": null,          // título del grupo si es agrupada
  "outcome": "done",      // solo en history: done | discarded; si no, null
  "operator": null,       // carpeta del operador si se pidió con T-N@operador
  "file": "docs/agents/gersom/history.md", "path": "D:/.../history.md",
  "startLine": 120, "endLine": 131,
  "text": "## 2026-10-06 — ✅ Tarea 23 — ..."   // el fragmento, con finales de línea LF
}
```

## Consulta reutilizable (`src/query/`)

Los comandos de lectura son una capa fina sobre un módulo de consulta que los comandos que editan (`add`, `start`, `step`, `close`...) también usan, para no repetir cómo se interpreta cada archivo:

- `query/find.ts`: `findTask(docs, n)` devuelve dónde vive la tarea `n` (lugar, título, grupo, archivo y rango sin líneas en blanco; más de uno si está repetida); `locationText(location)` el fragmento; `findTeamTasks(docs, query)` las del team-backlog por título; `parseTarget(arg)` interpreta `N`, `T-N@operador` o un título; `readOperatorDocs(workspace, folder)` lee (solo lectura) los archivos de otro operador; `describeKnownNumbers(docs)`.
- `query/state.ts`: `buildState(docs)` arma el estado completo (lo que muestra `status`); `buildTaskIndex(docs)` y `knownNumbers(docs)`; `planProgress`, `nextConcreteStep` y `fieldValue` (campo por etiqueta) son sus piezas.
- `query/next-number.ts`: `findNextTaskNumber(text)` devuelve el valor y la línea de «Próximo número de tarea».
- `query/lines.ts`: `trimRange(text, range)` y `lineAt(text, offset)`.
- `query/format.ts`: texto compacto y `emitJson`, compartidos por los comandos de lectura.

La lógica de interpretación (bloqueos, tareas que menciona un motivo, plan y subsecciones) es la del task-tracker, pero sale de `scripts/_shared/` y de una reescritura chica en `state.ts`: el task-manager no importa del tracker.

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
│   ├── query/        # Consulta reutilizable: dónde vive una tarea, estado del operador, próximo número, formato
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
