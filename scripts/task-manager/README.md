# task-manager

Gestiona las tareas de un proyecto que usa el skill `agent-context-kit` editando de forma **quirúrgica** sus archivos (`handoff.md`, `backlog.md`, `history.md` y, en modo multi-operador, `team-backlog.md`), en lugar de que un agente o una persona los edite a mano. Los comandos de negocio se van sumando por etapas; hoy están la infraestructura, dos comandos de diagnóstico, los de lectura (`status`, `next`, `show`) y los de escritura que llevan una tarea por su ciclo de vida (`add`, `start`, `step`, `pause`, `resume`, `block`, `unblock`). El cierre (`close`) viene después.

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
bun run task add --titulo "..." --descripcion "..."          # muestra el diff; NO escribe
bun run task add --titulo "..." --descripcion "..." --apply  # ahora sí escribe
bun run task start 24 --plan - --apply < pasos.txt           # empieza la Tarea 24
bun run task step 2 --apply                                  # marca el paso 2 y actualiza «Qué falta» / «Próximo paso»
bun run task pause --motivo "..." --espera "..." --apply     # pausa la tarea en curso
bun run task resume 24 --apply                               # la retoma
bun run task block 7 --tag dependencia --motivo "depende de la Tarea 3" --apply
bun run task unblock --apply                                 # desbloquea las que dependían de tareas ya cerradas
bun run task <comando> --dry-run      # muestra el diff sin escribir nada (también con --apply)
bun run task <comando> --agents D:/proyectos/mi-app --operator ana
```

**Comandos de hoy** (los marcados con `*` escriben, y solo con `--apply`; los demás son de solo lectura):

| Comando | Qué hace |
|---|---|
| `whoami` | Muestra el modo (multi o plano), el operador y cómo se resolvió, si la carpeta es la propia, y qué archivos existen. |
| `anchors` | Comprueba que cada archivo tenga sus anclas de sección (`in-progress` y `paused` en `handoff.md`; `free`, `blocked` y `grouped` en `backlog.md`; `free` y `blocked` en `team-backlog.md`). `history.md` no usa anclas. Sale con código 1 si falta alguna. |
| `status` | Foto compacta del operador: tarea en curso, pausadas, libres, bloqueadas, últimas 3 cerradas, team-backlog. |
| `next` | Qué hacer ahora: el siguiente paso de la tarea en curso o, sin ella, lo que se puede tomar. |
| `show <N>` | El bloque completo de una tarea y de dónde salió. |
| `add` `*` | Agrega una tarea a tu `backlog.md` (con el siguiente número) o, con `--team`, al `team-backlog.md`. |
| `start <N>` `*` | Empieza una tarea: la saca del backlog y arma «Tarea en progreso» en el `handoff.md`. Con `--team "<título>"`, la toma del `team-backlog.md`. |
| `step [<N \| texto>...]` `*` | Marca (o con `--undo` desmarca) pasos del plan de la tarea en curso y pone al día «Qué falta» y «Próximo paso concreto». |
| `pause` `*` | Pasa la tarea en curso a «Tareas pausadas» y deja «Sin tarea en curso». |
| `resume <N>` `*` | Inverso de `pause`: la pausada vuelve a «Tarea en progreso». |
| `block <N>` `*` | Bloquea una tarea libre del backlog (`Bloqueos` + la mueve a «bloqueadas / pospuestas»). |
| `unblock [<N>]` `*` | Desbloquea una tarea (`N`) o, sin número, las que bloqueaba una tarea ya cerrada. |

**Flags globales** (valen para todos los comandos, antes o después de su nombre):

- `--agents <ruta>`: raíz del proyecto, carpeta de agentes (`docs/agents/` o `agent-context/agents/`) o carpeta de un operador. Sin él, el repo git que contiene la carpeta desde la que lanzaste el comando. Las rutas relativas se resuelven desde esa carpeta y se pueden pegar con comillas.
- `--operator <carpeta>`: operador a usar (modo multi-operador). Sin él, el de `git config user.email`.
- `--apply`: aplica los cambios. **Un comando que escribe no escribe nada sin `--apply`**: solo muestra el diff y avisa («No se escribió nada; repite con --apply»). Los comandos de lectura no lo necesitan.
- `--dry-run`: muestra el diff de lo que se escribiría y no escribe nada. Gana sobre `--apply`: con los dos, no escribe.
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

## Comandos de escritura

Reglas de seguridad que aplica el **núcleo** (no cada comando) a todo comando que escribe (`writes: true` en su definición):

- **`--apply` obligatorio.** Sin él, el comando calcula todo, verifica el resultado y muestra el diff, pero no escribe. Con `--dry-run` tampoco escribe aunque se pase `--apply`.
- **Solo la carpeta propia.** Si la carpeta resuelta no es la del correo de `git config user.email` (otro operador, o no se pudo verificar), el comando se niega con un error claro, sin escribir ni mostrar el diff: las carpetas de otros operadores son de solo lectura. En el repo plano no hay otros operadores. **Excepción:** lo que solo cambia el `team-backlog.md` (`add --team`) es un archivo compartido y no lo exige.
- **Todo por `planChanges`/`commitChanges`:** verificación de legibilidad (anclas y secciones), detección de cambios concurrentes, escritura atómica, CRLF/LF respetados, todo o nada entre los archivos que toca un comando.
- **`--json`:** los comandos de escritura nuevos (`step`, `pause`, `resume`, `block`, `unblock`) lo aceptan: en vez del diff y los mensajes imprimen `{ schema, command, applied, dryRun, pending, files: [{ file, changed, written }], ...datos del comando }`. `applied`: se escribió algún archivo; `pending`: había cambios y falta `--apply`. (`add` y `start` todavía no lo tienen.)
- **Números sin repetir:** antes de numerar, «Próximo número de tarea» tiene que ser mayor que la tarea más alta que ya existe en handoff, backlog (con grupos) e history; si no, error que lo explica (no se elige otro número por cuenta propia).

### `add`

```sh
bun run task add --titulo "Mi tarea" --descripcion "De qué trata" [--decisiones ...] [--bloqueo ...] [--disparador ...] [--detalles ...] [--team] [--apply]
```

Agrega una tarea al final de «Tareas libres» (o de «bloqueadas / pospuestas») de tu `backlog.md`:

- `--titulo` y `--descripcion` son obligatorios. `--decisiones` y `--bloqueo` valen «Ninguno.» por defecto; `--disparador`, «cuando el operador pregunte por tareas pendientes.»; `--detalles` es opcional y, si no se pasa, el campo se omite. Todos admiten `-` para leer de la entrada estándar (un solo flag por ejecución).
- Si `--bloqueo` empieza con `[dependencia]` o `[postergada]` (con o sin acentos graves), la tarea va a «bloqueadas»; si no, a «libres» (con un aviso si dice algo sin ninguno de los dos tags).
- Recibe el número de «Próximo número de tarea», que pasa a N+1 **en la misma edición**. `Agregada`: la fecha de hoy (`YYYY-MM-DD.`, hora local).
- Con `--team`: va al `team-backlog.md`, sin número ni contador, con `### <título único>` (error si el título ya existe, sin distinguir mayúsculas ni acentos) y `Agregada: <fecha> por <operador>`. No lleva `Disparador` (`--disparador` es un error). Para el operador, necesita saber quién eres: el de `git config user.email` o `--operator`; el **operador «solo team-backlog»** (sin carpeta) puede usarlo.

