# Backlog

Cola de tareas pendientes: el "qué falta" a nivel proyecto. No es la tarea en curso (eso vive en [`./handoff.md`](./handoff.md)) ni lo ya cerrado (eso vive en [`./changelog.md`](./changelog.md)).

**Ciclo de vida de un item:**
1. Se agrega acá cuando se identifica pero todavía no se empieza.
2. Cuando se empieza a trabajar, se saca de esta lista y pasa a ser la tarea actual en `handoff.md` (referenciando el título del item).
3. Cuando se cierra, sale de `handoff.md` y se registra en `changelog.md`.

No dejar en este archivo tareas que ya se están trabajando o que ya se cerraron — sería duplicar lo que corresponde a `handoff.md`/`changelog.md`.

---

## Probar el flujo completo end-to-end sobre un repo real

- **Descripción:** validar en la práctica tanto el scaffolding nuevo como el flujo de migración (`src/docs/migration-flow.md`) corriendo el skill sobre uno o más repos reales del operador (ej. `gercash-backend`, `gercash-frontend`, `gercash-ai-service`, `gercash-whatsapp-bot`), ya que varios tienen sistemas de documentación propios que sirven como caso de uso real para el flujo de migración.
- **Decisiones/temas a definir antes de empezar:** elegir sobre qué repo(s) probar primero y si se prueba scaffolding nuevo, migración, o ambos.
- **Bloqueos:** ninguno.
- **Disparador:** cuando el operador quiera validar el skill sobre un proyecto real, o priorice esta tarea explícitamente.
- **Detalles:** ninguno.
- **Agregada:** 2026-09-24.

## Soporte multi-idioma

- **Descripción:** hoy todas las plantillas de `src/template/` y el flujo de preguntas están escritos en español. Agregar soporte para que el skill pueda generar la documentación de contexto en otros idiomas (al menos inglés), ya sea detectando el idioma del repo destino o preguntándolo explícitamente.
- **Decisiones/temas a definir antes de empezar:** ¿se traducen las plantillas a idiomas fijos (ej. `template/es/`, `template/en/`) o se genera dinámicamente vía instrucción al agente? ¿Se pregunta el idioma en el flujo de preguntas (`questions-flow.md`) o se detecta automáticamente (idioma del repo, README, commits)?
- **Bloqueos:** ninguno.
- **Disparador:** cuando el operador pida soportar un proyecto en otro idioma, o priorice esta tarea explícitamente.
- **Detalles:** ninguno.
- **Agregada:** 2026-09-24.

## Exportar como skill utilizable por Claude

- **Descripción:** empaquetar `agent-context-kit` en el formato de skill que Claude (Claude Code / claude.ai) pueda invocar directamente — con su `SKILL.md` como punto de entrada y las plantillas accesibles — en vez de ser solo un repo de referencia que hay que copiar manualmente.
- **Decisiones/temas a definir antes de empezar:** confirmar el formato/estructura esperada por Claude para skills instalables (naming, metadata, empaquetado) y cómo se distribuye (repo instalable directo, paquete, etc.). Relacionado con los pendientes ya anotados en `docs/desing.md` (§7): redactar `SKILL.md` real y el contenido de `example/` sigue sin cerrarse del todo.
- **Bloqueos:** conviene tener el contenido de `SKILL.md` y las plantillas de `example/`/`template/` terminadas antes de empaquetar.
- **Disparador:** cuando el operador quiera distribuir el skill para uso directo en Claude, o priorice esta tarea explícitamente.
- **Detalles:** ver pendientes relacionados en [`../desing.md`](../desing.md).
- **Agregada:** 2026-09-24.

## Deploy en skills.sh

- **Descripción:** publicar `agent-context-kit` en https://www.skills.sh/ para que esté disponible en el catálogo público de skills.
- **Decisiones/temas a definir antes de empezar:** revisar los requisitos de publicación de skills.sh (formato esperado, metadata, proceso de submit) antes de armar el paquete final.
- **Bloqueos:** depende de que la tarea "Exportar como skill utilizable por Claude" esté resuelta — el paquete a publicar en skills.sh probablemente sea el mismo artefacto exportado ahí.
- **Disparador:** cuando el operador quiera hacer pública la skill, o priorice esta tarea explícitamente.
- **Detalles:** ninguno.
- **Agregada:** 2026-09-24.
