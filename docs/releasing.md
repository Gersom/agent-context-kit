# Versionado y releases

Cómo se versionan el kit y la skill. Se lee al publicar una versión; la decisión de fondo está en [`agents/rules.md`](./agents/rules.md) («Decisión no negociable»).

Versionado SemVer, con tags de git `vX.Y.Z` y releases manuales en GitHub, no por CI (los releases son poco frecuentes y son repos de documentación y herramientas chicas). Cada repo se versiona por separado:

- **El kit:** `package.json` (`version`) + tags en este repo. Versiona los scripts y la documentación del kit. Las versiones y tags `v1.x` que ya existen son anteriores a la separación y cubren también la skill, que entonces vivía acá.
- **La skill:** su propia versión y sus propios tags, en el repo [Gersom/agent-context-skill](https://github.com/Gersom/agent-context-skill); no se versiona desde el kit. La versión vive en `.claude-plugin/plugin.json`, en `SKILL.md` y en el marcador de la plantilla `template/agents/rules.md`; `scripts/skill-checks/version.test.ts` verifica que coincidan. Bump:
  - **patch** — fixes/ajustes de redacción en plantillas existentes.
  - **minor** — contenido nuevo que no rompe nada (nueva plantilla, nueva rama del árbol de preguntas).
  - **major** — cambios que rompen algo que un repo destino ya pudiera usar (mover/renombrar archivos de `template/` referenciados desde `questions-flow.md`, cambiar la estructura generada en `docs/agents`/`docs/project`).
