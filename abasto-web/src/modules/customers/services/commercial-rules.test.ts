import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { createCustomer } from '#/modules/customers/services/customers'
import {
  listCommercialRules,
  resolveCustomerPrice,
  saveCommercialRules,
} from '#/modules/customers/services/commercial-rules'
import {
  createPresentations,
  customerCounts,
  errorOf,
  setupActors,
} from '#/modules/customers/services/testing'

beforeEach(() => resetDatabase(db))

const forbidden = 'No tienes permiso para esta acción.'
const rulesInvalid = 'Revisa las condiciones comerciales.'
const discountRange = 'El descuento debe estar entre 0 y 100 %.'

async function setup() {
  const { owner, staff } = await setupActors()
  const customer = await createCustomer(owner, { name: 'Norte' })
  const { piece, box } = await createPresentations(owner)
  return { owner, staff, customer, piece, box }
}

describe('saveCommercialRules', () => {
  test('saves the full set, returns it ordered, and staff can read it', async () => {
    const { owner, staff, customer, piece, box } = await setup()
    const saved = await saveCommercialRules(owner, customer.id, [
      { presentationId: box, minQuantity: 10, discountBps: 1500 },
      { presentationId: piece, minQuantity: 5, priceCents: 900 },
      { presentationId: box, minQuantity: 2, discountBps: 500 },
    ])
    const shape = (
      rows: Array<{
        presentationId: string
        minQuantity: number
        discountBps: number | null
        priceCents: number | null
      }>,
    ) =>
      rows
        .map((r) =>
          [r.presentationId, r.minQuantity, r.discountBps, r.priceCents].join(
            '|',
          ),
        )
        .sort()
    expect(shape(saved)).toEqual(
      [
        [piece, 5, null, 900],
        [box, 2, 500, null],
        [box, 10, 1500, null],
      ]
        .map((r) => r.join('|'))
        .sort(),
    )
    expect(await listCommercialRules(staff, customer.id)).toEqual(saved)
  })

  test('replaces the previous set; an empty set clears the rules', async () => {
    const { owner, customer, piece } = await setup()
    await saveCommercialRules(owner, customer.id, [
      { presentationId: piece, minQuantity: 1, discountBps: 100 },
      { presentationId: piece, minQuantity: 5, discountBps: 200 },
    ])
    const replaced = await saveCommercialRules(owner, customer.id, [
      { presentationId: piece, minQuantity: 3, priceCents: 800 },
    ])
    expect(replaced).toHaveLength(1)
    expect(await listCommercialRules(owner, customer.id)).toEqual(replaced)
    expect(await saveCommercialRules(owner, customer.id, [])).toEqual([])
    expect((await customerCounts()).rules).toBe(0)
  })

  const bad = (presentationId: string) =>
    [
      ['minQuantity 0', { presentationId, minQuantity: 0, discountBps: 100 }],
      [
        'fractional minQuantity',
        { presentationId, minQuantity: 1.5, discountBps: 100 },
      ],
      ['discount 0', { presentationId, minQuantity: 1, discountBps: 0 }],
      [
        'fractional discount',
        { presentationId, minQuantity: 1, discountBps: 10.5 },
      ],
      ['price 0', { presentationId, minQuantity: 1, priceCents: 0 }],
      ['fractional price', { presentationId, minQuantity: 1, priceCents: 9.5 }],
      [
        'price above int4',
        { presentationId, minQuantity: 1, priceCents: 2147483648 },
      ],
      ['neither discount nor price', { presentationId, minQuantity: 1 }],
      [
        'both discount and price',
        { presentationId, minQuantity: 1, discountBps: 100, priceCents: 900 },
      ],
    ] as const

  test('a discount outside 0-100 % says so and keeps the stored set', async () => {
    const { owner, customer, piece } = await setup()
    const before = await saveCommercialRules(owner, customer.id, [
      { presentationId: piece, minQuantity: 2, discountBps: 300 },
    ])
    for (const discountBps of [15000, 10001, -1]) {
      const error = await errorOf(() =>
        saveCommercialRules(owner, customer.id, [
          { presentationId: piece, minQuantity: 9, discountBps },
        ]),
      )
      expect([discountBps, error.code, error.message]).toEqual([
        discountBps,
        'invalid',
        discountRange,
      ])
    }
    expect(await listCommercialRules(owner, customer.id)).toEqual(before)
  })

  test('rejects each invalid rule and keeps the stored set', async () => {
    const { owner, customer, piece } = await setup()
    const before = await saveCommercialRules(owner, customer.id, [
      { presentationId: piece, minQuantity: 2, discountBps: 300 },
    ])
    for (const [name, rule] of bad(piece)) {
      const error = await errorOf(() =>
        saveCommercialRules(owner, customer.id, [
          { presentationId: piece, minQuantity: 9, discountBps: 900 },
          rule,
        ]),
      )
      expect([name, error.code, error.message]).toEqual([
        name,
        'invalid',
        rulesInvalid,
      ])
    }
    expect(await listCommercialRules(owner, customer.id)).toEqual(before)
  })

  test('rejects a duplicate (presentation, minQuantity) but allows it across presentations', async () => {
    const { owner, customer, piece, box } = await setup()
    const error = await errorOf(() =>
      saveCommercialRules(owner, customer.id, [
        { presentationId: piece, minQuantity: 5, discountBps: 100 },
        { presentationId: piece, minQuantity: 5, priceCents: 900 },
      ]),
    )
    expect(error.code).toBe('invalid')
    expect(error.message).toBe('No repitas producto y cantidad mínima.')
    expect((await customerCounts()).rules).toBe(0)
    const ok = await saveCommercialRules(owner, customer.id, [
      { presentationId: piece, minQuantity: 5, discountBps: 100 },
      { presentationId: box, minQuantity: 5, discountBps: 100 },
    ])
    expect(ok).toHaveLength(2)
  })

  test('unknown presentation or customer is not found and saves nothing', async () => {
    const { owner, customer, piece } = await setup()
    const missingPresentation = await errorOf(() =>
      saveCommercialRules(owner, customer.id, [
        { presentationId: piece, minQuantity: 1, discountBps: 100 },
        {
          presentationId: crypto.randomUUID(),
          minQuantity: 1,
          discountBps: 100,
        },
      ]),
    )
    expect(missingPresentation.code).toBe('not_found')
    expect(missingPresentation.message).toBe('No encontramos esa presentación.')
    const missingCustomer = await errorOf(() =>
      saveCommercialRules(owner, crypto.randomUUID(), []),
    )
    expect(missingCustomer.code).toBe('not_found')
    expect(missingCustomer.message).toBe('No encontramos ese cliente.')
    expect((await customerCounts()).rules).toBe(0)
  })

  test('staff cannot save and the stored set is unchanged', async () => {
    const { owner, staff, customer, piece } = await setup()
    const before = await saveCommercialRules(owner, customer.id, [
      { presentationId: piece, minQuantity: 2, discountBps: 300 },
    ])
    const error = await errorOf(() =>
      saveCommercialRules(staff, customer.id, []),
    )
    expect(error.code).toBe('forbidden')
    expect(error.message).toBe(forbidden)
    expect(await listCommercialRules(owner, customer.id)).toEqual(before)
  })
})

