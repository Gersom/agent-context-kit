# asking-questions

Regla general para toda pregunta al operador mientras se aplica el skill, en [`../SKILL.md`](../SKILL.md) y en los flujos que enlaza. Se hace con la herramienta `AskUserQuestion` (recuadro con opciones seleccionables por clic o teclado), no como texto en el chat. Rige también para las preguntas abiertas.

1. **Con opciones:** de 2 a 4 por pregunta, la recomendada primero y marcada «(Recomendado)». La herramienta agrega sola «Otro», donde el operador escribe libre: no se escribe como opción.
2. **Abiertas:** la herramienta exige al menos 2 opciones, así que se ofrecen candidatos razonables (ej. el nombre que se detectó en `package.json` o en la carpeta); si no hay, dos genéricas («Lo escribo yo», «No aplica / omitir»). La respuesta va en «Otro». No mezclar texto y widget en una misma tanda.
3. **Tandas:** hasta 4 preguntas por llamada, mostradas juntas. Las que dependen de una respuesta anterior van en llamadas separadas.
4. **Respaldo:** solo si el cliente no tiene la herramienta, preguntar en texto con las mismas opciones numeradas.