### `start`

```sh
bun run task start 24 [--plan -] [--modo "uno a la vez"] [--force] [--apply]
bun run task start --team "Migrar el CI" [--plan -] [--modo ...] [--force] [--apply]
```

Empieza una tarea, **en una sola operación** sobre todos los archivos (o ninguno):

- Exige que **no haya otra tarea en curso** (si la hay, error que sugiere pausarla con `pause`) y que la elegida esté en «libres». Una **bloqueada** da error salvo con `--force` (queda constancia en la salida); una **pausada** (se retoma con `resume`) o **cerrada**, error claro; una **agrupada**, error (sacarla de «Tareas agrupadas» todavía no está soportado). Repetir el mismo `start --apply` falla limpio: ya hay una tarea en curso.
- Saca su bloque de `backlog.md` sin dejar huecos ni líneas en blanco dobles; si era la última, la sección queda con «Ninguna.» (`None.` en inglés).
- Reescribe el cuerpo de «Tarea en progreso» de `handoff.md` según su plantilla, sin tocar el resto del archivo ni las anclas: la línea `Tarea N — título` antes de la primera subsección `###`, un párrafo con la descripción, **Plan** (solo con `--plan`: una línea por paso; se agrega siempre el último paso «Documentar cierre de tarea»; con `--modo`, la línea «Modo de ejecución acordado»), **Qué falta**, **Decisiones a medio camino** (con lo que la tarea traía en «decisiones», si no era «Ninguno») y **Próximo paso concreto** (el primer paso del plan, o «Empezar la tarea.»), en ese orden. Los campos de la tarea que el handoff no tiene dónde poner (`Detalles`, `Desbloquea`...) se copian tal cual, en líneas `- **Campo:** valor` tras la descripción, para que no se pierdan al sacarla del backlog.
- Con `--team`: la tarea sale de `team-backlog.md` (por título, o una parte única), recibe el siguiente número de tu secuencia (el contador pasa a N+1) y el handoff lleva la línea `- **Origen:** team-backlog`. Los tres archivos cambian juntos.
- La rama y el commit no son asunto del script.

