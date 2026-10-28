# task-tracker

Muestra en la terminal el estado de las tareas de un proyecto que usa la skill `agent-context-skill` y se redibuja solo cada vez que cambian sus archivos. Está pensado para tenerlo abierto en una terminal mientras en otra un agente de IA trabaja sobre el proyecto.

Es una herramienta de este repo, no parte de la skill: no se copia a los repos destino. Se lanza desde acá y apunta a la carpeta del proyecto que quieras seguir.

## Requisitos

- [Bun](https://bun.sh) (el script está en TypeScript; Bun lo ejecuta sin compilar).
- Instalar las dependencias una vez, desde la raíz de este repo:

  ```sh
  bun install
  ```

## Uso

`bun run board` es el subcomando `board` del CLI único de la suite: equivale a `bun run acsuite board`.

Desde la raíz de este repo:

```sh
bun run board                         # el proyecto de la carpeta actual
bun run board D:/proyectos/mi-app     # raíz del proyecto
bun run board D:/proyectos/mi-app --once   # pinta una sola vez y sale
bun run board D:/proyectos/mi-app ana      # modo multi-operador: abre de frente el panel de «ana»
bun run board --operator ana          # lo mismo, sin ruta (proyecto de la carpeta actual)
bun run board D:/proyectos/mi-app --compact --no-arrows   # arranca compacto y sin flechas
bun run board --follow                # modo observador: espera a que marques un proyecto desde Claude
```

- **Sin ruta:** `acsuite board [ruta]` vigila el proyecto de la carpeta desde la que lanzas el comando: sube hasta la raíz del repo git (o usa la carpeta misma si no está en un repo). Si ahí no hay documentación de la skill, abre la lista de proyectos (ver abajo). Si pediste un operador, o la carpeta de agentes está mal (por ejemplo, falta `operators.md`), sale con código 1 y te dice que indiques otra con `acsuite board <ruta>`.
- **Qué ruta acepta:** la raíz del proyecto (busca adentro `docs/agents/` o `agent-context/agents/`) o directamente la carpeta que contiene `handoff.md`. Las rutas relativas se resuelven desde la carpeta en la que lanzaste el comando, y se pueden pegar con comillas (Windows las agrega al arrastrar una carpeta a la terminal).
- **Varios proyectos a la vez:** cada instancia es independiente (sin archivos de bloqueo, puertos ni estado compartido), así que puedes tener una terminal por proyecto. El título de la ventana muestra el nombre del proyecto.
- **Lista de proyectos:** vista `PROYECTOS` con una entrada por repo (nombre, ruta, operador del correo de git de ese repo, tarea en curso y cuántas tareas libres y bloqueadas tiene ese operador). Con terminales anchas se muestra como tabla; con angostas, como una tarjeta de tres líneas por proyecto, separadas por una línea en blanco (nombre con sus conteos, ruta, y operador con tarea en curso), según lo que el contenido necesita para no recortar la ruta ni la tarea en curso. Se abre sin ruta y fuera de un proyecto con documentación de la skill, o con `p` desde un repo. La lista se guarda en `projects.json`, en la misma carpeta de config que usa el modo observador (`ACSUITE_HOME` o `~/.acsuite`): se agregan los repos abiertos de frente (salvo con `--once`) y los de la tecla `a`; `x` quita uno de la lista sin borrar nada del repo. Se lee al abrir la vista y con `r`.
- **`--once`:** pinta una vez y sale, sin vigilar ni atajos. Sirve para probar o para scripts.
- **`--follow`:** arranca en el modo observador (ver [Modo observador](#modo-observador)). Solo vale en una terminal interactiva; con `--once` o sin terminal se ignora. La tecla `o` lo activa y desactiva en cualquier momento.
- **Operador:** en modo multi-operador (ver abajo), un segundo argumento tras la ruta (o `--operator <carpeta>`, con o sin ruta) abre de frente el panel de ese operador; sin él se abre la vista de equipo.

### Modo multi-operador

Si la carpeta de agentes tiene `operators.md` (varias personas trabajando en paralelo, ver `docs/multi-operator.md` de la skill), el script lo detecta solo y vigila toda la carpeta: cada operador con carpeta, `operators.md` y `team-backlog.md`. Sin `operators.md`, todo funciona como antes.

- **Vista de equipo** (la inicial, sin operador): el recuadro EQUIPO es un selector con una fila por operador (su tarea en curso con el avance del plan; debajo, sus libres, bloqueadas y la última tarea que cerró) y, debajo, el recuadro SIN DUEÑO con las tareas de `team-backlog.md`. El operador de `git config user.email` queda marcado `(tú)` y preseleccionado; los `(solo team-backlog)` aparecen pero no se pueden abrir.
- **Panel de un operador:** la pantalla de siempre (completadas, en progreso, pausadas, libres y bloqueadas) con el recuadro SIN DUEÑO debajo de BLOQUEADAS. En la segunda línea del encabezado, el operador va junto al nombre del proyecto (`MI APP · ana`).
- **Navegación:** `↑`/`↓` eligen, `Enter` abre el panel y `b`, `Esc` o `Retroceso` vuelven al equipo. Con `--once` o sin terminal no hay selector: se pinta la vista que pediste (el panel del operador indicado, o la de equipo) y se sale.
- **Operador que no existe o no tiene carpeta** (por argumento): falla con código 1 y lista los operadores con carpeta. Un correo de git que no figura no es un error: solo no hay fila preseleccionada.
- **Pasar directamente la carpeta de un operador** (`docs/agents/ana`) también abre su panel.
- **Falta `operators.md` pero hay carpetas de operador:** avisa y no asume modo plano.
- Es solo lectura: nunca modifica ninguna carpeta.

### Atajos de teclado

Solo con una terminal interactiva (sin `--once` ni salida redirigida). Las mayúsculas valen igual que las minúsculas. Las vistas son: la **lista** de proyectos, el **equipo** (modo multi-operador), el **panel** (de un operador, o del proyecto en modo plano) y la **espera** del modo observador.

| Tecla | Acción | Dónde vale |
|---|---|---|
| `q` o `Ctrl+C` | Salir | Todas las vistas. Escribiendo la ruta de un repo o confirmando que se quita uno, solo sale `Ctrl+C` |
| `r` | Volver a leer los archivos y redibujar; en la lista, vuelve a leer la lista y cada repo | Lista, equipo y panel. En la espera solo redibuja |
| `↑` / `↓` | Elegir operador (modo multi-operador) o proyecto | Equipo y lista |
| `Enter` | Abrir el panel del operador elegido o el proyecto elegido | Equipo y lista |
| `b`, `Esc` o `Retroceso` | Volver: del panel de un operador, al equipo; de la raíz de un repo abierto desde la lista (el panel plano o el equipo), a la lista | Panel y equipo. Se ignoran con el observador activo |
| `p` | Ir a la lista de proyectos (se vuelve a leer al abrirla) | Equipo y panel. Se ignora con el observador activo |
| `c` | Compactar o expandir los recuadros (ver abajo) | Panel. En el equipo no hace nada |
| `f` | Ocultar o mostrar las flechas del flujo | Panel (el pie no la ofrece en el equipo, que no tiene flechas) |
| `a` | Agregar un repo a la lista: pide su ruta (`Enter` la agrega, `Esc` cancela) | Lista |
| `x` | Quitar de la lista el proyecto elegido, tras confirmar (`Enter` quita; `Esc` o `n` cancelan); no borra nada del repo. Sin proyectos no hace nada | Lista |
| `o` | Activar o desactivar el [modo observador](#modo-observador) | Todas las vistas, salvo mientras se escribe una ruta o se confirma quitar un proyecto |

Con el observador activo, `p` y `b`/`Esc`/`Retroceso` no hacen nada: hay que salir antes con `o`. En la espera solo valen `q`/`Ctrl+C`, `o` y `r`; lo demás se ignora.

El pie de la pantalla lista las teclas que valen en la vista actual como `[tecla] acción` (por ejemplo, en un panel de operador: `[Esc o b] volver al equipo - [p] proyectos - [c] compactar - [f] ocultar flechas - [r] redibujar - [o] observar - [Ctrl+C o q] salir`); `c` y `f` dicen lo que harán según el estado (`[c] expandir`, `[f] mostrar flechas`), `[o]` dice `observar` o `salir del modo observador`, y si el pie no entra en el ancho se parte en dos líneas para que "salir" nunca quede recortado.

### Modo observador

Pensado para quien tiene varias sesiones de Claude Code abiertas: el board espera a que marques un proyecto desde Claude y cambia solo a ese proyecto. La marca la hace el mod `acsuite-active-project`, con su botón `[ ● Mark this project as active ]` sobre el prompt o con el comando `/board`; cómo instalarlo está en el [README del mod](../../mods/acsuite-active-project/README.md).

Se activa con `--follow` al lanzar el board o con la tecla `o` (que también lo desactiva). Solo funciona en una terminal interactiva: con `--once` o sin terminal, `--follow` se ignora y el board arranca normal.

El mod escribe `active-project.json` en la carpeta de config de la suite (`ACSUITE_HOME` si está definida, si no `~/.acsuite`; la misma de `projects.json`), con este formato:

```json
{ "path": "D:\\proyectos\\mi-app", "at": "2026-10-28T01:07:20.960Z" }
```

- **Al entrar:** borra el `active-project.json` que hubiera, así que lo marcado antes no cuenta: solo abre un proyecto una marca guardada después (con fecha posterior a la última atendida). Cierra el repo que estuviera abierto (con `--follow` ni llega a pintarse) y vigila el archivo. La lectura es tolerante: un archivo ausente, ilegible, cortado a medias o con otra forma (sin `path` de texto, o con un `at` que no es una fecha) no hace nada.
- **Vista de espera:** mientras no hay marca, la pantalla es solo `▣ MODO OBSERVADOR`, con el texto «Esperando: …», sin tareas, y el título de la ventana dice `tareas · observador`. Su pie es `[o] salir del modo observador - [Ctrl+C o q] salir`; `r` redibuja, pero el pie no la ofrece. Salir con `o` sin haber abierto nada deja la lista de proyectos.
- **Al marcar:** sube a la raíz del repo de `path`, lo agrega a la lista de proyectos (y a `projects.json`) si no estaba y abre su tablero. En un repo multi-operador abre de frente el panel del operador del `git config user.email`, como con `--operator`; si ese correo no figura en `operators.md`, queda la vista de equipo. Si marcas el proyecto que ya está abierto, solo se redibuja.
- **Sigue observando:** tras cada marca el modo sigue activo, y la siguiente marca vuelve a cambiar de proyecto. Mientras tanto, el encabezado del tablero lleva el sufijo ` · MODO OBSERVADOR` y, antes del pie, una línea `ℹ Observando: …`.
- **Teclas:** con el observador activo y un tablero en pantalla, `p` y `b`/`Esc`/`Retroceso` se ignoran (el pie no los ofrece): no se puede salir del tablero a la lista ni, en el panel de un operador, volver al equipo. Para eso hay que salir antes del modo observador con `o`, que deja abierto el repo que estuviera en pantalla. `q`, `r`, `c` y `f` siguen valiendo, y también `↑`/`↓`/`Enter` en la vista de equipo.
- **Avisos:** si el repo marcado no se puede abrir, sigue observando y lo avisa en la pantalla en la que esté (la de espera, si todavía no abrió ninguno), en amarillo y con `!`. Un repo sin la skill iniciada dice `Este repo no tiene la skill iniciada: <ruta>. Instálala desde https://github.com/Gersom/agent-context-skill`; cualquier otro motivo (la carpeta ya no existe, es un archivo, falta `operators.md`…) sale como `No se pudo abrir <ruta>: <motivo>.`. Si el repo se abrió pero no se pudo guardar en `projects.json`, el aviso de guardado acompaña al tablero. Un fallo al vigilar la carpeta de config también se avisa así.

## Qué muestra

```
▣ TAREAS
  MI APP   D:\proyectos\mi-app
  Última actualización 18:42:10 · se modificó handoff.md

╭─ LIBRES (3) ─────────────────────────── backlog.md ─╮
│ T-1: Probar el flujo completo end-to-end sobre un…    │
╰───────────────────────────────────────────────────────╯
   ↓ bloquea · ↑ desbloquea
╭─ BLOQUEADAS (2) ─────────────────────── backlog.md ─╮
│ T-4: Deploy en skills.sh [dependencia]                │
│      → espera T-3: Exportar como skill utilizable…    │
╰───────────────────────────────────────────────────────╯
   ↓ empieza (desde libres)
╭─ EN PROGRESO ────────────────────────── handoff.md ─╮
│ Tarea 11 — Refinar script de seguimiento de tareas    │
│ Plan [████░░░░░░░░] 2/7                               │
│   ✔ Paso 1 — …                     (texto tachado)    │
│   ▸ Paso 3 — …                                        │
│ Qué falta: …                                          │
╰───────────────────────────────────────────────────────╯
   ↑ retoma · ↓ pausa
╭─ PAUSADAS (1) ───────────────────────── handoff.md ─╮
│ • Tarea 9 — Migrar setup.md                           │
│     Plan [██████░░░░░░] 1/2                           │
│       ✔ Paso 1 — Copiar el contenido   (tachado)      │
│       ▸ Paso 2 — Revisar los links                    │
│     Por qué se pausó: surgió una prioridad mayor      │
╰───────────────────────────────────────────────────────╯
   ↓ se cierra
╭─ TAREAS COMPLETADAS (últimas 5) ─────── history.md ─╮
│ T-18: Migrar a TypeScript · 2026-10-05                │
╰───────────────────────────────────────────────────────╯
```

- **Encabezado:** hasta tres líneas. La primera es el título de la pantalla: `▣ TAREAS` (el panel de un operador o del proyecto), `▣ EQUIPO` (vista de equipo), `▣ PROYECTOS` (lista de proyectos) o `▣ MODO OBSERVADOR` (la espera del modo observador); con el observador activo, las demás llevan además el sufijo ` · MODO OBSERVADOR` (`▣ TAREAS · MODO OBSERVADOR`). La segunda, solo en el panel y en el equipo, es el nombre de la carpeta del proyecto (en mayúsculas, con los guiones como espacios; en el panel de un operador, seguido de ` · <operador>`, como `MI APP · ana`) y su ruta. La última dice cuándo se redibujó la pantalla por última vez y por qué: "al iniciar", "se modificó <archivo>", "cambio detectado" (el sistema avisó un cambio sin decir en qué archivo) o "redibujado" (atajo `r`, cambio de tamaño de la terminal).
- **Recuadros:** uno por tipo de tarea, con esquinas redondeadas, el tipo en el borde superior izquierdo y el archivo del que sale a la derecha. Todos tienen el ancho de la terminal (mínimo 40 columnas); sin terminal — salida redirigida o `--once` — se usa la variable `COLUMNS` si está definida, o 100. El texto que no entra se recorta con "…". Los bordes van en gris, salvo el de en progreso, que va en verde para destacar la tarea actual; el título de cada recuadro va del color de su tipo: verde `#6DB07B` completadas, azul pálido `#8FB3D9` sin dueño (título y viñeta; el texto de sus tareas va en el gris de las completadas y solo el tag de bloqueo en rojo), verde en progreso, amarillo pausadas, cian libres y rojo bloqueadas. Las tareas completadas van en un gris un poco más claro que el de los bordes (nombre y fecha en el mismo color), con el prefijo `T-N` en el mismo verde del título, y los textos secundarios (rutas, archivo del borde, campos de las pausadas, pasos hechos, "Ninguna", pie) en gris claro.
- **Compacto (`c` o `--compact`):** los recuadros que no son EN PROGRESO ni PAUSADAS (sin dueño, bloqueadas, libres y completadas) muestran una sola tarea, la última, y cuántas más hay (`T-3: Exportar como skill · +3 más`). La última es la más reciente: la última de la lista en sin dueño, bloqueadas y libres, y la última cerrada en completadas. El título conserva el total, las bloqueadas no muestran las tareas de las que dependen, y el nombre de la tarea se recorta antes que el contador. La lista EQUIPO nunca se compacta. Volver a apretar `c` expande. Lo que se elige con `c` y `f` vale mientras el tracker está abierto.
- **Sin flechas (`f` o `--no-arrows`):** quita las líneas de flecha de abajo, y los recuadros quedan igual pero una línea más pegados.
- **Orden y flechas:** los recuadros van de arriba abajo como el flujo de una tarea: sin dueño (solo en modo multi-operador) → libres ⇅ bloqueadas → en progreso ⇅ pausadas → completadas. Entre cada par de recuadros que se muestran hay una línea con la transición: `↓ se toma` (desde sin dueño), `↓ bloquea · ↑ desbloquea` (entre libres y bloqueadas), `↓ empieza` (libres → en progreso) o `↓ empieza (desde libres)` (si hay bloqueadas entre medio: una bloqueada no empieza directo, primero se desbloquea), `↑ retoma · ↓ pausa` (entre en progreso y pausadas) y `↓ se cierra` (hacia completadas). No hay flecha hacia un recuadro que no se muestra; con el set mínimo (solo `handoff.md`) no hay ninguna.
- **`history.md`:** las 5 últimas tareas cerradas, con su fecha. Las descartadas se marcan con ✖.
- **`handoff.md`, en detalle:** la tarea en progreso con el avance de su plan y el resto de sus subsecciones (ej. "Qué falta", "Próximo paso concreto"), y cada tarea pausada con su plan (si lo trae: el campo opcional `Plan` de la plantilla) y todos sus demás campos. En los planes, el texto de los pasos ya hechos sale **tachado** (las tareas no se tachan, solo los pasos). Las etiquetas se muestran tal como están escritas en el documento, así que funciona en cualquier idioma.
- **`backlog.md`, compacto:** libres (y sus grupos) y bloqueadas como `T-N: título`. Cada bloqueada muestra su tag (`[dependencia]`, `[postergada]`…) y las tareas que menciona su motivo; si alguna ya está cerrada en `history.md`, lo marca en amarillo como recordatorio de la Regla 8 (moverla a libres).
- **Avisos:** al final, fuera de los recuadros, lo que no se pudo leer o interpretar (ver abajo).

`backlog.md` e `history.md` son opcionales: el set mínimo de la skill solo genera `handoff.md`, y en ese caso sus recuadros no aparecen. Los recuadros PAUSADAS y BLOQUEADAS tampoco aparecen cuando no hay tareas de ese tipo (los demás se muestran siempre, con "Sin tarea en curso" o "Ninguna" si están vacíos).

El tachado usa el código de tachado de la terminal: Windows Terminal, VS Code y la mayoría de las terminales actuales lo muestran; si una no lo soporta, el texto sale normal. Con `NO_COLOR` no hay colores ni tachado.

## Cómo lee los archivos

El script no depende del idioma de la documentación (los headers se traducen por proyecto). Lo que usa está descrito en `docs/template-architecture.md` de la skill, sección "Anclas de sección":

- **Anclas de sección** en `handoff.md` y `backlog.md`: comentarios `<!-- agent-context-skill:section=<id> -->` antes de cada sección (`in-progress`, `paused`, `free`, `blocked`, `grouped`). Si un archivo no tiene ninguna, el script usa un **plan B**: toma las secciones `##` por orden de aparición y lo avisa en pantalla.
- **Tareas:** headers `### Tarea N — título` (`####` dentro de un grupo), con `—`, `–` o `-`. La tarea en progreso es la primera línea `Tarea N — título` de su sección, antes de la primera subsección.
- **Bloqueos:** el tag con el que **empieza** el campo. Si empieza con `[Resuelto…]`, es historial y no cuenta; por eso, cuando una tarea se vuelve a bloquear, el bloqueo vigente va primero y el historial después.
- **`history.md`:** entradas `## <fecha> — ✅|❌ [Tarea N —] título`, las nuevas arriba. No lleva anclas.
- **Plan de una pausada:** los checkboxes (`- [ ]` / `- [x]`) de su bloque; en la plantilla, los del campo opcional `Plan`, que no se repite como texto.
- **Archivos a medio escribir:** si un archivo que se venía leyendo bien falla (no existe, está vacío o trabado) mientras un agente lo reescribe, el script reintenta y, si sigue fallando, muestra la última versión buena con un aviso que dice de qué hora es.

## Avisos frecuentes

| Aviso | Qué significa |
|---|---|
| `… no tiene anclas de sección: se ubicaron las secciones por orden (plan B).` | El archivo es anterior a las anclas. Funciona, pero conviene agregarlas (la skill lo hace solo al actualizar el archivo). |
| `… no se pudo leer (…): mostrando la versión de las HH:MM:SS.` | El archivo falló justo al leerlo (normalmente, un agente reescribiéndolo). Se corrige solo con el próximo cambio. |
| `Tarea N está en "bloqueadas" sin bloqueo vigente: ¿moverla a libres? (Regla 8)` | Su campo `Bloqueos` solo tiene historial resuelto. |
| `… tiene placeholders sin completar.` | Quedó texto `[Placeholder…]` de la plantilla. |
| `Sin backlog.md (set mínimo de la skill)…` | El proyecto usa el set mínimo; no es un error. |

## Desarrollo

Desde la raíz de este repo:

```sh
bun test            # tests (en scripts/task-tracker/test/ y scripts/_shared/test/, en espejo del código)
bun run typecheck   # chequeo de tipos (Bun ejecuta TypeScript sin revisar tipos)
```

El parseo de los archivos (`parse/`, tag de bloqueo, referencias entre tareas) vive en `scripts/_shared/`, compartido con otros scripts. La estructura de carpetas está descrita en [`docs/architecture.md`](../../docs/architecture.md).
