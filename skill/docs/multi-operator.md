# multi-operator

Modo opcional para cuando **varias personas trabajan a la vez en el mismo proyecto, cada una con su agente**, y comparten el estado por git. Cada operador tiene su propia carpeta con su `handoff.md`, su `backlog.md` y su `history.md`, así nadie edita los archivos de otro: sin conflictos de merge y sin números de tarea repetidos.

Un proyecto de una sola persona **no usa este modo**: sigue con la estructura plana (`docs/agents/handoff.md`, etc.), sin costo extra. Este archivo solo se abre al activarlo o al migrar un repo plano a multi.

## Cómo se detecta el modo

- **Multi** si existe `docs/agents/operators.md`; **plano** si no. Una sola comprobación para el agente y para las herramientas.
- **Estado inconsistente:** si no existe `operators.md` pero `docs/agents/` tiene subcarpetas con su `handoff.md` (carpetas de operador), el agente **no asume plano en silencio**: avisa y pregunta al operador qué hacer, sin modificar nada hasta que responda:
  1. Restaurarlo desde `HEAD` (`git restore docs/agents/operators.md`; sirve si se borró sin commitear).
  2. Restaurarlo desde un commit anterior (`git log -- docs/agents/operators.md` para elegir y `git restore --source=<commit> docs/agents/operators.md`; sirve si el borrado ya se commiteó).
  3. Dejarlo así: el repo se trata como plano y las carpetas de operador se ignoran.
  4. Que lo restaure el operador por su cuenta.
- Se activa al responder que sí a *"¿Van a trabajar varias personas en paralelo en este proyecto, cada una con su agente?"* (Ronda 3 de [`questions-flow.md`](./questions-flow.md)) o al pasar un repo plano a multi ([`migration-flow.md`](./migration-flow.md)).

## Estructura

```
docs/agents/
├── operators.md      # mapa carpeta ↔ correos de git (compartido)
├── rules.md          # reglas del proyecto (compartido)
├── team-backlog.md   # tareas sin dueño, sin numeración (compartido)
├── roadmap.md        # compartido, si existe
├── known-issues.md   # compartido, si existe
├── gersom/           # un operador: nombre corto, minúsculas, sin espacios
│   ├── handoff.md        # su tarea en curso y sus pausadas
│   ├── backlog.md        # las tareas que tomó, con su propia numeración
│   ├── history.md        # sus tareas cerradas
│   └── preferences.md    # opcional: sus preferencias de trabajo
└── ana/              # otro operador, misma estructura
```

Un operador que solo agrega tareas no tiene carpeta (ver "Quién es el operador actual"). `docs/project/`, `docs/external/`, `docs/plans/` y `docs/README.md` no cambian: son del proyecto y se comparten. Las decisiones técnicas van a `decisions.md`, no al `history.md` de nadie.

## Quién es el operador actual

1. Leer `git config user.email` (si no está definido, preguntarle al operador su correo).
2. Buscarlo, sin distinguir mayúsculas, en `operators.md` → esa es su carpeta.
3. Si no está, preguntar: *"¿Con qué nombre corto te registro? (si ya figurás con otro correo, decime cuál)"* y *"¿Vas a tomar tareas o solo a agregarlas al `team-backlog.md`?"*. Si es una persona nueva que toma tareas, crear su carpeta con las plantillas vacías y agregar su línea a `operators.md`; si solo agrega tareas, registrarla sin carpeta; si ya existía, agregar el correo a su línea.

`operators.md` tiene una línea por operador, `- <carpeta>: <correo>, <correo>`, para que una persona con varios correos (trabajo, personal, `noreply` de GitHub) siga en la misma carpeta. Así el correo no aparece en las rutas.

**Operador sin carpeta:** quien solo recolecta tareas (ej. quien habla con el cliente y no desarrolla) se registra como `- ana (solo team-backlog): <correo>`. No tiene `handoff.md`, `backlog.md` ni `history.md`: su agente solo agrega y edita tareas en el `team-backlog.md` y puede leer en solo lectura el avance de los demás.

## Numeración y referencias

- Cada carpeta tiene su propia secuencia ("Próximo número de tarea" en su `backlog.md`). Los números **se repiten entre operadores** a propósito: la carpeta (y el autor del commit) los distingue.
- Dentro de la carpeta propia se escribe `Tarea N`, igual que hoy. En el `team-backlog.md` y en cualquier referencia a la tarea de **otro** operador se escribe `T-N@operador`.
- Los commits siguen como `tipo(T-N): descripción`.

## Backlog del equipo (`team-backlog.md`)

`docs/agents/team-backlog.md` guarda las tareas **sin dueño**. Se llama distinto del `backlog.md` de cada operador (el de las tareas que tomó, con numeración) para no confundirlos. No lleva numeración ni contador: dos operadores agregando a la vez tomarían el mismo número. Cada tarea se identifica por un título único y usa las secciones libres/bloqueadas (con sus anclas), sin agrupamiento:

```
### <título único>
- **Descripción:** …
- **Decisiones/temas a definir antes de empezar:** …
- **Bloqueos:** Ninguno | `[dependencia]` / `[postergada]` motivo
- **Agregada:** <fecha> por <operador>
```

