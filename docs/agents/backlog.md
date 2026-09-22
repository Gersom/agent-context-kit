# Backlog

Cola de tareas pendientes: el "qué falta" a nivel proyecto. No es la tarea en curso (eso vive en [`./handoff.md`](./handoff.md)) ni lo ya cerrado (eso vive en [`./changelog.md`](./changelog.md)).

**Ciclo de vida de un item:**
1. Se agrega acá cuando se identifica pero todavía no se empieza.
2. Cuando se empieza a trabajar, se saca de esta lista y pasa a ser la tarea actual en `handoff.md` (referenciando el título del item).
3. Cuando se cierra, sale de `handoff.md` y se registra en `changelog.md`.

No dejar en este archivo tareas que ya se están trabajando o que ya se cerraron — sería duplicar lo que corresponde a `handoff.md`/`changelog.md`.

---

## Redactar `src/template/external/_example-service.md`

- **Descripción:** plantilla base para documentar integraciones externas, actualmente vacía.
- **Decisiones/temas a definir antes de empezar:** ninguno.
- **Bloqueos:** ninguno.
- **Disparador:** cuando el operador pida continuar con las plantillas de `template/`.
- **Detalles:** ver [`../../src/docs/template-architecture.md`](../../src/docs/template-architecture.md).
- **Agregada:** 2026-09-22

## Redactar `src/template/README.md`

- **Descripción:** guía de estructura/formato que el agente usa como referencia para generar el `docs/README.md` del proyecto destino (no se copia literal). Actualmente vacío.
- **Decisiones/temas a definir antes de empezar:** ninguno.
- **Bloqueos:** ninguno.
- **Disparador:** cuando el operador pida continuar con las plantillas de `template/`.
- **Detalles:** ver sección "`README.md` (raíz de `template/`)" en [`../../src/docs/template-architecture.md`](../../src/docs/template-architecture.md).
- **Agregada:** 2026-09-22

## Versionar el skill y generar releases

- **Descripción:** definir un esquema de versionado para `agent-context-kit` (ej. SemVer) y el proceso para cortar releases en GitHub, de forma que un repo destino pueda fijar/actualizar a una versión concreta del skill en vez de seguir `main` a ciegas.
- **Decisiones/temas a definir antes de empezar:** esquema de versionado a usar; si el número de versión vive en algún archivo del repo (ej. `template/README.md`, un `VERSION`, o el frontmatter de `SKILL.md` si termina teniendo uno) o solo en tags de git; qué dispara un bump (cualquier cambio en `template/` o `questions-flow.md` vs. solo cambios "de contrato"); si se usa GitHub Releases con changelog autogenerado o manual.
- **Bloqueos:** conviene tener `src/SKILL.md` y el catálogo de `template/` ya completos y estables antes de fijar un v1.0.0 — versionar contenido todavía a medio redactar (placeholders vacíos) no aporta valor.
- **Disparador:** cuando el operador pida continuar con esto, idealmente después de cerrar el resto de items de este backlog.
- **Detalles:** ninguno todavía — no evaluado en el documento de diseño (`docs/desing.md`).
- **Agregada:** 2026-09-22

## Flujo de migración desde otro sistema de documentación

- **Descripción:** hoy la lógica de detección (sección 4.1 de `docs/desing.md`) solo contempla dos casos: no existe `docs/` (se crea normal) o existe con contenido ajeno (se usa `agent-context/` como respaldo, sin tocarlo). Falta un tercer camino: cuando ese `docs/` ajeno **sí** es documentación de proyecto/contexto para agentes, pero de otro formato o convención (ej. la estructura de referencia de la sección 6 de `desing.md`: `docs/claude/backlog.md`, `docs/claude/handoff.md`, etc., u otro esquema propio del operador). En ese caso, en vez de ignorarla y duplicar en `agent-context/`, el skill debería poder migrar/mapear ese contenido existente a la estructura de este skill.
- **Decisiones/temas a definir antes de empezar:** cómo se detecta que un `docs/` ajeno "es del mismo tipo" pero con otro formato (¿heurística por nombres de archivo tipo `backlog`/`changelog`/`handoff`? ¿se pregunta al operador?); si la migración es automática o guiada por preguntas (mapear archivo por archivo); qué pasa con el contenido que no tiene equivalente claro en la estructura nueva; si el `docs/` viejo se borra, se deja como respaldo, o se archiva.
- **Bloqueos:** conviene definir esto después de tener el flujo base (`questions-flow.md`) y `SKILL.md` ya probados en un caso simple, para no mezclar la complejidad de migración con la del flujo de scaffolding inicial.
- **Disparador:** cuando el operador pida continuar con esto.
- **Detalles:** ver sección 4.1 y sección 6 (estructura de referencia) de [`../../docs/desing.md`](../../docs/desing.md).
- **Agregada:** 2026-09-22
