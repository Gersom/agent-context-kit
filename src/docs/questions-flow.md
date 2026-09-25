# questions-flow

Árbol de decisión que el agente debe seguir al ejecutar este skill sobre un repositorio. Cada paso indica: qué preguntar (si algo), cómo interpretar la respuesta, y qué acción concreta tomar (qué archivo copiar de `template/` a `docs/<destino>/` en el repo destino, o qué leer/actualizar).

Convención de rutas: `template/X` se refiere a la plantilla en este skill; `docs/X` se refiere al destino en el repo del operador (o `agent-context/X` si aplica el conflicto descrito en el punto 4.1 del documento de diseño).

**Convención de interacción — rondas:** las preguntas se agrupan en rondas. Dentro de una misma ronda todas las preguntas se hacen juntas, en una sola interacción, porque son independientes entre sí (ninguna depende de la respuesta de otra de la misma ronda). Solo se avanza a la siguiente ronda una vez respondida la anterior, porque su resultado puede condicionar qué se pregunta después.

---

## Idioma de la documentación (siempre, antes que cualquier otra cosa)

Corre primero, antes de la Ronda 1 — aplica tanto si se dispara scaffolding nuevo como el flujo de proyecto existente, porque determina en qué idioma se redacta todo lo que sigue.

1. **¿`docs/agents/rules.md` ya existe y tiene el idioma registrado?** (ver la regla "Idioma de la documentación" en sus Reglas por defecto — `template/agents/rules.md`).
   - **Sí** → usar ese valor como `IDIOMA`. No volver a preguntar. Fin de este paso.
   - **No** → seguir con el paso 2.
2. **Detectar `IDIOMA` a partir del texto del operador disponible en la conversación actual.** Es común que sea un chat nuevo sin más historial que la frase de invocación misma (ej. *"usa la skill agent-context-kit"*) — no asumir que hay más contexto disponible del que realmente hay.
   - Si ese texto tiene suficientes marcas de idioma natural → usar ese idioma como `IDIOMA`.
   - Si es ambiguo o insuficiente (ej. el operador solo escribió *"skill agent-context-kit"*, sin palabras de idioma natural que lo identifiquen) → preguntar explícitamente, **en inglés** (idioma universal, para no asumir uno): *"Which language should I use for this project's documentation?"*
3. **De acá en adelante, redactar todo contenido nuevo (prosa y headers de sección) en `IDIOMA`**, con estas excepciones que se mantienen siempre en inglés:
   - Nombres de archivo y carpetas del catálogo (`backlog.md`, `handoff.md`, `stack.md`, etc.).
   - Términos propios de este kit (ej. "Handoff", "Backlog", "History", "Roadmap", "Placeholder") y jerga técnica sin traducción natural asentada (ej. "linter", "commit", "deploy", "merge").
4. **Si en esta ejecución se genera o se toca `docs/agents/rules.md`, registrar `IDIOMA`** en la regla correspondiente, para que sesiones futuras no vuelvan a preguntarlo.

---

## Ronda 1 — Gate de alcance (siempre, sola)

**Preguntar:** "¿Qué deseas hacer?"

- **a) Tarea puntual** (bug fix, ajuste menor)
- **b) Agregar una feature** a un proyecto existente
- **c) Testear/validar algo puntual**
- **d) Iniciar o continuar un desarrollo prolongado**

Guardar la respuesta como `ALCANCE`.

---

## Detección automática (sin preguntar, corre después de la Ronda 1)

El agente revisa el repo destino:

**¿Existe `docs/agents/` y/o `docs/project/`?** (o sus equivalentes bajo `agent-context/`)

- **SÍ** → el skill ya fue inicializado antes en este repo. **No se dispara scaffolding**, `ALCANCE` deja de ser relevante. Ir directo al **flujo de proyecto existente**:
  1. Leer `docs/agents/rules.md`.
  2. Leer `docs/agents/handoff.md`.
  3. Leer las líneas relevantes de `docs/agents/backlog.md` (relacionadas a la tarea pedida).
  4. Ejecutar la tarea que pidió el operador.
  5. Al terminar, actualizar `docs/agents/handoff.md` (siempre se sobrescribe con el estado actual, en cada paso del plan si lo hubo — ver Regla 6) y agregar la entrada correspondiente a `docs/agents/history.md` (hecha o descartada — ver Regla 7).
  6. **Fin del flujo.** No continuar con las rondas siguientes.

- **NO, pero `docs/` (o carpeta equivalente) tiene archivos cuyo nombre matchea el catálogo de este skill en una proporción significativa** → hay documentación de contexto previa, pero de otro formato/convención. No se trata como conflicto genuino (eso sería `agent-context/`, ver `docs/desing.md` 4.1): se dispara el **flujo de migración** — ver [`./migration-flow.md`](./migration-flow.md). `ALCANCE` deja de ser relevante hasta que ese flujo termine (internamente se comporta como `ALCANCE = d`).

