<!--
GUÍA para el agente, no se copia literal. `docs/README.md` es lo primero que se lee en cada
sesión: es un mapa mínimo, de ~1,5 KB como máximo. Se genera al final del flujo
(Ronda final de `questions-flow.md`) y debe:

- Describir el proyecto en 1-2 frases. Se pregunta una sola vez, la primera vez que se genera
  este archivo; en corridas futuras se preserva tal cual.
- Incluir el árbol de `docs/` con los archivos que efectivamente existen tras esta ejecución
  (los 3 de `external/` con su nombre real, no `_example-service.md`), una línea por archivo.
  Omitir lo que no existe, sin secciones vacías ni "N/A". Los `*` marcan archivos condicionales
  (criterio en `questions-flow.md`): quitarlos al generar.
- No repetir el orden de lectura (vive en `AGENTS.md`) ni contenido de otros archivos: enlazar.
- En modo multi-operador (ver `docs/multi-operator.md`), `agents/` se muestra así, con la carpeta real de cada operador:

  ```
  ├── agents/
  │   ├── rules.md          # reglas del proyecto, de todos los operadores
  │   ├── operators.md      # operadores y sus correos de git
  │   ├── team-backlog.md   # tareas sin dueño *
  │   └── <operador>/       # una carpeta por operador
  │       ├── handoff.md        # su tarea en curso
  │       ├── backlog.md        # las tareas que tomó
  │       ├── history.md        # sus tareas cerradas
  │       └── preferences.md    # su forma de trabajar *
  ```
-->

# [Nombre del proyecto]

[1-2 frases: qué es el proyecto, para quién, qué problema resuelve.]

**Operador:** la persona dueña del proyecto que le pide tareas al agente, aprueba decisiones y a quien se le pregunta cuando algo no está definido.

## Mapa de `docs/`

```
docs/
├── agents/
│   ├── rules.md          # reglas fijas del proyecto
│   ├── handoff.md        # estado actual del trabajo
│   ├── backlog.md        # tareas pendientes *
│   ├── history.md        # tareas cerradas y por qué *
│   ├── roadmap.md        # visión a mediano/largo plazo *
│   └── known-issues.md   # bugs conocidos y zonas frágiles *
├── project/
│   ├── architecture.md   # estructura del código, convenciones y dónde va cada cosa nueva *
│   ├── stack.md          # decisiones de stack que no se ven en las dependencias *
│   ├── decisions.md      # el porqué de decisiones ya tomadas *
│   ├── entities.md       # modelo de datos *
│   ├── infrastructure.md # entornos y deploy *
│   ├── glossary.md       # términos de negocio propios *
│   ├── testing.md        # estrategia de testing *
│   └── setup.md          # cómo levantar el proyecto en local *
├── external/             # una integración externa por archivo *
├── plans/                # negocio: tiers, costs, limits, payments *
└── others/               # contenido migrado sin equivalente en esta estructura *
```

Para ubicarte en el código o saber dónde va algo nuevo: [`project/architecture.md`](./project/architecture.md).
