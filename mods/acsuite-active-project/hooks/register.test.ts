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
  expect(result.text).toMatch(/marcado/)
})

test('/board avisa si no puede guardar', async ($, on) => {
  on('env.get', () => ({ value: '/cfg' }))
  on('session.root', () => ({ value: '/proyectos/uno' }))
  on('clock.now', () => ({ value: 0 }))
  on('fs.write', () => ({ deny: 'sin permiso' }))

  const result = await $.command.run(BOARD)

  expect(result.text).toMatch(/No se pudo marcar el proyecto.*sin permiso/)
})