- **NO** → no hay documentación previa de este skill ni nada reconocible para migrar. Continuar según `ALCANCE`:

  | ALCANCE | Set | Continúa a |
  |---|---|---|
  | a) tarea puntual | Mínimo | Copiar el set mínimo (ver tabla de sets más abajo) y saltar a la **Ronda final (con opt-in)** |
  | c) testear puntual | Mínimo | Igual que (a) |
  | b) agregar feature | Intermedio | Copiar el set intermedio; evaluar Ronda 3 solo si la feature toca esa área (glossary, external, infra, entities, testing, setup); luego **Ronda final** (sin opt-in, ya se decidió documentar) |
  | d) desarrollo prolongado | Completo | Ir a **Ronda 2** |

---

## Ronda 2 — Contexto base (solo si `ALCANCE = d`)

Preguntar las 3 juntas, en una sola interacción:

1. **¿Es un proyecto nuevo o uno existente al que se le agrega documentación retroactiva?**
   - Si es **existente** → revisar el historial de git (`git log`) para reconstruir un `agents/history.md` inicial en vez de dejarlo vacío. Extraer hitos relevantes de los commits, no un volcado literal del log (todas las entradas reconstruidas así van como ✅ Hecha).
   - Si es **nuevo** → `agents/history.md` se copia vacío/con la plantilla base.

2. **¿En qué etapa está el proyecto?** → guardar como `ETAPA`:
   - `idea/setup`
   - `desarrollo activo (MVP)`
   - `producción/mantenimiento`

3. **¿Qué tipo de proyecto es?** → informativo, para redactar `project/architecture.md` y `project/stack.md` con el enfoque correcto:
   - `frontend`
   - `backend`
   - `fullstack (repo único)`
   - `fullstack (monorepo)`
   - `otro`

---

## Archivos siempre copiados (sin preguntar, corre después de la Ronda 2)

Cuando `ALCANCE = d`, copiar siempre:

- `template/agents/rules.md` → `docs/agents/rules.md`
- `template/agents/handoff.md` → `docs/agents/handoff.md`
- `template/agents/backlog.md` → `docs/agents/backlog.md`
- `template/agents/history.md` → `docs/agents/history.md`
- `template/project/architecture.md` → `docs/project/architecture.md`
- `template/project/stack.md` → `docs/project/stack.md`

Y según `ETAPA` (sin preguntar):

- **`ETAPA` ≠ `idea/setup`** → copiar también:
  - `template/agents/roadmap.md` → `docs/agents/roadmap.md`
  - `template/project/decisions.md` → `docs/project/decisions.md`

`docs/README.md` **no se copia acá.** Su contenido varía según el set y las respuestas de cada ronda (qué archivos terminaron existiendo), así que se genera al final del flujo (ver Ronda final, paso 1) usando `template/README.md` solo como guía de estructura/formato, no como fuente literal.

---

## Ronda 3 — Preguntas condicionadas (solo si `ALCANCE = d`, con `ETAPA` ya conocida)

Preguntar todas juntas, en una sola interacción (todas son independientes entre sí; solo dependen de `ETAPA`, que ya se conoce de la Ronda 2):

- **Solo si `ETAPA = producción/mantenimiento`:** "¿Hay bugs conocidos o zonas frágiles del código que un agente debería evitar tocar sin cuidado?"
  → Sí: copiar `template/agents/known-issues.md` → `docs/agents/known-issues.md`

- "¿El proyecto maneja términos de negocio específicos que un agente externo no entendería a simple vista?"
  → Sí: copiar `template/project/glossary.md` → `docs/project/glossary.md`

- "¿El proyecto tiene componente de costos, límites de uso o pagos?"
  → Sí: copiar toda la carpeta `template/plans/` → `docs/plans/` (`README.md`, `tiers.md`, `costs.md`, `limits.md`, `payments.md`)

- "¿El proyecto integra servicios externos (APIs de terceros, IA, pasarelas de pago, etc.)?"
  → Sí: pasa a la **Ronda 4**. No: omitir carpeta `external/`.

- "¿Hay infraestructura/deploy relevante que documentar?"
  → Sí: copiar `template/project/infrastructure.md` → `docs/project/infrastructure.md`

- "¿El proyecto tiene un modelo de datos o esquema de base de datos que valga la pena documentar aparte?"
  → Sí: copiar `template/project/entities.md` → `docs/project/entities.md`

- "¿Hay una estrategia de testing establecida (o se quiere establecer)?"
  → Sí: copiar `template/project/testing.md` → `docs/project/testing.md`

- "¿El setup local requiere pasos no triviales (variables de entorno, seeds, servicios externos corriendo)?"
  → Sí: copiar `template/project/setup.md` → `docs/project/setup.md`

---

## Ronda 4 — Seguimiento de integraciones externas (condicional)

