import { expect, test } from 'bun:test'
import { safeRedirect } from '#/modules/access/lib/redirect'

test('keeps internal paths, rejects everything else', () => {
  expect(safeRedirect('/almacenes')).toBe('/almacenes')
  expect(safeRedirect('/catalogo?x=1')).toBe('/catalogo?x=1')
  expect(safeRedirect('//evil.com')).toBe('/')
  expect(safeRedirect('https://evil.com')).toBe('/')
  expect(safeRedirect('/\\evil.com')).toBe('/')
  expect(safeRedirect('/login')).toBe('/')
  expect(safeRedirect(undefined)).toBe('/')
})
