import { describe, expect, test } from 'bun:test'
import { activeFirst } from '#/modules/customers/lib/customer-sort'

describe('activeFirst', () => {
  test('inactive customers go after active ones, keeping the name order', () => {
    const sorted = activeFirst([
      { name: 'Ana', active: false },
      { name: 'Beto', active: true },
      { name: 'Caro', active: false },
      { name: 'Dani', active: true },
    ])
    expect(sorted.map(({ name }) => name)).toEqual([
      'Beto',
      'Dani',
      'Ana',
      'Caro',
    ])
  })

  test('does not mutate its input', () => {
    const input = [
      { name: 'A', active: false },
      { name: 'B', active: true },
    ]
    activeFirst(input)
    expect(input[0].name).toBe('A')
  })
})
