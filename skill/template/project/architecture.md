# Arquitectura

Mapa del código: qué hay en cada parte, las convenciones de organización que **no se deducen mirando las carpetas** y por qué están así. No incluye el stack ([`./stack.md`](./stack.md)) ni el modelo de datos ([`./entities.md`](./entities.md), si aplica).

---

## Estructura

<!-- Árbol anotado de los niveles superiores (2-3 niveles), una línea de propósito por entrada y solo lo que el nombre no dice; omitir lo trivial (dependencias instaladas, salidas de build). Sirve para orientarse sin explorar el código: mantenerlo al día cuando cambie la estructura (Regla 4: si hay conflicto, gana el código). -->

```
[Placeholder — ej.
raíz/
├── src/        # propósito
│   └── ...
└── ...
]
```

## Convenciones de organización

<!-- Solo lo que un agente no puede inferir de la estructura: ¿se organiza por feature/dominio o por capa técnica? ¿monorepo con paquetes independientes? ¿hay reglas de dependencia (ej. "cada feature es autocontenida y no importa de otra directamente")? Si la estructura es autoexplicativa, decir eso. -->

[Placeholder, o "La organización es la convencional del stack — no hace falta documentar nada más"]

## Dónde va cada cosa nueva

<!-- Guía corta para ubicar código nuevo cuando no es evidente (ej. "un nuevo endpoint va en X", "un componente de UI compartido va en Y"). Omitir si la estructura ya es autoexplicativa. -->

[Placeholder, o "Autoexplicativo — no hace falta una guía aparte"]