Solo si en la Ronda 3 la respuesta fue "sí" a integraciones externas.

**Preguntar:** "¿Cuántas y cuáles son?"

1. Copiar también `template/external/_example-service.md` → `docs/external/_example-service.md`, **sin renombrar ni modificar.** Queda ahí como plantilla disponible para que, más adelante, otra IA (o el operador) pueda documentar una nueva integración sin depender de este skill.
2. Por cada servicio declarado ahora:
   - Duplicar `template/external/_example-service.md` → `docs/external/<nombre-servicio>.md`
   - Renombrar el título/contenido de la copia para reflejar el servicio real.

---

## Ronda final — Generar README + puntero en la raíz (siempre, en cualquier rama que haya copiado algo, excepto set mínimo)

1. **Generar `docs/README.md`** (no copiar `template/README.md` literal): usando ese archivo solo como guía de estructura/formato, armar un índice que enlace únicamente a los archivos que efectivamente existen en `docs/` tras esta ejecución (si no se copió `glossary.md`, no aparece en el índice; si se crearon 3 `external/*.md`, los 3 quedan listados; etc.). Este paso se omite en el set mínimo (no hay README en ese set).
2. Determinar si se usó `docs/` o `agent-context/` (según lógica de detección de conflicto, punto 4.1 del documento de diseño).
3. **`CLAUDE.md`**:
   - No existe → crear con el párrafo puntero mínimo.
   - Existe con otro contenido → agregar sección delimitada `<!-- agent-docs-skill:start -->` ... `<!-- agent-docs-skill:end -->` al final, solo si el marcador no está ya presente.
4. Repetir el mismo paso 3 para **`AGENTS.md`**.
5. Si `ALCANCE` fue `a` o `c` (set mínimo) → preguntar opt-in de cierre:

   **"¿Quieres igual la documentación completa porque vas a seguir trabajando este proyecto?"**
   - **Sí** → volver a la Ronda 2 y correr el flujo completo.
   - **No** → fin.

---

## Resumen — sets de archivos

| Set | Se dispara con | Archivos incluidos | Por qué |
|---|---|---|---|
| **Mínimo** | a) Tarea puntual / c) Testear algo puntual | `agents/rules.md`, `agents/handoff.md` | Solo necesita no romper nada (reglas) y saber en qué está el proyecto ahora (handoff). No amerita backlog/history: es de un solo uso, sin ciclo de vida que registrar. |
| **Intermedio** | b) Agregar una feature a un proyecto existente | Todo el mínimo + `agents/backlog.md`, `agents/history.md`, `project/architecture.md`, `project/stack.md`, `README.md` (generado) | Una feature sí tiene ciclo de vida (se agenda, se trabaja, se cierra o se descarta) → backlog/history. Para encajarla bien hace falta entender la estructura (architecture) y qué tecnologías ya están en uso (stack). `README.md` como índice porque ya son 6 archivos; se genera y no se copia porque su contenido depende de qué se haya creado. |
| **Completo** | d) Desarrollo prolongado / proyecto nuevo | Todo el intermedio + los condicionales de Ronda 2-4 (`roadmap`, `decisions`, `known-issues`, `glossary`, `entities`, `infrastructure`, `testing`, `setup`, `external/*`, `plans/*`) | Proyecto de largo aliento necesita cobertura completa: visión a futuro, decisiones técnicas, dominio de negocio, integraciones, testing. |

## Resumen — condición de disparo por archivo

| Archivo | Se copia cuando |
|---|---|
| `README.md` | Se genera (no se copia) en set intermedio y completo, listando solo los archivos que existan (no en mínimo) |
| `agents/rules.md` | Siempre |
| `agents/handoff.md` | Siempre |
| `agents/backlog.md` | Set intermedio y completo |
| `agents/history.md` | Set intermedio y completo |
| `agents/roadmap.md` | Set completo y `ETAPA` ≠ `idea/setup` |
| `agents/known-issues.md` | Set completo, `ETAPA` = `producción/mantenimiento` y hay bugs/zonas frágiles conocidas |
| `project/architecture.md` | Set intermedio y completo |
| `project/stack.md` | Set intermedio y completo |
| `project/decisions.md` | Set completo y `ETAPA` ≠ `idea/setup` |
| `project/glossary.md` | Hay términos de negocio propios |
| `project/entities.md` | Hay modelo de datos/esquema relevante |
| `project/infrastructure.md` | Hay infraestructura/deploy relevante |
| `project/testing.md` | Hay estrategia de testing (o se quiere establecer) |
| `project/setup.md` | Setup local no trivial |
| `external/_example-service.md` (plantilla) | Se copia sin renombrar junto con las integraciones declaradas, para que quede disponible si se agregan más adelante |
| `external/<servicio>.md` | Por cada integración externa declarada |
| `plans/*` | Hay costos, límites de uso o pagos |
