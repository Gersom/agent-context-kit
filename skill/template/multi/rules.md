<!--
GUÍA para el agente, no se copia como archivo aparte: es un bloque que, en modo multi-operador
(ver `docs/multi-operator.md`), se agrega a `docs/agents/rules.md` justo antes de "## Enlaces".
No modifica las Reglas por defecto. Un proyecto de una sola persona no lo lleva.
-->

## Trabajo en paralelo (modo multi-operador)

Varias personas trabajan a la vez, cada una con su agente. Estas reglas se suman a las anteriores:

- **Tus archivos:** el `handoff.md`, `backlog.md` e `history.md` de las Reglas 2 a 8 son los de tu carpeta, `docs/agents/<operador>/`. Solo editas tu carpeta y los archivos compartidos; las carpetas de otros operadores son de solo lectura.
- **Referencias:** dentro de tu carpeta, `Tarea N`; hacia la tarea de otro operador, `T-N@operador`. Los commits siguen como `tipo(T-N): descripción`.
- **Tareas:** se toman del `team-backlog.md` y el número lo asignas tú, en tu secuencia. Una tarea vive en un solo lugar. "Agrega una tarea" va a tu `backlog.md`, salvo que digan explícitamente que es para el equipo.
- **`rules.md` es de todos:** antes de agregar una regla, recuérdale al operador que se aplicará a todo el proyecto y a los demás operadores, y confirma que no es solo suya; si lo es, va en su `preferences.md`.
- **Plan de ejecución (Regla 2):** si tu `preferences.md` fija cómo prefieres ejecutar los planes, no se te vuelve a preguntar.
