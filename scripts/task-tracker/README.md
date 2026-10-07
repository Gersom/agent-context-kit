# task-tracker

Muestra en la terminal el estado de las tareas de un proyecto que usa el skill `agent-context-kit` y se redibuja solo cada vez que cambian sus archivos. Está pensado para tenerlo abierto en una terminal mientras en otra un agente de IA trabaja sobre el proyecto.

Es una herramienta de este repo, no parte del skill: no se copia a los repos destino. Se lanza desde acá y apunta a la carpeta del proyecto que quieras seguir.

## Requisitos

- [Bun](https://bun.sh) (el script está en TypeScript; Bun lo ejecuta sin compilar).
- Instalar las dependencias una vez, desde la raíz de este repo:

  ```sh
  bun install
  ```

## Uso

Desde la raíz de este repo:

```sh
bun run tasks                         # pregunta la ruta a vigilar
bun run tasks D:/proyectos/mi-app     # raíz del proyecto
bun run tasks D:/proyectos/mi-app --once   # pinta una sola vez y sale
bun run tasks D:/proyectos/mi-app ana      # modo multi-operador: abre de frente el panel de «ana»
```

- **Qué ruta acepta:** la raíz del proyecto (busca adentro `docs/agents/` o `agent-context/agents/`) o directamente la carpeta que contiene `handoff.md`. Las rutas relativas se resuelven desde la carpeta en la que lanzaste el comando, y se pueden pegar con comillas (Windows las agrega al arrastrar una carpeta a la terminal).
- **Varios proyectos a la vez:** cada instancia es independiente (sin archivos de bloqueo, puertos ni estado compartido), así que podés tener una terminal por proyecto. El título de la ventana muestra el nombre del proyecto.
- **`--once`:** pinta una vez y sale, sin vigilar ni atajos. Sirve para probar o para scripts.
- **Operador:** en modo multi-operador (ver abajo), un segundo argumento (o `--operator <carpeta>`) abre de frente el panel de ese operador; sin él se abre la vista de equipo.

### Modo multi-operador

Si la carpeta de agentes tiene `operators.md` (varias personas trabajando en paralelo, ver `skill/docs/multi-operator.md`), el script lo detecta solo y vigila toda la carpeta: cada operador con carpeta, `operators.md` y `team-backlog.md`. Sin `operators.md`, todo funciona como antes.

- **Vista de equipo** (la inicial, sin operador): el recuadro EQUIPO es un selector con una fila por operador (su tarea en curso con el avance del plan; debajo, sus libres, bloqueadas y la última tarea que cerró) y, debajo, el recuadro SIN DUEÑO con las tareas de `team-backlog.md`. El operador de `git config user.email` queda marcado `(tú)` y preseleccionado; los `(solo team-backlog)` aparecen pero no se pueden abrir.
- **Panel de un operador:** la pantalla de siempre (completadas, en progreso, pausadas, libres y bloqueadas) con el recuadro SIN DUEÑO debajo de BLOQUEADAS. El título muestra el operador (`▣ MI APP · ana`).
- **Navegación:** `↑`/`↓` eligen, `Enter` abre el panel y `b` o `Esc` vuelven al equipo. Con `--once` o sin terminal no hay selector: se pinta la vista que pediste (el panel del operador indicado, o la de equipo) y se sale.
- **Operador que no existe o no tiene carpeta** (por argumento): falla con código 1 y lista los operadores con carpeta. Un correo de git que no figura no es un error: solo no hay fila preseleccionada.
- **Pasar directamente la carpeta de un operador** (`docs/agents/ana`) también abre su panel.
- **Falta `operators.md` pero hay carpetas de operador:** avisa y no asume modo plano.
- Es solo lectura: nunca modifica ninguna carpeta.

### Atajos de teclado

Solo con una terminal interactiva (sin `--once` ni salida redirigida):

| Tecla | Acción |
|---|---|
| `q` o `Ctrl+C` | Salir |
| `r` | Volver a leer los archivos y redibujar |
| `↑` / `↓` | Elegir operador (vista de equipo, modo multi-operador) |
| `Enter` | Abrir el panel del operador elegido |
| `b`, `Esc` o `Retroceso` | Volver a la vista de equipo |

## Qué muestra

```
▣ MI APP
  D:\proyectos\mi-app
  Última actualización 18:42:10 · se modificó handoff.md

╭─ BLOQUEADAS (2) ─────────────────────── backlog.md ─╮
│ T-4: Deploy en skills.sh [dependencia]                │
│      → espera T-3: Exportar como skill utilizable…    │
╰───────────────────────────────────────────────────────╯
   ↑ bloquea · ↓ desbloquea
╭─ LIBRES (3) ─────────────────────────── backlog.md ─╮
│ T-1: Probar el flujo completo end-to-end sobre un…    │
╰───────────────────────────────────────────────────────╯
   ↓ empieza
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

- **Encabezado:** el nombre de la carpeta del proyecto (en mayúsculas, con los guiones como espacios), su ruta y cuándo se redibujó la pantalla por última vez y por qué: "al iniciar", "se modificó <archivo>", "cambio detectado" (el sistema avisó un cambio sin decir en qué archivo) o "redibujado" (atajo `r`, cambio de tamaño de la terminal).
- **Recuadros:** uno por tipo de tarea, con esquinas redondeadas, el tipo en el borde superior izquierdo y el archivo del que sale a la derecha. Todos tienen el ancho de la terminal (mínimo 40 columnas); sin terminal — salida redirigida o `--once` — se usa la variable `COLUMNS` si está definida, o 100. El texto que no entra se recorta con "…". Los bordes van en gris, salvo el de en progreso, que va en verde para destacar la tarea actual; el título de cada recuadro va del color de su tipo: verde `#6DB07B` completadas (y también sin dueño, que usa la misma paleta: título y viñeta en ese verde, texto en el gris de las completadas y solo el tag de bloqueo en rojo), verde en progreso, amarillo pausadas, cian libres y rojo bloqueadas. Las tareas completadas van en un gris un poco más claro que el de los bordes (nombre y fecha en el mismo color), con el prefijo `T-N` en el mismo verde del título, y los textos secundarios (rutas, archivo del borde, campos de las pausadas, pasos hechos, "Ninguna", pie) en gris claro.
- **Orden y flechas:** los recuadros van de arriba abajo como el flujo de una tarea: sin dueño (solo en modo multi-operador) → bloqueadas ⇅ libres → en progreso ⇅ pausadas → completadas. Entre cada par de recuadros que se muestran hay una línea con la transición: `↓ se toma` (desde sin dueño), `↑ bloquea · ↓ desbloquea` (entre bloqueadas y libres), `↓ empieza` (libres → en progreso), `↑ retoma · ↓ pausa` (entre en progreso y pausadas) y `↓ se cierra` (hacia completadas). No hay flecha hacia un recuadro que no se muestra; con el set mínimo (solo `handoff.md`) no hay ninguna.
- **`history.md`:** las 5 últimas tareas cerradas, con su fecha. Las descartadas se marcan con ✖.
- **`handoff.md`, en detalle:** la tarea en progreso con el avance de su plan y el resto de sus subsecciones (ej. "Qué falta", "Próximo paso concreto"), y cada tarea pausada con su plan (si lo trae: el campo opcional `Plan` de la plantilla) y todos sus demás campos. En los planes, el texto de los pasos ya hechos sale **tachado** (las tareas no se tachan, solo los pasos). Las etiquetas se muestran tal como están escritas en el documento, así que funciona en cualquier idioma.
- **`backlog.md`, compacto:** libres (y sus grupos) y bloqueadas como `T-N: título`. Cada bloqueada muestra su tag (`[dependencia]`, `[postergada]`…) y las tareas que menciona su motivo; si alguna ya está cerrada en `history.md`, lo marca en amarillo como recordatorio de la Regla 7 (moverla a libres).
- **Avisos:** al final, fuera de los recuadros, lo que no se pudo leer o interpretar (ver abajo).

`backlog.md` e `history.md` son opcionales: el set mínimo del skill solo genera `handoff.md`, y en ese caso sus recuadros no aparecen. Los recuadros PAUSADAS y BLOQUEADAS tampoco aparecen cuando no hay tareas de ese tipo (los demás se muestran siempre, con "Sin tarea en curso" o "Ninguna" si están vacíos).

El tachado usa el código de tachado de la terminal: Windows Terminal, VS Code y la mayoría de las terminales actuales lo muestran; si una no lo soporta, el texto sale normal. Con `NO_COLOR` no hay colores ni tachado.

## Cómo lee los archivos

El script no depende del idioma de la documentación (los headers se traducen por proyecto). Lo que usa está descrito en [`skill/docs/template-architecture.md`](../../skill/docs/template-architecture.md), sección "Anclas de sección":

- **Anclas de sección** en `handoff.md` y `backlog.md`: comentarios `<!-- agent-context-kit:section=<id> -->` antes de cada sección (`in-progress`, `paused`, `free`, `blocked`, `grouped`). Si un archivo no tiene ninguna, el script usa un **plan B**: toma las secciones `##` por orden de aparición y lo avisa en pantalla.
- **Tareas:** headers `### Tarea N — título` (`####` dentro de un grupo), con `—`, `–` o `-`. La tarea en progreso es la primera línea `Tarea N — título` de su sección, antes de la primera subsección.
- **Bloqueos:** el tag con el que **empieza** el campo. Si empieza con `[Resuelto…]`, es historial y no cuenta; por eso, cuando una tarea se vuelve a bloquear, el bloqueo vigente va primero y el historial después.
- **`history.md`:** entradas `## <fecha> — ✅|❌ [Tarea N —] título`, las nuevas arriba. No lleva anclas.
- **Plan de una pausada:** los checkboxes (`- [ ]` / `- [x]`) de su bloque; en la plantilla, los del campo opcional `Plan`, que no se repite como texto.
- **Archivos a medio escribir:** si un archivo que se venía leyendo bien falla (no existe, está vacío o trabado) mientras un agente lo reescribe, el script reintenta y, si sigue fallando, muestra la última versión buena con un aviso que dice de qué hora es.

## Avisos frecuentes

| Aviso | Qué significa |
|---|---|
| `… no tiene anclas de sección: se ubicaron las secciones por orden (plan B).` | El archivo es anterior a las anclas. Funciona, pero conviene agregarlas (el skill lo hace solo al actualizar el archivo). |
| `… no se pudo leer (…): mostrando la versión de las HH:MM:SS.` | El archivo falló justo al leerlo (normalmente, un agente reescribiéndolo). Se corrige solo con el próximo cambio. |
| `Tarea N está en "bloqueadas" sin bloqueo vigente: ¿moverla a libres? (Regla 7)` | Su campo `Bloqueos` solo tiene historial resuelto. |
| `… tiene placeholders sin completar.` | Quedó texto `[Placeholder…]` de la plantilla. |
| `Sin backlog.md (set mínimo del skill)…` | El proyecto usa el set mínimo; no es un error. |

## Desarrollo

Desde la raíz de este repo:

```sh
bun test            # tests (en scripts/task-tracker/test/ y scripts/_shared/test/, en espejo del código)
bun run typecheck   # chequeo de tipos (Bun ejecuta TypeScript sin revisar tipos)
```

El parseo de los archivos (`parse/`, tag de bloqueo, referencias entre tareas) vive en `scripts/_shared/`, compartido con otros scripts. La estructura de carpetas está descrita en [`docs/architecture.md`](../../docs/architecture.md).
