# Backlog

Cola de tareas pendientes: el "qué falta" a nivel proyecto. No es la tarea en curso (eso vive en [`./handoff.md`](./handoff.md)) ni lo ya cerrado (eso vive en [`./changelog.md`](./changelog.md)).

**Ciclo de vida de un item:**
1. Se agrega acá cuando se identifica pero todavía no se empieza.
2. Cuando se empieza a trabajar, se saca de esta lista y pasa a ser la tarea actual en `handoff.md` (referenciando el título del item).
3. Cuando se cierra, sale de `handoff.md` y se registra en `changelog.md`.

No dejar en este archivo tareas que ya se están trabajando o que ya se cerraron — sería duplicar lo que corresponde a `handoff.md`/`changelog.md`.

---

## Redactar `src/SKILL.md`

- **Descripción:** el archivo está vacío. Debe definir el trigger y las instrucciones de alto nivel del skill: cuándo se dispara, qué hace a grandes rasgos, y que remite a `questions-flow.md` para la lógica de decisión detallada.
- **Decisiones/temas a definir antes de empezar:** ninguno — el diseño y el flujo de preguntas ya están completos en `docs/desing.md` y `src/docs/questions-flow.md`.
- **Bloqueos:** ninguno.
- **Disparador:** cuando el operador pida continuar con el skill. Es el archivo más urgente porque es el punto de entrada.
- **Detalles:** ver [`../../docs/desing.md`](../../docs/desing.md) y [`../../src/docs/questions-flow.md`](../../src/docs/questions-flow.md).
- **Agregada:** 2026-09-22

## Redactar el contenido de `src/template/project/*.md`

- **Descripción:** 8 archivos vacíos: `architecture.md`, `stack.md`, `entities.md`, `infrastructure.md`, `decisions.md`, `glossary.md`, `testing.md`, `setup.md`. Cada uno necesita su plantilla con placeholders, siguiendo el mismo estilo que ya tienen `template/agents/*.md` (rules, handoff, backlog, changelog, known-issues).
- **Decisiones/temas a definir antes de empezar:** ninguno — el propósito de cada archivo ya está descrito en [`../../src/docs/template-architecture.md`](../../src/docs/template-architecture.md).
- **Bloqueos:** ninguno.
- **Disparador:** cuando el operador pida continuar con las plantillas de `template/`.
- **Detalles:** ver [`../../src/docs/template-architecture.md`](../../src/docs/template-architecture.md) para la descripción de cada archivo.
- **Agregada:** 2026-09-22

## Redactar el contenido de `src/template/plans/*.md`

- **Descripción:** 4 archivos vacíos: `README.md`, `costs.md`, `limits.md`, `payments.md`.
- **Decisiones/temas a definir antes de empezar:** ninguno.
- **Bloqueos:** ninguno.
- **Disparador:** cuando el operador pida continuar con las plantillas de `template/`.
- **Detalles:** ver [`../../src/docs/template-architecture.md`](../../src/docs/template-architecture.md).
- **Agregada:** 2026-09-22

## Redactar `src/template/external/_example-service.md`

- **Descripción:** plantilla base para documentar integraciones externas, actualmente vacía.
- **Decisiones/temas a definir antes de empezar:** ninguno.
- **Bloqueos:** ninguno.
- **Disparador:** cuando el operador pida continuar con las plantillas de `template/`.
- **Detalles:** ver [`../../src/docs/template-architecture.md`](../../src/docs/template-architecture.md).
- **Agregada:** 2026-09-22

## Redactar `src/template/agents/roadmap.md`

- **Descripción:** único archivo de `template/agents/` que todavía está vacío (el resto — rules, handoff, backlog, changelog, known-issues — ya se rellenó).
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
