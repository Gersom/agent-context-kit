# Entidades

Modelo de datos o esquema de base de datos, para los casos en que vale la pena documentarlo aparte del código — por ejemplo, si no hay un ORM autodescriptivo, el esquema es complejo, o hay relaciones/invariantes que no se ven a simple vista mirando las tablas o modelos.

Este archivo es opcional: si el esquema ya es autoexplicativo desde el código (ej. un ORM con modelos claros y bien nombrados), no hace falta duplicarlo acá — un link al archivo de schema/migraciones alcanza.

---

<!--
Un bloque por entidad relevante, con este formato:

## [Nombre de la entidad]

- **Qué representa:** una línea de contexto de negocio, no solo el nombre técnico
- **Campos clave:** los que importan para entender el modelo, no un volcado completo del schema (eso ya está en el código/migraciones)
- **Relaciones:** con qué otras entidades se relaciona y de qué tipo (1:1, 1:N, N:M)
- **Invariantes/reglas no obvias:** algo que no se deduce mirando el schema (ej. "un usuario no puede tener más de un plan activo a la vez", "soft-delete vía `deleted_at`, nunca borrar filas")
- **Dónde está definida:** archivo de modelo/schema/migración correspondiente
-->

## [Placeholder — nombre de la entidad]

- **Qué representa:** [Placeholder]
- **Campos clave:** [Placeholder]
- **Relaciones:** [Placeholder]
- **Invariantes/reglas no obvias:** [Placeholder, o "Ninguna"]
- **Dónde está definida:** [Placeholder]
