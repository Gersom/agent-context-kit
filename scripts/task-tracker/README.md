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
```

- **Qué ruta acepta:** la raíz del proyecto (busca adentro `docs/agents/` o `agent-context/agents/`) o directamente la carpeta que contiene `handoff.md`. Las rutas relativas se resuelven desde la carpeta en la que lanzaste el comando, y se pueden pegar con comillas (Windows las agrega al arrastrar una carpeta a la terminal).
- **Varios proyectos a la vez:** cada instancia es independiente (sin archivos de bloqueo, puertos ni estado compartido), así que podés tener una terminal por proyecto. El título de la ventana muestra el nombre del proyecto.
- **`--once`:** pinta una vez y sale, sin vigilar ni atajos. Sirve para probar o para scripts.

### Atajos de teclado

Solo con una terminal interactiva (sin `--once` ni salida redirigida):

| Tecla | Acción |
|---|---|
| `q` o `Ctrl+C` | Salir |
| `r` | Volver a leer los archivos y redibujar |

## Qué muestra

```
▣ MI APP
  D:\proyectos\mi-app
  Última actualización 18:42:10 · se modificó handoff.md

━━ history.md ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✔ TAREAS COMPLETADAS (últimas 5)
  T-18: Migrar a TypeScript · 2026-10-05          (tachadas)

━━ handoff.md ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ EN PROGRESO
  Tarea 11 — Refinar script de seguimiento de tareas
  Plan [████░░░░░░░░] 2/7
    ✔ Paso 1 — …
    ▸ Paso 3 — …
  Qué falta: …
⏸ PAUSADAS (1)
  • Tarea 9 — Migrar setup.md
      Por qué se pausó: surgió una prioridad mayor

━━ backlog.md ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
○ LIBRES (3)
  T-1: Probar el flujo completo end-to-end sobre un repo real
■ BLOQUEADAS (2)
  T-4: Deploy en skills.sh [dependencia]
       → espera T-3: Exportar como skill utilizable por Claude
```

- **Encabezado:** el nombre de la carpeta del proyecto (en mayúsculas, con los guiones como espacios), su ruta y cuándo se redibujó la pantalla por última vez y por qué: "al iniciar", "se modificó <archivo>", "cambio detectado" (el sistema avisó un cambio sin decir en qué archivo) o "redibujado" (atajo `r`, cambio de tamaño de la terminal).
- **`history.md`:** las 5 últimas tareas cerradas, tachadas, con su fecha. Las descartadas se marcan con ✖.
- **`handoff.md`, en detalle:** la tarea en progreso con el avance de su plan y el resto de sus subsecciones (ej. "Qué falta", "Próximo paso concreto"), y cada tarea pausada con todos sus campos. Las etiquetas se muestran tal como están escritas en el documento, así que funciona en cualquier idioma.
- **`backlog.md`, compacto:** libres (y sus grupos) y bloqueadas como `T-N: título`. Cada bloqueada muestra su tag (`[dependencia]`, `[postergada]`…) y las tareas que menciona su motivo; si alguna ya está cerrada en `history.md`, lo marca en amarillo como recordatorio de la Regla 7 (moverla a libres).
- **Avisos:** al final, lo que no se pudo leer o interpretar (ver abajo).

`backlog.md` e `history.md` son opcionales: el set mínimo del skill solo genera `handoff.md`, y en ese caso esos bloques no aparecen.

## Cómo lee los archivos

El script no depende del idioma de la documentación (los headers se traducen por proyecto). Lo que usa está descrito en [`src/docs/template-architecture.md`](../../src/docs/template-architecture.md), sección "Anclas de sección":

- **Anclas de sección** en `handoff.md` y `backlog.md`: comentarios `<!-- agent-context-kit:section=<id> -->` antes de cada sección (`in-progress`, `paused`, `free`, `blocked`, `grouped`). Si un archivo no tiene ninguna, el script usa un **plan B**: toma las secciones `##` por orden de aparición y lo avisa en pantalla.
- **Tareas:** headers `### Tarea N — título` (`####` dentro de un grupo), con `—`, `–` o `-`. La tarea en progreso es la primera línea `Tarea N — título` de su sección, antes de la primera subsección.
- **Bloqueos:** el tag con el que **empieza** el campo. Si empieza con `[Resuelto…]`, es historial y no cuenta; por eso, cuando una tarea se vuelve a bloquear, el bloqueo vigente va primero y el historial después.
- **`history.md`:** entradas `## <fecha> — ✅|❌ [Tarea N —] título`, las nuevas arriba. No lleva anclas.
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
bun test            # tests (en scripts/task-tracker/test/, en espejo de src/)
bun run typecheck   # chequeo de tipos (Bun ejecuta TypeScript sin revisar tipos)
```

La estructura de carpetas está descrita en [`docs/architecture.md`](../../docs/architecture.md).
