# Changelog

Historial de tareas ya cerradas: el "qué se hizo y por qué". A diferencia de [`./handoff.md`](./handoff.md), este archivo **se acumula** — cada tarea cerrada agrega una entrada nueva, no se sobrescriben las anteriores.

No es una cola de pendientes (eso vive en [`./backlog.md`](./backlog.md)): acá solo entran tareas ya terminadas, cuando salen de `handoff.md` por estar cerradas.

**Entradas nuevas van arriba** (orden cronológico inverso, lo más reciente primero).

> Carga inicial reconstruida retroactivamente desde `git log`, ya que este skill se está aplicando sobre su propio repo después de tener historial previo.

---

## 2026-09-22 — Versionar el proyecto: `package.json` + SemVer + tags de git

- Se creó `package.json` en la raíz (`name`, `version: 0.1.0`, `description`, `private: true`, `repository`) como número de versión visible dentro del repo.
- Se define el esquema: SemVer, tag de git `vX.Y.Z` como fuente de verdad para que un repo destino se fije a una versión concreta. Criterio de bump — patch: fixes/ajustes de redacción en plantillas existentes; minor: contenido nuevo que no rompe nada (nueva plantilla, nueva rama del árbol de preguntas); major: cambios que rompen algo que un repo destino ya pudiera estar usando (mover/renombrar archivos de `template/` referenciados desde `questions-flow.md`, cambiar la estructura generada en `docs/agents`/`docs/project`).
- Versión inicial `0.1.0` y no `1.0.0`: aunque el catálogo de `template/` y `SKILL.md` ya están completos, el flujo todavía no se probó end-to-end sobre un repo real.
- Por qué: para que un repo destino pueda fijar/actualizar a una versión concreta del skill en vez de seguir `main` a ciegas.
- Queda pendiente como item de backlog aparte: "Generar GitHub Releases" (notas por versión) — esta tarea solo resolvió el esquema de versión + tags, no el proceso de release.

## 2026-09-22 — Redactar `external/_example-service.md` y `template/README.md` — catálogo de `template/` completo

- Se redactó `external/_example-service.md`: plantilla a duplicar/renombrar por integración, con secciones para qué se usa, cómo se integra, credenciales, límites/costos (con link a `plans/limits.md`/`plans/costs.md` en vez de duplicar), comportamiento ante fallos y documentación oficial.
- Se redactó `template/README.md`: guía de estructura/tono para el `docs/README.md` que el agente genera al final del flujo (no se copia literal), cubriendo todas las secciones posibles (`agents/`, `project/`, `external/`, `plans/`) con nota de qué es condicional.
- Por qué: eran los dos últimos archivos vacíos del catálogo de `template/`. Con esto queda completo: `agents/` (6 archivos), `project/` (8), `external/` (1 plantilla), `plans/` (5) y el `README.md` raíz — todo lo que falta ahora es lógica/proceso (versionado, migración), no contenido de plantillas.

## 2026-09-22 — Agregar `src/template/plans/tiers.md` (catálogo de planes)

- Se creó `template/plans/tiers.md`: catálogo de planes (nombre, para quién es, qué incluye a alto nivel, modelo de cobro, precio) separado de los números de cuota (`limits.md`) y del detalle de pasarelas (`payments.md`).
- Se recortó la sección "Modelo de facturación" de `payments.md` (quedaba redundante con el nuevo archivo) y se dejó un link a `tiers.md` en su lugar.
- Se actualizaron las referencias cruzadas: `plans/README.md` (índice), `src/docs/template-architecture.md` (árbol + descripción) y `src/docs/questions-flow.md` (lista de archivos que se copian al elegir la carpeta `plans/`).
- Por qué: al responder una pregunta del operador sobre dónde documentar planes tipo Free/Pro/Max, se detectó que no había un lugar único y obvio para el catálogo de planes — quedaba repartido de forma implícita entre `payments.md` y `limits.md`.

## 2026-09-22 — Redactar `src/template/project/*.md`

- Se redactaron los 8 archivos: `architecture.md`, `stack.md`, `entities.md`, `infrastructure.md`, `decisions.md` (formato ADR), `glossary.md`, `testing.md` y `setup.md`.
- Por qué: era el bloque más grande de plantillas vacías que quedaba. Con esto `template/project/` queda completo — solo faltan `external/_example-service.md` y `template/README.md` para terminar todo el catálogo de `template/`.

