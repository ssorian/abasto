import { describe, expect, test } from 'bun:test'

import {
  addToCart,
  cartCount,
  clearCart,
  linesOf,
  parseCarts,
  removeFromCart,
  serializeCarts,
  setCartQuantity,
} from './cart'

const A = 'wh-a'
const B = 'wh-b'

describe('cart', () => {
  test('adds lines and merges the same presentation', () => {
    let carts = addToCart({}, A, 'p1', 2)
    carts = addToCart(carts, A, 'p1', 3)
    carts = addToCart(carts, A, 'p2', 1)
    expect(linesOf(carts, A)).toEqual([
      { presentationId: 'p1', quantity: 5 },
      { presentationId: 'p2', quantity: 1 },
    ])
    expect(cartCount(carts, A)).toBe(6)
  })

  test('keeps each warehouse cart separate', () => {
    let carts = addToCart({}, A, 'p1', 2)
    carts = addToCart(carts, B, 'p9', 4)
    expect(linesOf(carts, A)).toEqual([{ presentationId: 'p1', quantity: 2 }])
    expect(linesOf(carts, B)).toEqual([{ presentationId: 'p9', quantity: 4 }])
    expect(linesOf(carts, 'other')).toEqual([])
    expect(cartCount(carts, 'other')).toBe(0)
  })

  test('ignores invalid quantities and caps the maximum', () => {
    expect(addToCart({}, A, 'p1', 0)).toEqual({})
    expect(addToCart({}, A, 'p1', -2)).toEqual({})
    expect(addToCart({}, A, 'p1', 1.5)).toEqual({})
    expect(linesOf(addToCart({}, A, 'p1', 5000), A)[0].quantity).toBe(999)
    const merged = addToCart(addToCart({}, A, 'p1', 900), A, 'p1', 900)
    expect(linesOf(merged, A)[0].quantity).toBe(999)
  })

  test('setCartQuantity edits and removes at zero', () => {
    const carts = addToCart({}, A, 'p1', 2)
    expect(linesOf(setCartQuantity(carts, A, 'p1', 7), A)[0].quantity).toBe(7)
    expect(linesOf(setCartQuantity(carts, A, 'p1', 0), A)).toEqual([])
    expect(setCartQuantity(carts, A, 'missing', 3)).toEqual(carts)
  })

  test('removeFromCart and clearCart only touch their warehouse', () => {
    let carts = addToCart({}, A, 'p1', 2)
    carts = addToCart(carts, A, 'p2', 2)
    carts = addToCart(carts, B, 'p9', 1)
    expect(linesOf(removeFromCart(carts, A, 'p1'), A)).toEqual([
      { presentationId: 'p2', quantity: 2 },
    ])
    const cleared = clearCart(carts, A)
    expect(linesOf(cleared, A)).toEqual([])
    expect(linesOf(cleared, B)).toHaveLength(1)
  })

  test('does not mutate its input', () => {
    const carts = addToCart({}, A, 'p1', 1)
    const snapshot = JSON.stringify(carts)
    addToCart(carts, A, 'p1', 1)
    setCartQuantity(carts, A, 'p1', 5)
    clearCart(carts, A)
    expect(JSON.stringify(carts)).toBe(snapshot)
  })

  test('round-trips through storage and survives corrupt data', () => {
    const carts = addToCart(addToCart({}, A, 'p1', 2), B, 'p9', 1)
    expect(parseCarts(serializeCarts(carts))).toEqual(carts)
    expect(parseCarts(null)).toEqual({})
    expect(parseCarts('not json')).toEqual({})
    expect(parseCarts('[1,2]')).toEqual({})
    expect(
      parseCarts(
        JSON.stringify({
          [A]: [
            { presentationId: 'ok', quantity: 2 },
            { presentationId: 'bad', quantity: -1 },
            { presentationId: 3, quantity: 1 },
            'junk',
          ],
          [B]: 'nope',
        }),
      ),
    ).toEqual({ [A]: [{ presentationId: 'ok', quantity: 2 }] })
  })
})