### `step`

```sh
bun run task step [<N | texto>...] [--undo] [--falta <texto>] [--decisiones <texto>] [--proximo <texto>] [--json] [--apply]
```

Marca pasos del «Plan» de la tarea en curso (Regla 6 de `rules.md`: el handoff se pone al día en cada paso):

- Cada argumento es el **número** del paso (posición en el plan, desde 1) o **parte de su texto** (sin distinguir mayúsculas ni acentos; si coincide con varios, error que los lista). Se pueden pasar varios. `--undo` los desmarca. Un paso que ya estaba en ese estado avisa y no cambia nada.
- «Qué falta» y «Próximo paso concreto» se reescriben **solos solo si siguen con el texto que puso el script**: el de `start` (`Todos los pasos del plan.`, el primer paso) o el que `step` generó antes (`Pasos pendientes:` con la lista de los pasos sin hacer; `Plan completo: falta cerrar la tarea.` al terminar). Un texto que alguien escribió no se pisa: se avisa y se actualiza con `--falta` / `--proximo`. «Decisiones a medio camino» nunca cambia solo (`--decisiones`).
- `--falta`, `--decisiones` y `--proximo` (admiten `-` para stdin; uno solo por ejecución) reemplazan el cuerpo de esa subsección, también sin marcar ningún paso (`step --proximo "..."`). Los comentarios HTML del principio de la subsección se conservan.
- Las subsecciones se reconocen por su título en español o inglés. Sin plan (sin checkboxes) no hay pasos que marcar; sí se pueden actualizar los textos.

### `pause`

```sh
bun run task pause --motivo <texto> --espera <texto> [--falta <texto>] [--decisiones <texto>] [--proximo <texto>] [--json] [--apply]
```

Pasa la tarea en curso al final de «Tareas pausadas» como un bloque `### Tarea N — título` y deja «Tarea en progreso» en `Sin tarea en curso` (los comentarios y las anclas no se mueven):

- Campos del bloque, en este orden: `Descripción`, los extras que la tarea traía (`Origen`, `Detalles`...), `Plan` (los checkboxes tal cual, con lo ya marcado), `Modo de ejecución acordado`, `Qué falta`, `Decisiones a medio camino`, `Próximo paso concreto`, `Por qué se pausó` (`--motivo`, obligatorio) y `Qué espera para retomarse` (`--espera`, obligatorio). `Descripción`, los extras y el modo no figuran en el formato de la plantilla: se agregan para que `resume` pueda devolver la tarea tal cual estaba. `--falta`, `--decisiones` y `--proximo` reemplazan lo que se guarda.
- **Contenido ajeno:** si «Tarea en progreso» tiene algo que no reconoce —una subsección con otro título, texto suelto dentro del plan que no sea un paso ni el modo, checkboxes fuera del plan, texto antes de la línea de la tarea— se niega con un error que lo dice y no escribe nada: hay que pausar a mano. No pierde información sin avisar.

