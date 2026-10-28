import type { Hook, Register } from 'claude-code'

type Dollar = Parameters<Hook<'session.start'>>[0]

/** Carpeta de config de acsuite: ACSUITE_HOME si existe, si no ~/.acsuite. */
async function configDir($: Dollar): Promise<string> {
  const custom = await $.env.get('ACSUITE_HOME')
  if (custom) return custom
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME'))
  if (!home) throw new Error('no hay ACSUITE_HOME, USERPROFILE ni HOME')
  return `${home}/.acsuite`
}

/**
 * Guarda la raíz del proyecto de esta sesión (no la carpeta a la que un `cd` la haya movido) y la hora en `active-project.json`; el board sube a la raíz
 * del repo al agregarlo. Devuelve la ruta del archivo.
 */
async function mark($: Dollar): Promise<string> {
  const file = `${await configDir($)}/active-project.json`
  const path = await $.session.root()
  const at = new Date(await $.clock.now()).toISOString()
  await $.fs.write(file, JSON.stringify({ path, at }, null, 2))
  return file
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'board',
      description: 'Mark this project as the active one for the acsuite board',
    })
    return next(e)
  })

  on('command.run', { command: 'board' }, async $ => {
    try {
      return { text: `Project marked for the board (${await mark($)}).` }
    } catch (err) {
      return { text: `Could not mark the project: ${(err as Error).message}` }
    }
  })

  // La banda es una línea: el nombre a la izquierda y el botón a la derecha. Solo el nombre se corta si falta ancho; el botón nunca se encoge.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Las bandas de otros hooks se conservan; una encuesta se queda con la banda para ella.
    const below = await next(e)

    if (e.props.hasSurvey) return below

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Box>
          <Box flexGrow={1} flexShrink={1}>
            <Text wrap="truncate-end" bold dimColor>
              Active Project
            </Text>
          </Box>
          <Box flexShrink={0} marginLeft={2}>
            <Button
              key="mark"
              plain
              dimColor
              label="[ ● Mark ]"
              onPress={async () => {
                try {
                  await mark($)
                  $.ui.toast('Project marked for the board')
                } catch (err) {
                  $.ui.toast(`Could not mark the project: ${(err as Error).message}`)
                }
              }}
            />
          </Box>
        </Box>
        {below}
      </Box>
    )
  })
}
