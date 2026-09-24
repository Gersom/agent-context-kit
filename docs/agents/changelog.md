# Changelog

Historial de tareas ya cerradas: el "qué se hizo y por qué". A diferencia de [`./handoff.md`](./handoff.md), este archivo **se acumula** — cada tarea cerrada agrega una entrada nueva, no se sobrescriben las anteriores.

No es una cola de pendientes (eso vive en [`./backlog.md`](./backlog.md)): acá solo entran tareas ya terminadas, cuando salen de `handoff.md` por estar cerradas.

**Entradas nuevas van arriba** (orden cronológico inverso, lo más reciente primero).

> Carga inicial reconstruida retroactivamente desde `git log`, ya que este skill se está aplicando sobre su propio repo después de tener historial previo.

> Numeración de tareas (ver `backlog.md`) iniciada el 2026-09-24. Las entradas anteriores a esa fecha no tienen número asignado — no se renumeran retroactivamente.

---

## 2026-09-24 — Tarea 2 — Soporte multi-idioma

- Se agregó un paso nuevo en `questions-flow.md` ("Idioma de la documentación"), que corre siempre antes que cualquier otra cosa: detecta `IDIOMA` a partir del texto disponible del operador en la conversación actual (puede ser solo la frase de invocación, si es un chat nuevo sin más historial), y si es ambiguo, pregunta explícitamente en inglés.
- Todo el contenido redactado por el agente (prosa y headers de sección) va en `IDIOMA`, con excepción de los nombres de archivo del catálogo (siempre en inglés) y términos propios del kit o jerga técnica sin traducción natural asentada (ej. "Handoff", "Backlog", "Placeholder", "linter", "commit", "deploy"), que se mantienen en inglés.
- `IDIOMA` se persiste en `agents/rules.md` (nueva regla fija #3 + campo) la primera vez que se detecta, para que sesiones futuras no lo vuelvan a preguntar. Se actualizó la descripción de `rules.md` en `src/docs/template-architecture.md` en consecuencia.
- Se descartaron las alternativas de mantener plantillas duplicadas por idioma (carpetas `template/es/`+`template/en/`, o archivos `doc.en.md` al estilo Docusaurus): el catálogo ya no se copia literal, el agente redacta el contenido real por proyecto, así que duplicar la estructura por idioma solo agregaba riesgo de desincronización sin beneficio real.
- Por qué: el catálogo estaba escrito enteramente en español, lo que no encaja si el operador (u otro que use el skill) trabaja en otro idioma — la documentación de contexto debe ser legible para quien la usa, no solo para quien construyó la plantilla.

## 2026-09-22 — Sección "Comandos" en `template/project/setup.md`

- Se investigaron proyectos parecidos (Cline Memory Bank, `agent-markdown-memory-bank-protocol`, la spec de AGENTS.md, y el template `agentic-repository-engineering-template`) para comparar nuestro catálogo de `template/`. Conclusión: la estructura actual (backlog/handoff/changelog separados, puntero `CLAUDE.md`/`AGENTS.md`) es más granular que Cline y más proporcionada que templates tipo SDLC completo — no ameritaba una reestructuración grande.
- Se detectó un hueco real: la spec de AGENTS.md marca explícitamente "build commands with exact flags, test procedures" como contenido esperado de primera línea, y ningún archivo nuestro cubría comandos de build/lint/typecheck (solo `testing.md` cubre tests, y `setup.md` solo cubría "cómo levantar el proyecto").
- Se agregó la sección "Comandos" al inicio de `template/project/setup.md` (dev, build, lint, typecheck), sin crear un archivo nuevo — mantiene la proporción del catálogo actual. Se actualizó la descripción de `setup.md` en `src/docs/template-architecture.md` en consecuencia.
- Por qué: un agente necesita estos comandos durante la tarea, no solo al levantar el proyecto por primera vez — dejarlos implícitos en un `README.md` del proyecto (si existe) obliga a adivinar o buscar.

## 2026-09-22 — Invocación explícita del skill ("usa agent-context-kit...")

- Se agregó la sección "Cómo usar" al `README.md` raíz: dos frases de invocación explícita — "usa la skill agent-context-kit" (detección automática normal) y "...y migra mi proyecto" (fuerza el chequeo de migración).
- Se enganchó de verdad en `migration-flow.md` (nueva sección "Intención explícita del operador"): la intención explícita reemplaza el umbral de "proporción significativa" de la heurística de nombres — si el operador pide migrar, el flujo se dispara igual aunque haya pocas o ninguna coincidencia automática, y en ese caso se le pregunta a mano qué migrar en vez de asumir que no hay nada.
- Se agregó una mención breve en `SKILL.md` ("Cuándo se dispara") apuntando a esta sección del README, sin duplicar el detalle.
- De paso, se corrigió un link roto en `README.md` que todavía apuntaba a `agent-context-kit-diseno.md` (renombrado hace varios commits a `docs/desing.md`).
- Por qué: sin esto, la frase "migra mi proyecto" hubiera quedado documentada mostrando una funcionalidad que en la práctica no existía en el flujo — la heurística automática podía no alcanzar el umbral y simplemente no dispararse, sin forma de que el operador la forzara.

## 2026-09-22 — Firma opcional en `handoff.md` para `migration-flow.md`

- Se agregó un comentario HTML de firma (`agent-context-kit:signature`) al inicio de `template/agents/handoff.md`, marcado explícitamente como "ignorar al leer/actualizar, no es contenido".
- Se integró en `migration-flow.md` como señal de alta prioridad: si un archivo candidato a `handoff.md` durante la migración ya tiene esta firma, no se trata como sistema distinto a migrar — se asume que ya es de este skill (aunque la estructura de carpetas no calce exactamente) y se va directo al flujo de proyecto existente.
- Decisión explícita con el operador: **opcional, no obligatoria**. Su ausencia no descarta nada (un `handoff.md` de este skill sin la firma sigue siendo válido, solo se sigue con la heurística de nombre normal) — evita tener que retrofitear archivos ya generados (incluidos los de este mismo repo, que no la tienen).
- Por qué: la heurística de nombre de `migration-flow.md` puede confundir un `handoff.md` ya generado por este skill con uno de un sistema distinto que casualmente usa el mismo nombre; la firma resuelve esa ambigüedad cuando está presente.

## 2026-09-22 — Flujo de migración desde otro sistema de documentación

- Se creó `src/docs/migration-flow.md`: se dispara cuando `docs/agents/`+`docs/project/` no existen pero el `docs/` del repo destino tiene archivos cuyo nombre matchea el catálogo de este skill (tabla de heurística por patrón de nombre — `backlog`, `handoff`, `stack`, `entities`, etc. — construida sobre la estructura de referencia real de la sección 6 de `docs/desing.md`).
- Decisiones tomadas (con el operador, antes de escribir el flujo):
  - Archivos sin equivalente claro en la skill (ej. `idempotency.md`, `production-watch.md`) van a una carpeta nueva `docs/others/`, sin transformar, tal cual estaban — no se fuerzan a encajar en un template que no les corresponde.
  - El `docs/` viejo se resguarda completo en `docs-legacy/` antes de tocar nada, y **no se borra automáticamente** — queda como respaldo hasta que el operador lo borre a mano.
  - Los archivos que sí mapean se transforman (no solo se renombran) para encajar en la plantilla correspondiente de `template/`, conservando toda la información original.
  - Antes de mover o escribir nada, se muestra al operador la tabla de mapeo propuesta (incluyendo fusiones, ej. `stack-backend.md` + `stack-frontend.md` → `stack.md`) para confirmar.
- Se enganchó el flujo desde `questions-flow.md` (nueva rama en la detección automática, antes del chequeo de `ALCANCE`), `SKILL.md` (punto 1 y sección de enlaces) y `docs/architecture.md` (árbol + descripción). Se agregó la sección condicional "Otros (`others/`)" a `template/README.md` para cuando la migración genera esa carpeta.
- Por qué: el operador tiene otros proyectos con sistemas de documentación propios o parecidos al de este skill; sin este flujo, esa documentación se hubiera perdido o quedado duplicada sin usar en `agent-context/` en vez de reusarse.
- Con esto, `docs/agents/backlog.md` queda vacío — no hay más items pendientes identificados por ahora.

## 2026-09-22 — Generar GitHub Release de `v0.1.0`

- Se decidió el proceso: manual (`gh release create` al cortar un tag), con notas redactadas a mano resumiendo `docs/agents/changelog.md` — no se automatiza con GitHub Actions por ahora, porque los releases van a ser poco frecuentes y esto es un repo de documentación, no software que se despliegue por CI.
- Se creó el release [`v0.1.0`](https://github.com/Gersom/agent-context-kit/releases/tag/v0.1.0) sobre el tag ya pusheado.
- Por qué: para que un repo destino pueda ver de un vistazo qué cambió entre versiones sin tener que leer `git log`.

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