### `resume`

```sh
bun run task resume <N | T-N> [--json] [--apply]
```

El inverso de `pause`: saca la tarea de «Tareas pausadas» y rearma «Tarea en progreso» con su descripción, plan (con lo ya marcado), modo, textos y extras. `Por qué se pausó` y `Qué espera para retomarse` se descartan. Falla si **ya hay una tarea en curso** (el error sugiere `pause`) o si la tarea no está pausada. Una pausada escrita a mano a la que le falte algún campo recibe los textos por defecto de `start`. `pause` + `resume` deja el archivo idéntico.

### `block`

```sh
bun run task block <N> --tag <dependencia|postergada> --motivo <texto> [--json] [--apply]
```

Bloquea una tarea **libre** de tu `backlog.md`: pone `Bloqueos` en `` `[tag]` motivo `` (si ya traía un `[Resuelto ...]` de un bloqueo anterior, queda después: el vigente va primero) y mueve su bloque al final de «Tareas bloqueadas / pospuestas». Sin formato nuevo: nombrar `Tarea N` en el motivo es lo que permite que `unblock` la desbloquee sola. Errores: la tarea ya está bloqueada (editar `Bloqueos` a mano), agrupada (sacarla de «Tareas agrupadas» no está soportado), pausada, en curso o cerrada. Solo opera sobre tu `backlog.md` (no sobre el `team-backlog.md`).

### `unblock`

```sh
bun run task unblock [<N | T-N>] [--json] [--apply]
```

Mueve tareas de «bloqueadas / pospuestas» al final de «Tareas libres» (Regla 7: `Bloqueos` no se borra, pasa a `` `[Resuelto el <fecha>]` — era `[tag]` motivo ``):

- **Sin número**, revisa todas las bloqueadas: desbloquea solas las cuyo motivo nombra `Tarea N` y **todas esas tareas figuran cerradas en `history.md`** (las mismas que `status` marca «candidata a desbloquear»), y las que ya no tenían un bloqueo vigente (solo se mueven). Lista aparte las de **revisión manual** (el motivo no nombra una tarea: texto libre, o nombra una de otro operador con `T-N@operador`) y las que **siguen bloqueadas** (alguna tarea mencionada no está cerrada). Nada de eso se toca.
- **Con número**, desbloquea esa tarea sin más condiciones (la revisión manual ya la hizo quien lo pide); error si no está bloqueada.
- Si no hay nada que desbloquear, lo dice y no escribe.

### Dónde y cómo escriben

- **Ubicación:** al final de la sección, justo tras el último contenido y antes de las líneas en blanco que la separan de la siguiente. **Espaciado:** el que ya usa el archivo (lo que separa a sus dos últimas tareas; una línea en blanco si no hay dos). Si la sección solo tenía el texto de vacío («Ninguna.»), un placeholder de la plantilla o la tarea anterior, el bloque lo **reemplaza**; los comentarios HTML del principio de la sección se conservan. Las tareas agrupadas no se tocan: un grupo no recibe tareas nuevas.
- **Idioma:** el header usa la palabra que ya usan las tareas del archivo (`Tarea`, `Task`...) y las etiquetas de campo salen de una tarea existente; si no hay de dónde copiar, una tabla mínima en **español** (por defecto) o **inglés** (si la palabra de header o las etiquetas lo son). No se inventan traducciones a otros idiomas: ante un idioma desconocido, o sin ninguna pista, escribe en español y lo avisa en la salida. Los títulos de subsección del handoff (Plan, Qué falta...) salen de la misma tabla.
- **Finales de línea:** un archivo CRLF sigue siendo CRLF y uno LF, LF; lo escrito no reformatea nada de lo que no toca.

## Consulta reutilizable (`src/query/`)

