# acsuite-active-project

Mod de Claude Code para la suite [agent-context-suite](https://github.com/Gersom/agent-context-suite). Sirve para que el modo observador de `acsuite board` sepa en qué proyecto estás trabajando cuando tienes varias sesiones abiertas.

## Qué hace

Guarda la raíz del proyecto de la sesión (donde arrancó, no la carpeta a la que un `cd` la haya movido) y la hora en `active-project.json`, dentro de la carpeta de config de la suite (`ACSUITE_HOME` si está definida, si no `~/.acsuite`):

```json
{ "path": "D:\\personal\\mi-proyecto", "at": "2026-10-28T01:07:20.960Z" }
```

Se usa de dos formas, con el mismo resultado:

- **Botón** `[ ● Mark ]`, en una banda de una línea sobre el prompt: el nombre `Active Project` a la izquierda y el botón a la derecha. Si falta ancho, solo se corta el nombre; el botón no se encoge. Sigue el diseño de la banda de agent-radar, pero mínima: sin más botones. La banda cede su lugar a una encuesta y conserva las bandas de otros mods.
- **Comando** `/board`.

Los textos del mod (botón, avisos y respuesta del comando) están en inglés, sin cambio de idioma.

El mod no cambia nada más: no vigila pestañas ni escribe por su cuenta, solo guarda cuando lo pides. El board (cuando está en modo observador) lee el archivo, sube a la raíz del repo y abre ese proyecto.

## Instalar

Desde GitHub, en una sesión de terminal:

```
/plugin install acsuite-active-project --marketplace Gersom/agent-context-suite
```

En la app de escritorio: **+** junto al prompt, **Plugins**, **Add marketplace** con `Gersom/agent-context-suite` y luego **Add plugin**.

Para usar la carpeta de un clon de la suite, sin instalar, agrega su carpeta `mods` a `CLAUDE_CODE_PLUGIN_DIRS` en el bloque `env` de `~/.claude/settings.json` (varias rutas se separan con `;` en Windows y `:` en macOS y Linux). Solo lo ven las sesiones que se abran después del cambio.

## Desarrollo

Con la carpeta del mod como directorio de trabajo:

```
claude plugin validate .
claude plugin test .
```