- **Tomar una tarea:** el operador la quita del `team-backlog.md` y recibe el siguiente número de su secuencia. Va a su `backlog.md` si la deja en espera, o **directo a su `handoff.md`** si la empieza ya (ej. una tarea chica). En los dos casos lleva `Origen: team-backlog`, que viaja hasta su entrada de `history.md`. El cambio va en el mismo commit que la quita del `team-backlog.md`. **Una tarea vive en un solo lugar.**
- Si dos operadores toman la misma a la vez, el merge muestra un conflicto sobre ese bloque, en vez de dejar dos copias en silencio.
- **Devolver una tarea** que no se puede seguir: se quita del `backlog.md` del operador y vuelve al `team-backlog.md`, sin número y con la nota `Devuelta por <operador> (antes T-N@operador)`. El número queda retirado y no se reutiliza.
- **Quien solo recolecta tareas** completa como mínimo título y descripción; el desarrollador que la toma completa el resto.

### Flujo de una tarea

```
team-backlog.md → backlog.md → handoff.md → history.md     (se toma y espera su turno)
team-backlog.md →              handoff.md → history.md     (se toma y se empieza ya)
                  backlog.md → handoff.md → history.md     (la agregó el propio operador)
```

### "Agrega esta tarea"

Cuando un operador le pide al agente agregar una tarea, va a **su propio `backlog.md`**; solo va al `team-backlog.md` si lo dice explícitamente. Un operador sin carpeta no tiene backlog propio, así que sus tareas van al `team-backlog.md`. El agente dice en su respuesta en qué backlog la agregó.
- Antes de tomarse se la referencia por título; después, como `T-N@operador`.

## Qué es de cada uno

| Compartido | De cada operador |
|---|---|
| `rules.md`, `operators.md`, `team-backlog.md` (sin dueño), `roadmap.md`, `known-issues.md`, `project/`, `external/`, `plans/` | `handoff.md`, `backlog.md` (tomadas), `history.md`, `preferences.md` |

## Reglas del proyecto y preferencias del operador

`rules.md` es **de todos**: las reglas por defecto más las reglas específicas del proyecto; se aplican a cada operador y a cada agente. `preferences.md` es la forma de trabajar de **un** operador dentro de ese marco, y no puede contradecirlo: ante un conflicto gana `rules.md` (Regla 1: no se duplica por operador).

| Va en `preferences.md` (solo afecta a quien lo escribe) | Va en `rules.md` (afecta a todo el proyecto) |
|---|---|
| Nivel de detalle con que el agente le responde y le reporta | Estilo de código, naming, formato |
| Si prefiere ejecutar los planes seguidos o paso a paso (su respuesta por defecto a la Regla 2) | Formato de la documentación, de los commits y de las ramas |
| Qué decisiones menores el agente puede asumir y cuáles consultarle | Qué no tocar y decisiones no negociables |
| Idioma de la conversación con el agente (no el de la documentación, que es del proyecto) | Herramientas, dependencias y procesos del proyecto |

Ante la duda, si una preferencia cambia el código o los archivos compartidos, es una regla y va en `rules.md`.

**Al agregar una regla a `rules.md` en modo multi**, el agente le recuerda al operador antes de escribirla: *"Esta regla se aplica a todo el proyecto y a los demás operadores; hay que agregarla con cuidado. ¿Confirmás que es del proyecto y no solo tuya?"* Si es solo suya, la propone para `preferences.md`.

## Reglas en modo multi-operador

Las Reglas por defecto no cambian. Al generar la documentación en modo multi (o al pasar de plano a multi) se agrega a `docs/agents/rules.md`, justo antes de "## Enlaces", el bloque "Trabajo en paralelo" de [`template/multi/rules.md`](../template/multi/rules.md): aclara que los archivos de las Reglas 2 a 8 son los de la carpeta del operador y suma las reglas de referencias, de tareas, de `rules.md` compartido y de plan de ejecución. Un proyecto de una sola persona no lo lleva. En el `README.md` de `docs/`, la definición de "operador" pasa a ser *"cada persona que trabaja en el proyecto con su agente, le pide tareas, aprueba decisiones y es a quien se le pregunta cuando algo no está definido"*.

## Carpetas de otros operadores

- Se leen solo si el operador lo pide o su tarea depende de ellas (ej. *"¿Ana terminó X?"* → su `handoff.md` e `history.md`), con la política de lectura de [`../SKILL.md`](../SKILL.md): por búsqueda, no enteros.
- **Nunca se editan.** Si hace falta algo de otro operador, se deja como tarea en el `team-backlog.md`, o el operador se lo pide en persona.
- Una dependencia de tareas ajenas se escribe `` `[dependencia]` espera T-N@ana ``.

## Sesión en modo multi (lo que dice `AGENTS.md`)

1. `docs/README.md`, `docs/agents/rules.md` y `docs/agents/operators.md` (si falta, ver "Estado inconsistente").
2. Resolver la carpeta propia y leer su `handoff.md` (y `preferences.md` si existe).
3. Con una tarea en curso, no leer ningún backlog ni `history.md`. Sin tarea en curso: la lista de títulos de su `backlog.md`, y la del `team-backlog.md` solo si no le pidieron algo concreto.

## Pasar de plano a multi

Lo hace el operador existente cuando se suma otra persona (detalle y comandos en [`migration-flow.md`](./migration-flow.md), "Pasar de plano a multi-operador"): se crea su carpeta, se mueven con `git mv` su `handoff.md`, `backlog.md` e `history.md` (la numeración continúa) y se crea `operators.md` y un `team-backlog.md` vacío. Las tareas que no sean suyas pueden pasar después al `team-backlog.md`.
