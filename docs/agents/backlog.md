# Backlog

Cola de tareas pendientes: el "qué falta" a nivel proyecto. No es la tarea en curso (eso vive en [`./handoff.md`](./handoff.md)) ni lo ya cerrado (eso vive en [`./changelog.md`](./changelog.md)).

**Ciclo de vida de un item:**
1. Se agrega acá cuando se identifica pero todavía no se empieza.
2. Cuando se empieza a trabajar, se saca de esta lista y pasa a ser la tarea actual en `handoff.md` (referenciando el título del item).
3. Cuando se cierra, sale de `handoff.md` y se registra en `changelog.md`.

No dejar en este archivo tareas que ya se están trabajando o que ya se cerraron — sería duplicar lo que corresponde a `handoff.md`/`changelog.md`.

---

## Flujo de migración desde otro sistema de documentación

- **Descripción:** hoy la lógica de detección (sección 4.1 de `docs/desing.md`) solo contempla dos casos: no existe `docs/` (se crea normal) o existe con contenido ajeno (se usa `agent-context/` como respaldo, sin tocarlo). Falta un tercer camino: cuando ese `docs/` ajeno **sí** es documentación de proyecto/contexto para agentes, pero de otro formato o convención (ej. la estructura de referencia de la sección 6 de `desing.md`: `docs/claude/backlog.md`, `docs/claude/handoff.md`, etc., u otro esquema propio del operador). En ese caso, en vez de ignorarla y duplicar en `agent-context/`, el skill debería poder migrar/mapear ese contenido existente a la estructura de este skill.
- **Decisiones/temas a definir antes de empezar:** cómo se detecta que un `docs/` ajeno "es del mismo tipo" pero con otro formato (¿heurística por nombres de archivo tipo `backlog`/`changelog`/`handoff`? ¿se pregunta al operador?); si la migración es automática o guiada por preguntas (mapear archivo por archivo); qué pasa con el contenido que no tiene equivalente claro en la estructura nueva; si el `docs/` viejo se borra, se deja como respaldo, o se archiva.
- **Bloqueos:** conviene definir esto después de tener el flujo base (`questions-flow.md`) y `SKILL.md` ya probados en un caso simple, para no mezclar la complejidad de migración con la del flujo de scaffolding inicial.
- **Disparador:** cuando el operador pida continuar con esto.
- **Detalles:** ver sección 4.1 y sección 6 (estructura de referencia) de [`../../docs/desing.md`](../../docs/desing.md).
- **Agregada:** 2026-09-22

## Generar GitHub Releases

- **Descripción:** con el esquema de versionado ya resuelto (SemVer vía `package.json` + tags de git, ver `changelog.md`), falta el proceso para cortar un GitHub Release por cada tag — con notas, para que un repo destino pueda ver de un vistazo qué cambió entre versiones sin leer `git log`.
- **Decisiones/temas a definir antes de empezar:** notas generadas automáticamente desde los commits (ej. `gh release create --generate-notes`) vs. redactadas a mano resumiendo desde `docs/agents/changelog.md`; si se automatiza con un workflow de GitHub Actions al pushear un tag `v*`, o se corre manualmente cada vez.
- **Bloqueos:** ninguno.
- **Disparador:** cuando el operador pida continuar con esto — natural candidato para cuando se corte la primera versión "estable" (post `0.x`) o cuando se acumulen varios tags sin release.
- **Detalles:** ninguno todavía.
- **Agregada:** 2026-09-22

