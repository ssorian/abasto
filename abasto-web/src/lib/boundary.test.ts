import { describe, expect, mock, spyOn, test } from 'bun:test'
import { z } from 'zod'
import {
  ClientError,
  emailSchema,
  genericErrorMessage,
  parseInput,
  runBoundary,
  unwrap,
} from '#/lib/boundary'
import { AppError } from '#/lib/errors'

describe('runBoundary', () => {
  test('wraps a returned value', async () => {
    expect(await runBoundary(async () => 42)).toEqual({ ok: true, data: 42 })
  })

  test('exposes an AppError code and message', async () => {
    const result = await runBoundary(async () => {
      throw new AppError('conflict', 'Ya existe un almacén con ese nombre.')
    })
    expect(result).toEqual({
      ok: false,
      code: 'conflict',
      message: 'Ya existe un almacén con ese nombre.',
    })
  })

  test('masks unexpected errors and logs them', async () => {
    const spy = spyOn(console, 'error').mockImplementation(mock())
    const result = await runBoundary(async () => {
      throw new Error('connection refused at 10.0.0.5')
    })
    expect(result).toEqual({
      ok: false,
      code: 'unexpected',
      message: genericErrorMessage,
    })
    expect(genericErrorMessage).toBe('Ocurrió un error. Intenta de nuevo.')
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })
})

describe('parseInput', () => {
  const schema = z.object({ email: emailSchema, name: z.string().min(1) })

  test('returns parsed data', () => {
    expect(parseInput(schema, { email: 'a@b.co', name: 'x' })).toEqual({
      email: 'a@b.co',
      name: 'x',
    })
  })

  test('rejects a bad email with a Spanish AppError', () => {
    try {
      parseInput(schema, { email: 'no-es-correo', name: 'x' })
      throw new Error('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('invalid')
      expect((error as AppError).message).toBe('Escribe un correo válido.')
    }
  })

  test('missing fields give a generic Spanish message, not zod internals', () => {
    try {
      parseInput(z.object({ name: z.string() }), {})
      throw new Error('should have thrown')
    } catch (error) {
      expect((error as AppError).message).toBe(
        'Revisa los datos e intenta de nuevo.',
      )
    }
  })
})

describe('unwrap', () => {
  test('returns data on success', () => {
    expect(unwrap({ ok: true, data: 'x' })).toBe('x')
  })

  test('throws a ClientError carrying code and message', () => {
    try {
      unwrap({
        ok: false,
        code: 'forbidden',
        message: 'No tienes permiso para esta acción.',
      })
      throw new Error('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ClientError)
      expect((error as ClientError).code).toBe('forbidden')
      expect((error as ClientError).message).toBe(
        'No tienes permiso para esta acción.',
      )
    }
  })
})
