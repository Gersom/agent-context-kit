# Filosofía del proyecto

El "por qué" del kit y lo que debe respetar cualquier cambio nuevo. El "qué" (la estructura) está en [`architecture.md`](./architecture.md).

> Principios deducidos del diseño y confirmados por el operador (2026-10-05); razón de ser dictada por el operador (2026-10-06). No es un registro histórico (ese es [`desing.md`](./desing.md)): si el diseño cambia, este archivo se actualiza.

## Para qué existe el kit

`agent-context-kit` empezó como un skill; hoy es un **kit de herramientas** (el skill más los scripts de [`scripts/`](../scripts/)). Mantiene documentación que sirve de **contexto para cualquier agente de IA**:

- el **estado** del trabajo y el **historial de cambios**;
- los **datos importantes y las decisiones ya tomadas**, para no volver a discutirlas ni inventar lo ya definido.

Así el agente a cargo conserva el contexto **entre sesiones, al cambiar de modelo, de harness o herramienta de IA**, sin leer todo el código ni adivinar cómo está organizado el proyecto, cómo estaba o qué hay que hacer.

Todo lo que sigue se deriva de esto: lo que no ayude a que el contexto sobreviva intacto de un agente a otro, no pertenece al kit.

## Principios

### 1. Markdown plano como fuente de verdad del estado

El estado vive en archivos markdown (`handoff.md`, `backlog.md`, `history.md`, etc.), sin base de datos, servidor ni build step. El agente y el operador los leen y editan directamente: esa es la interfaz. Si el estado dejara de ser texto plano, el kit perdería lo que lo diferencia.

### 2. El código gana ante un conflicto

El markdown manda para el estado y el contexto. El código solo se consulta cuando el markdown lo contradice o dos archivos se contradicen entre sí; en ese caso gana el código y se corrige la documentación. Es la Regla 4 de [`agents/rules.md`](./agents/rules.md), que no se repite acá (Regla 1).

### 3. Versionado y portable

Todo cambio de estado es un diff de git, revisable y revertible. Funciona con cualquier agente (Claude Code, Cursor, Copilot, etc.) y en cualquier repo sin instalar nada: basta con poder leer archivos.

### 4. Las herramientas son opcionales

Los scripts de `scripts/` (el task-tracker y los que vengan) son un atajo, nunca un requisito: son del repo, no del skill distribuido, y no se copian a los repos destino. Sin ellos, el agente edita los markdown a mano. Las reglas pueden preferir una herramienta, siempre con ese respaldo manual.

### 5. Tolerancia a la edición manual

Como los archivos se editan a mano, las herramientas tienen que convivir con eso:

- Los parsers aceptan ediciones razonables (espacios, orden de campos, texto libre) y usan anclas de máquina (`<!-- agent-context-kit:section=... -->`) en vez de depender del idioma de los headers.
- Lo que no puedan leer se avisa con archivo y línea; no se ignora en silencio.
- Una herramienta que modifica un archivo hace edición quirúrgica: no reformatea lo que no toca y el diff muestra solo el cambio pedido.

## Cambios nuevos

Toda herramienta o cambio de formato debe respetar estos principios. Si contradice alguno, se discute con el operador antes de hacerlo.
