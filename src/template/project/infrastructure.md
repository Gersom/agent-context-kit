# Infraestructura

Cómo y dónde se despliega el proyecto: entornos, infraestructura y pipeline de deploy. Sirve para que un agente entienda el impacto de un cambio más allá del código — qué se rompe si algo falla en producción, qué entornos existen antes de llegar ahí, y cómo se libera un cambio.

El detalle de variables de entorno necesarias para correr el proyecto **en local** va en [`./setup.md`](./setup.md), no acá — este archivo es sobre los entornos desplegados, no sobre el setup de desarrollo.

---

## Entornos

<!-- Qué entornos existen (ej. desarrollo, staging, producción) y para qué sirve cada uno. Si staging no es fiel a producción en algo importante, decirlo acá. -->

[Placeholder]

## Infraestructura

<!-- Dónde corre el proyecto (proveedor cloud, PaaS, servidores propios), y los componentes principales (ej. base de datos gestionada, colas, storage, CDN). No hace falta el detalle de configuración — el objetivo es que un agente entienda el mapa general antes de tocar algo relacionado a infra. -->

[Placeholder]

## Pipeline de deploy

<!-- Cómo se despliega un cambio: qué lo dispara (push a una rama, tag, manual), qué pasos corre (build, tests, migraciones), y cómo se revierte si algo sale mal. -->

[Placeholder]

## Monitoreo y alertas

<!-- Dónde se ve si algo está roto en producción (logs, dashboards, alertas) — opcional, solo si existe y es relevante para decidir si un cambio es seguro. -->

[Placeholder, o "No hay monitoreo formal todavía"]
