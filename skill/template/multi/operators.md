# Operadores

Quiénes trabajan en este proyecto y cuál es su carpeta en `docs/agents/`. Una línea por operador: `- <carpeta>: <correo>, <correo>`.

- **Carpeta:** nombre corto, en minúsculas y sin espacios. Una persona con varios correos (trabajo, personal, `noreply` de GitHub) va en una sola línea.
- **Operador actual:** el agente lo identifica buscando `git config user.email` en esta lista, sin distinguir mayúsculas.
- **Correo que no figura:** el agente le pregunta al operador con qué nombre registrarlo y si va a tomar tareas o solo a agregarlas al `team-backlog.md`. Persona nueva que toma tareas: se crea su carpeta con `handoff.md`, `backlog.md` e `history.md` y se agrega su línea; persona que ya figuraba: se agrega el correo a su línea.
- **Sin carpeta:** quien solo recolecta tareas (ej. habla con el cliente y no desarrolla) se registra como `- ana (solo team-backlog): <correo>`. No tiene carpeta; su agente solo agrega y edita tareas en `team-backlog.md`.
- Cada operador edita solo su carpeta; las de los demás son de solo lectura.

---

<!-- agent-context-kit:section=operators -->
## Lista

- [Placeholder — carpeta]: [Placeholder — correo]
