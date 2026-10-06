# Setup local

Cómo levantar el proyecto en local, para los casos en que no es trivial: variables de entorno necesarias, seeds de datos, servicios externos que tienen que estar corriendo, etc. — y los comandos exactos que un agente va a necesitar mientras trabaja (build, lint, typecheck), no solo para arrancar el servidor de desarrollo.

Si `bun install && bun run dev` alcanza para levantar el proyecto y no hay comandos de build/lint relevantes más allá de eso, este archivo no hace falta.

---

## Comandos

<!-- Comandos exactos para las operaciones que un agente va a necesitar mientras trabaja — no solo "cómo levantar el proyecto" (eso va en la sección de Pasos, más abajo). Los comandos de test van en `testing.md`, no acá, para no duplicar — solo linkear desde ahí si hace falta. Incluir flags no obvios si hace falta pasarlos siempre. -->

| Comando | Para qué sirve |
|---|---|
| `[Placeholder]` | dev — levantar el servidor de desarrollo |
| `[Placeholder]` | build — compilar para producción |
| `[Placeholder]` | lint |
| `[Placeholder]` | typecheck (si aplica) |

## Prerrequisitos

<!-- Runtime/versión, servicios que deben estar instalados o corriendo antes de empezar (base de datos, Redis, etc.), cuentas/credenciales de terceros necesarias para desarrollo. -->

[Placeholder]

## Variables de entorno

<!-- Cuáles son necesarias, para qué sirve cada una, y de dónde se consigue el valor (ej. "pedir al equipo", "crear cuenta de prueba en X", "cualquier valor sirve en local"). No poner acá los valores reales/secretos — solo qué variable existe y cómo obtenerla. -->

| Variable | Para qué sirve | Cómo conseguir el valor |
|---|---|---|
| `[Placeholder]` | [Placeholder] | [Placeholder] |

## Pasos

<!-- Secuencia concreta desde clonar el repo hasta tener el proyecto corriendo: instalar dependencias, levantar servicios, correr migraciones/seeds, iniciar el servidor. -->

1. [Placeholder]

## Datos de prueba (seeds)

<!-- Si hay un seed/fixture para tener datos de prueba realistas, cómo correrlo. -->

[Placeholder, o "No hay seeds — la base arranca vacía"]

## Servicios externos en local

<!-- Si el proyecto depende de servicios externos también en desarrollo (ej. un servicio de IA, una pasarela de pago en modo sandbox), cómo se manejan: ¿se usan credenciales de sandbox?, ¿se mockean?, ¿hace falta acceso real? -->

[Placeholder, o "Ninguno — todo corre local/mockeado"]