Los comandos de lectura son una capa fina sobre un módulo de consulta que los comandos que editan (`add`, `start`, `step`, `close`...) también usan, para no repetir cómo se interpreta cada archivo:

- `query/find.ts`: `findTask(docs, n)` devuelve dónde vive la tarea `n` (lugar, título, grupo, archivo y rango sin líneas en blanco; más de uno si está repetida); `locationText(location)` el fragmento; `findTeamTasks(docs, query)` las del team-backlog por título; `parseTarget(arg)` interpreta `N`, `T-N@operador` o un título; `readOperatorDocs(workspace, folder)` lee (solo lectura) los archivos de otro operador; `describeKnownNumbers(docs)`.
- `query/state.ts`: `buildState(docs)` arma el estado completo (lo que muestra `status`); `buildTaskIndex(docs)` y `knownNumbers(docs)`; `planProgress`, `nextConcreteStep` y `fieldValue` (campo por etiqueta) son sus piezas.
- `query/next-number.ts`: `findNextTaskNumber(text)` devuelve el valor, la línea y los offsets de los dígitos de «Próximo número de tarea».
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
- **Carpeta de otro operador:** `--operator` permite apuntar a la de otro, pero esas carpetas son de solo lectura según las reglas del proyecto. `whoami` lo marca (`Carpeta propia: no`) y los comandos que escriben se niegan (ver «Comandos de escritura»).
- **Operador «solo team-backlog»:** los comandos que solo escriben en el `team-backlog.md` (`add --team`) lo resuelven igual (`ctx.workspace({ allowFolderless: true })`): trae su nombre pero no hay handoff, backlog ni history. Para todos los demás sigue siendo el error de arriba.

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
- **`--apply` en los comandos de escritura:** `ctx.commit()` lo decide en el núcleo: un comando con `writes: true` solo escribe con `--apply` (sin él hace lo mismo que `--dry-run`, con otro aviso final); uno sin `writes` escribe directamente.

## Agregar un comando

Cada comando es un módulo de `src/commands/` que exporta un objeto con `name`, `summary`, `usage`, sus `flags` (opcionales) y `run(ctx)`; se importa y se suma a la lista de `src/commands/index.ts`. El despachador no se toca. Un comando que escribe lleva además `writes: true`: así `--apply`, la ayuda y la regla de la carpeta propia valen sin que el comando haga nada. Detalle del contrato (`ctx.args`, `ctx.flags`, `ctx.workspace()`, `ctx.docs()`, `ctx.now()`, `ctx.commit()`): `src/cli/types.ts`.

## Estructura

```
scripts/task-manager/
├── index.ts          # Arranque: llama al despachador y fija el código de salida
├── src/
│   ├── cli/          # Despachador, parseo de flags (y stdin), ayuda, errores y contrato de los comandos
│   ├── commands/     # Un módulo por comando + index.ts (el registro)
│   ├── query/        # Consulta reutilizable: dónde vive una tarea, estado del operador, próximo número, formato
│   ├── workspace/    # Ruta de agentes, operador (operators.md + correo de git), espacio de trabajo y lectura de archivos
│   ├── edit/         # Ediciones por rango, ubicar/sacar un bloque en una sección (`layout.ts`), verificación de legibilidad, diff, escritura atómica y cambios de varios archivos
│   └── write/        # Lo que escriben los comandos: idioma y etiquetas, formato de los bloques y del handoff, contador de número de tarea, lectura de «Tarea en progreso» (`handoff.ts`), campo `Bloqueos` (`blocking.ts`) y `--json` de los que escriben
└── test/             # Tests de `bun test` en espejo de src/ + e2e/ (script entero); trabajan en directorios temporales
```

## Desarrollo

Desde la raíz de este repo:

```sh
bun test            # tests (en scripts/task-manager/test/, scripts/task-tracker/test/ y scripts/_shared/test/)
bun run typecheck   # chequeo de tipos (Bun ejecuta TypeScript sin revisar tipos)
```

Los tests nunca tocan los `docs/` reales: usan proyectos temporales armados con los fixtures de `scripts/_shared/test/fixtures/`.
