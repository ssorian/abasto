import { describe, expect, test } from 'bun:test'
import { escapeClosesOpenList } from '#/lib/open-list-escape'

const target = (match: boolean) => ({
  closest: (selector: string) =>
    match && selector === '[role="combobox"][aria-expanded="true"]' ? {} : null,
})

describe('escapeClosesOpenList', () => {
  test('Esc inside an open combobox only closes its list', () => {
    expect(escapeClosesOpenList(target(true))).toBe(true)
  })

  test('Esc anywhere else closes the dialog', () => {
    expect(escapeClosesOpenList(target(false))).toBe(false)
    expect(escapeClosesOpenList(null)).toBe(false)
    expect(escapeClosesOpenList({})).toBe(false)
  })
})