describe('resolveCustomerPrice', () => {
  const resolve = (
    customerId: string,
    presentationId: string,
    quantity: number,
    listPriceCents = 1000,
  ) =>
    resolveCustomerPrice({
      customerId,
      presentationId,
      quantity,
      listPriceCents,
    })

  async function withTiers() {
    const ctx = await setup()
    await saveCommercialRules(ctx.owner, ctx.customer.id, [
      { presentationId: ctx.piece, minQuantity: 5, discountBps: 1000 },
      { presentationId: ctx.piece, minQuantity: 20, discountBps: 2000 },
      { presentationId: ctx.piece, minQuantity: 50, priceCents: 700 },
    ])
    return ctx
  }

  test('no rule for the presentation returns the list price', async () => {
    const { customer, box } = await withTiers()
    expect(await resolve(customer.id, box, 100)).toEqual({
      unitPriceCents: 1000,
      listPriceCents: 1000,
      rule: null,
    })
  })

  test('below the lowest minimum returns the list price', async () => {
    const { customer, piece } = await withTiers()
    expect((await resolve(customer.id, piece, 4)).rule).toBeNull()
    expect((await resolve(customer.id, piece, 4)).unitPriceCents).toBe(1000)
  })

  test('the exact minimum applies the rule', async () => {
    const { customer, piece } = await withTiers()
    const result = await resolve(customer.id, piece, 5)
    expect(result.unitPriceCents).toBe(900)
    expect(result.rule).toMatchObject({ minQuantity: 5, discountBps: 1000 })
  })

  test('with several tiers the highest minQuantity not above the quantity wins', async () => {
    const { customer, piece } = await withTiers()
    expect((await resolve(customer.id, piece, 19)).unitPriceCents).toBe(900)
    expect((await resolve(customer.id, piece, 20)).unitPriceCents).toBe(800)
    expect((await resolve(customer.id, piece, 49)).unitPriceCents).toBe(800)
  })

  test('a fixed price replaces the list price, even if higher', async () => {
    const { customer, piece } = await withTiers()
    const result = await resolve(customer.id, piece, 50)
    expect(result.unitPriceCents).toBe(700)
    expect(result.rule).toMatchObject({ minQuantity: 50, priceCents: 700 })
    expect((await resolve(customer.id, piece, 50, 500)).unitPriceCents).toBe(
      700,
    )
  })

  test('a discount rounds once to the nearest cent (half up)', async () => {
    const { owner, customer, piece } = await setup()
    await saveCommercialRules(owner, customer.id, [
      { presentationId: piece, minQuantity: 1, discountBps: 3333 },
    ])
    // 999 * 0.6667 = 666.0 ; 1001 * 0.6667 = 667.3 ; 1005 * 0.6667 = 670.0335
    expect((await resolve(customer.id, piece, 1, 999)).unitPriceCents).toBe(666)
    expect((await resolve(customer.id, piece, 1, 1001)).unitPriceCents).toBe(
      667,
    )
    await saveCommercialRules(owner, customer.id, [
      { presentationId: piece, minQuantity: 1, discountBps: 5000 },
    ])
    expect((await resolve(customer.id, piece, 1, 101)).unitPriceCents).toBe(51)
    expect((await resolve(customer.id, piece, 1, 1)).unitPriceCents).toBe(1)
  })

  test('a rule of another customer does not apply', async () => {
    const { owner, customer, piece } = await withTiers()
    const other = await createCustomer(owner, { name: 'Sur' })
    expect((await resolve(other.id, piece, 50)).rule).toBeNull()
    expect((await resolve(customer.id, piece, 50)).rule).not.toBeNull()
  })

  test('rejects an invalid quantity or list price, and an unknown customer', async () => {
    const { customer, piece } = await withTiers()
    for (const [quantity, listPriceCents] of [
      [0, 1000],
      [1.5, 1000],
      [1, 0],
      [1, 10.5],
    ]) {
      const error = await errorOf(() =>
        resolve(customer.id, piece, quantity, listPriceCents),
      )
      expect(error.code).toBe('invalid')
      expect(error.message).toBe('Revisa la cantidad y el precio de lista.')
    }
    const missing = await errorOf(() => resolve(crypto.randomUUID(), piece, 1))
    expect(missing.code).toBe('not_found')
    expect(missing.message).toBe('No encontramos ese cliente.')
  })
})
