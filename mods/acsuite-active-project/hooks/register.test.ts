import { expect, test } from 'claude-code/testing'

const BOARD = {
  command: 'board',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
} as const

test('/board guarda el directorio de la sesión y la hora', async ($, on) => {
  const writes: { path: string; text: string }[] = []
  on('env.get', (_, e) => ({ value: e.name === 'ACSUITE_HOME' ? '/cfg' : undefined }))
  on('session.root', () => ({ value: '/proyectos/uno' }))
  on('clock.now', () => ({ value: Date.UTC(2026, 9, 28, 1, 2, 3) }))
  on('fs.write', (_, e) => {
    writes.push({ path: e.path, text: e.text })
    return { value: undefined }
  })

  const result = await $.command.run(BOARD)

  expect(writes).toHaveLength(1)
  expect(writes[0]?.path.replaceAll('\\', '/').endsWith('/cfg/active-project.json')).toBe(true)
  expect(JSON.parse(writes[0]?.text ?? '')).toEqual({
    path: '/proyectos/uno',
    at: '2026-10-28T01:02:03.000Z',
  })
  expect(result.text).toMatch(/^Project marked for the board \(.*active-project\.json\)\.$/)
})

test('/board avisa si no puede guardar', async ($, on) => {
  on('env.get', () => ({ value: '/cfg' }))
  on('session.root', () => ({ value: '/proyectos/uno' }))
  on('clock.now', () => ({ value: 0 }))
  on('fs.write', () => ({ deny: 'sin permiso' }))

  const result = await $.command.run(BOARD)

  expect(result.text).toMatch(/Could not mark the project.*sin permiso/)
})

const BAND = {
  component: 'AbovePrompt',
  requestId: 'band',
} as const

/** La banda montada, con el ancho y la superficie pedidos. */
const band = ($: any, bodyColumns = 80, surface: 'terminal' | 'desktop' = 'terminal', hasSurvey = false) =>
  $.ui.mount({
    plugin: 'acsuite-active-project',
    surface,
    ...BAND,
    props: { hasSurvey, isWorking: false, maxRows: 10, bodyColumns } as never,
  })

/** Lo que dibuja el motor debajo de la banda del mod. */
const engineBand = { type: 'Box' as const, props: {}, children: [] }

// Otro plugin que dibuja en la banda por debajo de esta.
const other = {
  name: 'other-band',
  tier: 'append' as const,
  register: (on: any) => {
    on('ui.render', { component: 'AbovePrompt' }, () => ({
      type: 'Box',
      props: {},
      children: [{ type: 'Text', props: {}, children: ['OTHER BAND'] }],
    }))
  },
}

test('la banda es una línea: el nombre y el botón Mark, en terminal y en escritorio', async ($, on) => {
  on('ui.render', () => engineBand)

  for (const surface of ['terminal', 'desktop'] as const) {
    for (const bodyColumns of [30, 80]) {
      const ui = await band($, bodyColumns, surface)

      const texts = (await ui.findAll({ type: 'Text' })).map((node: { text: string }) => node.text)
      expect(texts).toEqual(['Active Project'])

      const name = await ui.find({ type: 'Text', text: /^Active Project$/ })
      expect(name?.props).toMatchObject({ bold: true, dimColor: true, wrap: 'truncate-end' })

      const buttons = await ui.findAll({ type: 'Button' })
      expect(buttons).toHaveLength(1)
      expect(await ui.find({ type: 'Button', key: 'mark', text: /^\[ ● Mark \]$/ })).toBeDefined()
      expect(await ui.find({ type: 'Button', text: /Hide/ })).toBeUndefined()
      await ui.unmount()
    }
  }
})

test('con una encuesta no dibuja la banda y deja lo que dibujan otros', async ($, on) => {
  on('ui.render', () => engineBand)

  const ui = await band($, 80, 'terminal', true)

  expect(await ui.find({ type: 'Text', text: /Active Project/ })).toBeUndefined()
  expect(await ui.find({ type: 'Button', key: 'mark' })).toBeUndefined()
  await ui.unmount()
})

test('conserva lo que dibuja otra banda por debajo', { plugins: [other] }, async ($, on) => {
  on('ui.render', () => engineBand)

  const ui = await band($)

  expect(await ui.find({ type: 'Text', text: /OTHER BAND/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Active Project$/ })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'mark' })).toBeDefined()
  await ui.unmount()

  const survey = await band($, 80, 'terminal', true)

  expect(await survey.find({ type: 'Text', text: /OTHER BAND/ })).toBeDefined()
  expect(await survey.find({ type: 'Button', key: 'mark' })).toBeUndefined()
  await survey.unmount()
})

test('pulsar el botón guarda la raíz de la sesión y avisa con un toast', async ($, on) => {
  const writes: { path: string; text: string }[] = []
  const toasts: string[] = []
  on('ui.render', () => engineBand)
  on('env.get', (_, e) => ({ value: e.name === 'ACSUITE_HOME' ? '/cfg' : undefined }))
  on('session.root', () => ({ value: '/proyectos/uno' }))
  on('clock.now', () => ({ value: Date.UTC(2026, 9, 28, 1, 2, 3) }))
  on('fs.write', (_, e) => {
    writes.push({ path: e.path, text: e.text })
    return { value: undefined }
  })
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })

  const ui = await band($)
  await ui.press({ key: 'mark' })

  expect(writes).toHaveLength(1)
  expect(writes[0]?.path.replaceAll('\\', '/').endsWith('/cfg/active-project.json')).toBe(true)
  expect(JSON.parse(writes[0]?.text ?? '')).toEqual({
    path: '/proyectos/uno',
    at: '2026-10-28T01:02:03.000Z',
  })
  expect(toasts).toEqual(['Project marked for the board'])
  await ui.unmount()
})

test('si no puede guardar, el botón avisa con un toast', async ($, on) => {
  const toasts: string[] = []
  on('ui.render', () => engineBand)
  on('env.get', () => ({ value: '/cfg' }))
  on('session.root', () => ({ value: '/proyectos/uno' }))
  on('clock.now', () => ({ value: 0 }))
  on('fs.write', () => ({ deny: 'sin permiso' }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })

  const ui = await band($)
  await ui.press({ key: 'mark' })

  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toMatch(/^Could not mark the project: .*sin permiso/)
  await ui.unmount()
})

test('en ancho muy estrecho el botón sigue completo y el nombre es lo que se corta', async ($, on) => {
  on('ui.render', () => engineBand)

  const ui = await band($, 12)

  // El botón no se encoge: su texto sigue entero.
  expect(await ui.find({ type: 'Button', key: 'mark', text: /^\[ ● Mark \]$/ })).toBeDefined()

  // El nombre es el único con `truncate-end`; el motor de pruebas no dibuja el «…», así que se comprueba la propiedad.
  const name = await ui.find({ type: 'Text', text: /^Active Project$/ })
  expect(name?.props).toMatchObject({ wrap: 'truncate-end' })
  await ui.unmount()
})
