# Filosofía del proyecto

El "por qué" de la suite y lo que debe respetar cualquier cambio nuevo. El "qué" (la estructura) está en [`architecture.md`](./architecture.md).

> Principios deducidos del diseño y confirmados por el operador (2026-10-05); razón de ser dictada por el operador (2026-10-06). No es un registro histórico: si el diseño cambia, este archivo se actualiza.

## Para qué existe la suite

`agent-context-suite` empezó como una skill; hoy es una **suite de herramientas** (los scripts de [`scripts/`](../scripts/)) que acompañan a la skill, que vive en su propio repo, [Gersom/agent-context-skill](https://github.com/Gersom/agent-context-skill). Mantiene documentación que sirve de **contexto para cualquier agente de IA y para las personas del proyecto**:

- el **estado** del trabajo y el **historial de cambios**;
- los **datos importantes y las decisiones ya tomadas**, para no volver a discutirlas ni inventar lo ya definido.

Con eso:

- **El agente a cargo** conserva el contexto entre sesiones y al cambiar de modelo, de harness o de herramienta de IA, sin leer todo el código ni adivinar cómo está organizado el proyecto, cómo estaba o qué hay que hacer.
- **Un colaborador** hace `pull` y su agente (el que use) ya sabe el contexto, qué falta y cómo seguir, sin preguntarle a quien hizo el trabajo.
- **El operador** tiene un mapa de tareas que lo ayuda a no olvidar nada y a retomar el contexto más rápido.

**Qué se gana y qué no:** se reduce el retrabajo y el tiempo de las personas (volver a preguntar, repetir lo ya decidido, rehacer lo ya hecho). No se promete ahorrar tokens: leer la documentación también cuesta, y ese costo se mantiene bajo solo si la documentación se mantiene corta.

Todo lo que sigue se deriva de esto: lo que no ayude a que el contexto sobreviva intacto de un agente o una persona a otra, no pertenece a la suite.

## Principios

### 1. Markdown plano como fuente de verdad del estado

El estado vive en archivos markdown (`handoff.md`, `backlog.md`, `history.md`, etc.), sin base de datos, servidor ni build step. El agente y el operador los leen y editan directamente: esa es la interfaz. Si el estado dejara de ser texto plano, la suite perdería lo que la diferencia.

### 2. El código gana ante un conflicto

El markdown manda para el estado y el contexto. El código solo se consulta cuando el markdown lo contradice o dos archivos se contradicen entre sí; en ese caso gana el código y se corrige la documentación. Es la Regla 4 de [`agents/rules.md`](./agents/rules.md), que no se repite acá (Regla 1).

### 3. Versionado y portable

Todo cambio de estado es un diff de git, revisable y revertible. Funciona con cualquier agente (Claude Code, Cursor, Copilot, etc.) y en cualquier repo sin instalar nada: basta con poder leer archivos.

### 4. Las herramientas son opcionales

Los scripts de `scripts/` (el task-tracker y los que vengan) son un atajo, nunca un requisito: son del repo, no de la skill distribuida, y no se copian a los repos destino. Sin ellos, el agente edita los markdown a mano. Las reglas pueden preferir una herramienta, siempre con ese respaldo manual.

### 5. Tolerancia a la edición manual

Como los archivos se editan a mano, las herramientas tienen que convivir con eso:

- Los parsers aceptan ediciones razonables (espacios, orden de campos, texto libre) y usan anclas de máquina (`<!-- agent-context-skill:section=... -->`) en vez de depender del idioma de los headers.
- Lo que no puedan leer se avisa con archivo y línea; no se ignora en silencio.
- Una herramienta que modifica un archivo hace edición quirúrgica: no reformatea lo que no toca y el diff muestra solo el cambio pedido.

## Términos

Un término por concepto, en toda la documentación y en los mensajes de los scripts:

- **La skill** (femenino): `agent-context-skill`, el repo que se clona en `skill/` o `agent-context-skill/`.
- **Operador:** la persona que trabaja con el agente (definido en [`README.md`](./README.md)). «Usuario» solo nombra a quien usa el producto de un proyecto.
- **Plantilla:** cada archivo de `template/` que la skill copia a un proyecto. «Template» solo nombra la carpeta `template/` o el archivo `template-architecture.md`.
- **Ronda** (bloque de preguntas de un flujo) y **tanda** (hasta 4 preguntas en una llamada); **recuadro** es la interfaz de `AskUserQuestion`, nunca «widget». Ver `asking-questions.md` de la skill.

## Cambios nuevos

Toda herramienta o cambio de formato debe respetar estos principios. Si contradice alguno, se discute con el operador antes de hacerlo.
