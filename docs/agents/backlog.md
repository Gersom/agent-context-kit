# Backlog

Cola de tareas pendientes: el "qué falta" a nivel proyecto. No es la tarea en curso (eso vive en [`./handoff.md`](./handoff.md)) ni lo ya cerrado (eso vive en [`./changelog.md`](./changelog.md)).

**Ciclo de vida de un item:**
1. Se agrega acá cuando se identifica pero todavía no se empieza.
2. Cuando se empieza a trabajar, se saca de esta lista y pasa a ser la tarea actual en `handoff.md` (referenciando el título del item).
3. Cuando se cierra, sale de `handoff.md` y se registra en `changelog.md`.

No dejar en este archivo tareas que ya se están trabajando o que ya se cerraron — sería duplicar lo que corresponde a `handoff.md`/`changelog.md`.

**Numeración:** cada tarea tiene un número correlativo fijo, asignado una sola vez al crearse. El número **nunca se reutiliza**, ni siquiera cuando la tarea se cierra y pasa a `changelog.md`. No es un orden de cola: se puede tomar tareas fuera de orden.

> Numeración iniciada el 2026-09-24. Tareas ya cerradas antes de esa fecha (ver `changelog.md`) no tienen número asignado retroactivamente.

**Próximo número de tarea:** 6

---

## Tarea 1 — Probar el flujo completo end-to-end sobre un repo real

- **Descripción:** validar en la práctica tanto el scaffolding nuevo como el flujo de migración (`src/docs/migration-flow.md`) corriendo el skill sobre uno o más repos reales del operador (ej. `gercash-backend`, `gercash-frontend`, `gercash-ai-service`, `gercash-whatsapp-bot`), ya que varios tienen sistemas de documentación propios que sirven como caso de uso real para el flujo de migración.
- **Decisiones/temas a definir antes de empezar:** elegir sobre qué repo(s) probar primero y si se prueba scaffolding nuevo, migración, o ambos.
- **Bloqueos:** ninguno.
- **Disparador:** cuando el operador quiera validar el skill sobre un proyecto real, o priorice esta tarea explícitamente.
- **Detalles:** ninguno.
- **Agregada:** 2026-09-24.

## Tarea 3 — Exportar como skill utilizable por Claude

- **Descripción:** empaquetar `agent-context-kit` en el formato de skill que Claude (Claude Code / claude.ai) pueda invocar directamente — con su `SKILL.md` como punto de entrada y las plantillas accesibles — en vez de ser solo un repo de referencia que hay que copiar manualmente.
- **Decisiones/temas a definir antes de empezar:** confirmar el formato/estructura esperada por Claude para skills instalables (naming, metadata, empaquetado) y cómo se distribuye (repo instalable directo, paquete, etc.). Relacionado con los pendientes ya anotados en `docs/desing.md` (§7): redactar `SKILL.md` real y el contenido de `example/` sigue sin cerrarse del todo.
- **Bloqueos:** conviene tener el contenido de `SKILL.md` y las plantillas de `example/`/`template/` terminadas antes de empaquetar.
- **Disparador:** cuando el operador quiera distribuir el skill para uso directo en Claude, o priorice esta tarea explícitamente.
- **Detalles:** ver pendientes relacionados en [`../desing.md`](../desing.md).
- **Agregada:** 2026-09-24.

## Tarea 4 — Deploy en skills.sh

- **Descripción:** publicar `agent-context-kit` en https://www.skills.sh/ para que esté disponible en el catálogo público de skills.
- **Decisiones/temas a definir antes de empezar:** revisar los requisitos de publicación de skills.sh (formato esperado, metadata, proceso de submit) antes de armar el paquete final.
- **Bloqueos:** depende de que la Tarea 3 (Exportar como skill utilizable por Claude) esté resuelta — el paquete a publicar en skills.sh probablemente sea el mismo artefacto exportado ahí.
- **Disparador:** cuando el operador quiera hacer pública la skill, o priorice esta tarea explícitamente.
- **Detalles:** ninguno.
- **Agregada:** 2026-09-24.

## Tarea 5 — Contemplación de nuevos flujos y estados de tareas

- **Descripción:** evaluar si el ciclo de vida actual de una tarea (backlog → handoff → changelog, solo "pendiente" o "cerrada") es suficiente, o si hace falta contemplar otros estados/flujos — el disparador concreto fue notar que no existe un camino definido para una tarea "evaluada y descartada" (se decide no hacerla, pero se quiere conservar su número y el motivo del descarte para que no se vuelva a proponer sin ver por qué se rechazó antes).
- **Decisiones/temas a definir antes de empezar:** ¿el estado "descartada" vive en `changelog.md` (como "cerrada sin implementar") o en `decisions.md` (como una decisión técnica de no-hacer)? ¿Hay otros estados/flujos que valga la pena contemplar además de este caso puntual?
- **Bloqueos:** ninguno.
- **Disparador:** cuando el operador priorice esta tarea explícitamente, o cuando se dé un caso real de tarea descartada y no haya dónde documentarlo.
- **Detalles:** surgió al diseñar el mecanismo de numeración de tareas (ver "Numeración" más arriba en este archivo) — un número descartado también debe conservarse único, así que el estado "descartada" está relacionado directamente con esa garantía.
- **Agregada:** 2026-09-24.
