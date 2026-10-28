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
 * Guarda el directorio de esta sesión y la hora en `active-project.json`; el board sube a la raíz
 * del repo al agregarlo. Devuelve la ruta del archivo.
 */
async function mark($: Dollar): Promise<string> {
  const file = `${await configDir($)}/active-project.json`
  const path = await $.session.cwd()
  const at = new Date(await $.clock.now()).toISOString()
  await $.fs.write(file, JSON.stringify({ path, at }, null, 2))
  return file
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'board',
      description: 'Marca este proyecto como el activo para el board de acsuite',
    })
    return next(e)
  })

  on('command.run', { command: 'board' }, async $ => {
    try {
      return { text: `Proyecto marcado para el board (${await mark($)}).` }
    } catch (err) {
      return { text: `No se pudo marcar el proyecto: ${(err as Error).message}` }
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text dimColor>acsuite board: </Text>
        <Button
          key="mark"
          label="Marcar este proyecto"
          onPress={async () => {
            try {
              await mark($)
              $.ui.toast('Proyecto marcado para el board')
            } catch (err) {
              $.ui.toast(`No se pudo marcar el proyecto: ${(err as Error).message}`)
            }
          }}
        />
      </Box>
    )
  })
}
