# Backlog

Cola de tareas pendientes: el "qué falta" a nivel proyecto. No es la tarea en curso (eso vive en [`./handoff.md`](./handoff.md)) ni lo ya cerrado (eso vive en [`./history.md`](./history.md)).

**Ciclo de vida de un item:**
1. Se agrega acá cuando se identifica pero todavía no se empieza.
2. Cuando se empieza a trabajar, se saca de esta lista y pasa a ser la tarea actual (o pausada) en `handoff.md` (referenciando el título del item).
3. Cuando se cierra (hecha o descartada), sale de `handoff.md` y se registra en `history.md`.

No dejar en este archivo tareas que ya se están trabajando o que ya se cerraron — sería duplicar lo que corresponde a `handoff.md`/`history.md`.

**Dos secciones:** las tareas viven en "Tareas libres" (listas para tomar) o "Tareas bloqueadas / pospuestas" (no se toman todavía). Cuando el motivo de una tarea bloqueada deja de aplicar, se mueve a "Tareas libres" — ver Regla 7 de `rules.md` (no se borra el campo `Bloqueos`, se marca como resuelto).

**Numeración:** cada tarea tiene un número correlativo fijo, asignado una sola vez al crearse. El número **nunca se reutiliza**, ni siquiera cuando la tarea se cierra (hecha o descartada) y pasa a `history.md`. No es un orden de cola: se puede tomar tareas fuera de orden.

> Numeración iniciada el 2026-09-24. Tareas ya cerradas antes de esa fecha (ver `history.md`) no tienen número asignado retroactivamente.

**Próximo número de tarea:** 8

---

## Tareas libres

## Tarea 1 — Probar el flujo completo end-to-end sobre un repo real

- **Descripción:** validar en la práctica tanto el scaffolding nuevo como el flujo de migración (`src/docs/migration-flow.md`) corriendo el skill sobre uno o más repos reales del operador (ej. `gercash-backend`, `gercash-frontend`, `gercash-ai-service`, `gercash-whatsapp-bot`), ya que varios tienen sistemas de documentación propios que sirven como caso de uso real para el flujo de migración.
- **Decisiones/temas a definir antes de empezar:** elegir sobre qué repo(s) probar primero y si se prueba scaffolding nuevo, migración, o ambos.
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador quiera validar el skill sobre un proyecto real, o priorice esta tarea explícitamente.
- **Detalles:** ninguno.
- **Agregada:** 2026-09-24.

## Tarea 3 — Exportar como skill utilizable por Claude

- **Descripción:** empaquetar `agent-context-kit` en el formato de skill que Claude (Claude Code / claude.ai) pueda invocar directamente — con su `SKILL.md` como punto de entrada y las plantillas accesibles — en vez de ser solo un repo de referencia que hay que copiar manualmente.
- **Decisiones/temas a definir antes de empezar:** confirmar el formato/estructura esperada por Claude para skills instalables (naming, metadata, empaquetado) y cómo se distribuye (repo instalable directo, paquete, etc.).
- **Bloqueos:** `[Resuelto el 2026-09-24]` — era `[postergada]` conviene tener el contenido de `SKILL.md` y las plantillas de `example/`/`template/` terminadas antes de empaquetar. Confirmado al cerrar la Tarea 5: `SKILL.md` no tiene placeholders y el catálogo de `template/` está completo desde el 2026-09-22 (ver `history.md`).
- **Desbloquea:** Tarea 4.
- **Disparador:** cuando el operador quiera distribuir el skill para uso directo en Claude, o priorice esta tarea explícitamente.
- **Detalles:** ver pendientes relacionados en [`../desing.md`](../desing.md).
- **Agregada:** 2026-09-24.

## Tarea 7 — Resolver el caso de un backlog muy grande

- **Descripción:** contemplar qué pasa cuando `backlog.md` acumula muchas tareas (libres, bloqueadas, pospuestas) y el archivo único deja de ser cómodo de leer o navegar — ¿hace falta paginar, archivar tareas viejas, subdividir por categoría, o cambiar el formato (ej. tabla resumen en vez de un bloque largo por tarea)?
- **Decisiones/temas a definir antes de empezar:** ¿cuál es el umbral que se considera "muy grande" (cantidad de tareas, tamaño del archivo)? ¿la solución pasa por dividir en más archivos, archivar lo viejo aparte, o solo cambiar el formato de cada entrada para que sea más compacto?
- **Bloqueos:** `[Resuelto el 2026-09-24]` — era `[postergada]` conviene resolver primero la Tarea 5 (secciones nuevas de estado dentro de `backlog.md`). La Tarea 5 se cerró.
- **Disparador:** cuando el operador priorice esta tarea explícitamente, o cuando el backlog de un proyecto real (ver Tarea 1) empiece a mostrar este problema en la práctica.
- **Detalles:** surgió durante el diseño de la Tarea 5, al agregar secciones nuevas al backlog — señal de que el formato actual (un bloque largo de texto por tarea) puede no escalar bien.
- **Agregada:** 2026-09-24.

## Tareas bloqueadas / pospuestas

## Tarea 4 — Deploy en skills.sh

- **Descripción:** publicar `agent-context-kit` en https://www.skills.sh/ para que esté disponible en el catálogo público de skills.
- **Decisiones/temas a definir antes de empezar:** revisar los requisitos de publicación de skills.sh (formato esperado, metadata, proceso de submit) antes de armar el paquete final.
- **Bloqueos:** `[dependencia]` depende de que la Tarea 3 (Exportar como skill utilizable por Claude) esté resuelta — el paquete a publicar en skills.sh probablemente sea el mismo artefacto exportado ahí. (La Tarea 3 ya no está bloqueada, pero sigue sin hacerse — ver "Tareas libres".)
- **Disparador:** cuando el operador quiera hacer pública la skill, o priorice esta tarea explícitamente.
- **Detalles:** ninguno.
- **Agregada:** 2026-09-24.
