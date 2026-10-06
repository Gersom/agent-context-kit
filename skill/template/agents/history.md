# History

Historial de tareas ya resueltas — hechas o descartadas: el "qué pasó y por qué". A diferencia de [`./handoff.md`](./handoff.md), este archivo **se acumula** — cada tarea resuelta agrega una entrada nueva, no se sobrescriben las anteriores.

No es una cola de pendientes (eso vive en [`./backlog.md`](./backlog.md)): acá solo entran tareas que ya salieron de `handoff.md` por estar resueltas, sea porque se hicieron o porque se decidió no hacerlas.

**Entradas nuevas van arriba** (orden cronológico inverso, lo más reciente primero).

Cada entrada marca su tipo:
- ✅ **Hecha** — la tarea se completó.
- ❌ **Descartada** — se evaluó y se decidió no hacerla. El número de tarea se conserva igual que si se hubiera hecho (ver "Numeración" en `backlog.md`), y la entrada explica el motivo del descarte — así, si alguien vuelve a proponer la misma idea más adelante, hay dónde ver por qué se rechazó antes.

Si un archivo de `project/` (`decisions.md`, `architecture.md`, etc.) ya explica el porqué de algo con más detalle, no lo repitas acá: linkealo desde la entrada correspondiente.

Si la tarea tenía número asignado en `backlog.md` (ver su sección "Numeración"), ese número viaja con ella a la entrada correspondiente acá — nunca se reasigna a otra tarea, sea cual sea su tipo. Entradas de antes de adoptar ese mecanismo (o de tareas que nunca pasaron por `backlog.md`, ej. pedidas directamente por el operador) quedan sin número — no se numeran retroactivamente.

---

<!--
Si este skill se está agregando de forma retroactiva a un proyecto ya existente (ver Ronda 2 de questions-flow.md), esta primera carga no se deja vacía: se reconstruye revisando `git log` y extrayendo los hitos relevantes, no un volcado literal del historial de commits. Las entradas reconstruidas así van todas como ✅ Hecha (no hay forma de reconstruir descartes desde `git log`).

Formato por entrada:

## [Fecha] — ✅ Tarea [N] — [Título breve de la tarea]

- Qué se hizo
- Por qué (el motivo, no solo la descripción técnica)

## [Fecha] — ❌ Tarea [N] — [Título breve de la tarea] (descartada)

- Por qué se descartó (el motivo real, para que no se vuelva a proponer sin verlo)

(el segmento "Tarea [N] —" solo va si la tarea tenía número asignado en `backlog.md`; si no lo tenía, se omite.)
-->

## [Placeholder fecha] — ✅ [Placeholder título]

- [Placeholder]
