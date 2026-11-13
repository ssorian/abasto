import { describe, expect, test } from 'bun:test'
import { minPasswordLength } from '#/lib/auth'
import {
  generateStorePassword,
  PASSWORD_ALPHABET,
} from '#/modules/customers/lib/store-password'

describe('generateStorePassword', () => {
  test('is readable, long enough and meets the app password rules', () => {
    for (let i = 0; i < 200; i++) {
      const password = generateStorePassword()
      expect(password.length).toBeGreaterThanOrEqual(10)
      expect(password.length).toBeGreaterThanOrEqual(minPasswordLength)
      expect(password).toMatch(/^[A-Za-z0-9]+$/)
      expect(password).not.toMatch(/[0O1lI]/)
    }
  })

  test('uses the whole alphabet without ambiguous characters', () => {
    expect(PASSWORD_ALPHABET).not.toMatch(/[0O1lI]/)
    expect(new Set(PASSWORD_ALPHABET).size).toBe(PASSWORD_ALPHABET.length)
  })

  test('maps random bytes without modulo bias and yields different passwords', () => {
    const seen = new Set(
      Array.from({ length: 20 }, () => generateStorePassword()),
    )
    expect(seen.size).toBe(20)
    // Bytes above the largest multiple of the alphabet size are discarded.
    const limit = 256 - (256 % PASSWORD_ALPHABET.length)
    const bytes = [255, 254, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    let cursor = 0
    const password = generateStorePassword(12, (target) => {
      for (let i = 0; i < target.length; i++) target[i] = bytes[cursor++ % 14]
      return target
    })
    expect(password.length).toBe(12)
    expect(limit).toBeLessThanOrEqual(256)
    expect(password).toBe(
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        .map((i) => PASSWORD_ALPHABET[i])
        .join(''),
    )
  })
})