## 2026-09-22 — Redactar `src/template/plans/*.md`

- Se redactaron los 4 archivos: `README.md` (índice de la carpeta), `costs.md` (costos de operar el proyecto, por partida), `limits.md` (cuotas/rate limits/topes por plan) y `payments.md` (modelo de facturación, pasarelas y casos particulares).
- Por qué: con esto `template/plans/` queda completo — solo faltan `template/project/*`, `external/_example-service.md` y `template/README.md` para terminar todo el catálogo de `template/`.

## 2026-09-22 — Redactar `src/template/agents/roadmap.md`

- Se redactó la plantilla de `roadmap.md`: visión a mediano/largo plazo, con la distinción explícita frente a `backlog.md` (roadmap = iniciativas a nivel de visión, todavía sin desglosar; backlog = tareas ya concretas y accionables) y el criterio de cuándo una iniciativa "gradúa" de una a otra.
- Por qué: era el único archivo de `template/agents/` que seguía vacío — con esto esa carpeta queda completa.
- Se agregó además un nuevo item al backlog: "Flujo de migración desde otro sistema de documentación", para cubrir el caso en que el `docs/` de un repo destino ya tiene documentación de contexto pero con otro formato/convención (hoy solo se contempla "no existe" o "existe y es ajena → se usa `agent-context/`").

## 2026-09-22 — Redactar `src/SKILL.md`

- Se redactó el punto de entrada del skill: frontmatter (`name`/`description`) + trigger, flujo de alto nivel (detección automática → proyecto existente vs. scaffolding condicionado por alcance) y enlaces a `docs/questions-flow.md`, `docs/template-architecture.md` y `../docs/desing.md`, sin duplicar su contenido.
- Por qué: era el archivo más urgente del backlog — sin él el skill no tenía un punto de entrada real, solo la lógica de decisión (`questions-flow.md`) sin nada que la dispare.
- Se agregó además un nuevo item al backlog: "Versionar el skill y generar releases", para más adelante (una vez que `template/` esté completo).

## 2026-09-22 — Scaffolding de `docs/agents/` en la raíz del propio repo

- Se crearon `docs/agents/handoff.md`, `backlog.md` y `changelog.md` en la raíz de `agent-context-kit`, siguiendo el formato definido en `src/template/agents/`.
- Por qué: dogfooding — usar el propio skill para documentar el estado del proyecto que lo construye, en vez de depender solo de `docs/desing.md` (que es un registro histórico de diseño, no el estado actual).

## 2026-09-22 — Flesh out de `template/agents/handoff.md`, `backlog.md`, `changelog.md`

- Se redactó el contenido real (estructura + placeholders + instrucciones de uso) de estas tres plantillas.
- Por qué: eran de los últimos archivos de `agents/` sin contenido; hacían falta para poder usar el set mínimo/intermedio del flujo.

## 2026-09-22 — Flesh out de `questions-flow.md`, rename `example/` → `template/`, `rules.md`

- Se redactó el árbol de decisión completo (rondas 1 a 4 + ronda final) en `src/questions-flow.md`.
- Se renombró la carpeta `example/` a `template/` para reflejar mejor su rol (plantillas a copiar, no un ejemplo de referencia).
- Se agregó `template/agents/rules.md`.
- Por qué: era el corazón de la lógica del skill; sin esto no había forma de que un agente supiera qué preguntar ni qué copiar.

## 2026-09-21 — Scaffold de la estructura de archivos del skill bajo `src/`

- Se crearon (vacíos) `src/SKILL.md`, `src/questions-flow.md` y todo el árbol de `src/template/` (agents/, project/, external/, plans/).
- Por qué: fijar la estructura de carpetas acordada en el diseño antes de rellenar contenido.

## 2026-09-21 — Documentación inicial de diseño + `CLAUDE.md` raíz

- Se agregó `docs/desing.md` (documento de diseño completo) y `CLAUDE.md` en la raíz apuntando a él.
- Por qué: dejar registro de las decisiones tomadas en la conversación de diseño (nombre del proyecto, estructura, lógica de detección `docs/` vs `agent-context/`, flujo de preguntas) para no depender de la memoria de esa conversación.

## 2026-09-21 — README inicial del repo

- Se agregó `README.md` con la presentación del proyecto y su estructura general.

## 2026-09-21 — Documento de diseño inicial

- Primer commit del repo: borrador inicial de diseño de `agent-context-kit`.
