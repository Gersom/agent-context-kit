// Documentos de ejemplo para los tests de los comandos de lectura: cada uno cubre un caso que el
// fixture `es-anchors` no tiene (sin tarea en curso, pausadas con plan, bloqueadas candidatas a
// desbloquear, grupos entre las libres, disparadores, un número repetido...). Los cuerpos llevan
// marcadores (`CUERPO-...`) para comprobar qué texto se imprime y cuál no.

/** Con tarea en curso; el «Próximo paso concreto» es la última subsección, con un título que no se busca por nombre. */
export const HANDOFF_CURRENT = `# Handoff

<!-- agent-context-kit:section=in-progress -->
## Tarea en progreso

Tarea 12 — Implementar el parser

Descripción de la tarea.

### Plan

- [x] Paso 1 — Preparar
- [x] Paso 2 — Escribir
- [ ] Paso 3 — Probar
- [ ] Cerrar

### Qué falta

Lo que falta.

### Decisiones a medio camino

- Una decisión.

### Cosa que hacer al retomar

Paso 3 — correr los tests.
Segunda línea del paso.

<!-- agent-context-kit:section=paused -->
## Tareas pausadas

### Tarea 8 — Migrar la documentación vieja

- **Plan:**
  - [x] Paso 1 — Copiar
  - [ ] Paso 2 — Revisar
- **Qué falta:** revisar \`setup.md\`.

### Tarea 9 — Otra pausada

- **Qué falta:** nada.
`;

/** Sin tarea en curso y con una pausada. */
export const HANDOFF_IDLE = `# Handoff

<!-- agent-context-kit:section=in-progress -->
## Tarea en progreso

Sin tarea en curso

<!-- agent-context-kit:section=paused -->
## Tareas pausadas

### Tarea 8 — Migrar la documentación vieja

- **Plan:**
  - [x] Paso 1 — Copiar
  - [ ] Paso 2 — Revisar
- **Qué falta:** revisar \`setup.md\`.
`;

/** Sin tarea en curso ni pausadas. */
export const HANDOFF_EMPTY = `# Handoff

<!-- agent-context-kit:section=in-progress -->
## Tarea en progreso

Sin tarea en curso

<!-- agent-context-kit:section=paused -->
## Tareas pausadas

Ninguna.
`;

/**
 * Backlog con libres (una con grupo en medio, disparadores únicos y uno genérico repetido) y
 * bloqueadas: la 6 depende solo de la 11 (cerrada), la 7 de la 11 y de la 3 (libre), la 16 no tiene
 * bloqueo vigente y la 17 no menciona tareas.
 */
export const BACKLOG_RICH = `# Backlog

**Próximo número de tarea:** 20

---

<!-- agent-context-kit:section=free -->
## Tareas libres

### Tarea 1 — Probar el flujo completo

- **Descripción:** CUERPO-1
- **Bloqueos:** Ninguno.
- **Disparador:** cuando el operador pregunte por tareas pendientes.

### Grupo — Documentar los planes (Tareas 14, 15)

- **Resumen:** todo lo de \`plans/\`.

### Tarea 3 — Exportar como skill

- **Bloqueos:** \`[Resuelto el 2026-09-24]\` — era \`[postergada]\`.
- **Disparador:** cuando el operador pregunte por tareas pendientes.

### Tarea 18 — Revisar los links

- **Disparador:** antes del release.

<!-- agent-context-kit:section=blocked -->
## Tareas bloqueadas / pospuestas

### Tarea 6 — Publicar el sitio

- **Bloqueos:** \`[dependencia]\` depende de la Tarea 11.

### Tarea 7 — Rehacer el README

- **Bloqueos:** \`[postergada]\` esperar a la Tarea 11 y a la Tarea 3.

### Tarea 16 — Revisar la licencia

- **Bloqueos:** \`[Resuelto el 2026-10-01]\` — era \`[dependencia]\` la Tarea 11.

### Tarea 17 — Migrar a otro host

- **Bloqueos:** \`[postergada]\` hasta nuevo aviso del operador.

<!-- agent-context-kit:section=grouped -->
## Tareas agrupadas

### Grupo — Documentar los planes

#### Tarea 14 — Redactar \`costs.md\`

- **Descripción:** costos CUERPO-14.
- **Disparador:** cuando se cierre el diseño.

#### Tarea 15 — Redactar \`limits.md\`

- **Descripción:** límites.
`;

/** Backlog sin tareas en ninguna sección. */
export const BACKLOG_EMPTY = `# Backlog

**Próximo número de tarea:** 5

<!-- agent-context-kit:section=free -->
## Tareas libres

Ninguna.

<!-- agent-context-kit:section=blocked -->
## Tareas bloqueadas / pospuestas

Ninguna.

<!-- agent-context-kit:section=grouped -->
## Tareas agrupadas

No aplica todavía — ningún grupo formado.
`;

/** Cinco entradas (la última sin número); los cuerpos no deben salir en `status`. */
export const HISTORY_RICH = `# History

---

## 2026-10-07 — ✅ Tarea 11 — Escribir el parser

- CUERPO-HISTORY-11: detalle largo que no debe imprimir status.

## 2026-10-06 — ❌ Tarea 10 — Usar YAML (descartada)

- CUERPO-HISTORY-10: motivo del descarte.

## 2026-10-05 — ✅ Tarea 9 — Preparar fixtures

- CUERPO-HISTORY-9.

## 2026-10-04 — ✅ Agregar la sección «Qué es»

- CUERPO-HISTORY-SIN-NUMERO.

## 2026-10-03 — ✅ Tarea 2 — La más vieja

- CUERPO-HISTORY-2.
`;

/** team-backlog con libres (una con disparador) y una bloqueada. */
export const TEAM_RICH = `# Backlog del equipo

<!-- agent-context-kit:section=free -->
## Tareas libres

### Revisar el copy del onboarding

- **Descripción:** CUERPO-TEAM-1
- **Disparador:** cuando salga el rediseño.

### Migrar el CI

- **Descripción:** CUERPO-TEAM-2

<!-- agent-context-kit:section=blocked -->
## Tareas bloqueadas / pospuestas

### Cambiar de proveedor

- **Bloqueos:** \`[postergada]\` esperar al contrato.
`;
