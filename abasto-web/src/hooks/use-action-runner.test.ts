import { describe, expect, mock, test } from 'bun:test'
import { messageOf, runAction } from '#/hooks/use-action-runner'
import { ClientError, genericErrorMessage } from '#/lib/boundary'

function effects() {
  return {
    invalidate: mock(async () => undefined),
    notifySuccess: mock((_message: string) => undefined),
    notifyError: mock((_message: string) => undefined),
  }
}

describe('runAction', () => {
  test('success: refreshes lists, toasts, then calls onSuccess with the data', async () => {
    const fx = effects()
    const onSuccess = mock((_data: number) => undefined)
    const result = await runAction(
      async () => ({ ok: true as const, data: 7 }),
      { success: 'Guardado.', onSuccess },
      fx,
    )
    expect(result).toEqual({ data: 7 })
    expect(fx.invalidate).toHaveBeenCalledTimes(1)
    expect(fx.notifySuccess).toHaveBeenCalledWith('Guardado.')
    expect(onSuccess).toHaveBeenCalledWith(7)
    expect(fx.notifyError).not.toHaveBeenCalled()
  })

  test('no success message: no toast', async () => {
    const fx = effects()
    await runAction(async () => ({ ok: true as const, data: 1 }), {}, fx)
    expect(fx.notifySuccess).not.toHaveBeenCalled()
  })

  test('failure: shows the server message, skips onSuccess, still refreshes', async () => {
    const fx = effects()
    const onSuccess = mock(() => undefined)
    const result = await runAction(
      async () => ({
        ok: false as const,
        code: 'invalid' as const,
        message: 'Escribe un nombre.',
      }),
      { success: 'Guardado.', onSuccess },
      fx,
    )
    expect(result).toBeUndefined()
    expect(fx.notifyError).toHaveBeenCalledWith('Escribe un nombre.')
    expect(fx.notifySuccess).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(fx.invalidate).toHaveBeenCalledTimes(1)
  })

  test('a thrown network error falls back to the generic message', async () => {
    const fx = effects()
    await runAction(
      async () => {
        throw new Error('boom')
      },
      {},
      fx,
    )
    expect(fx.notifyError).toHaveBeenCalledWith(genericErrorMessage)
  })
})

describe('messageOf', () => {
  test('reads ClientError messages only', () => {
    expect(messageOf(new ClientError('invalid', 'Hola'))).toBe('Hola')
    expect(messageOf(new Error('x'))).toBe(genericErrorMessage)
  })
})
