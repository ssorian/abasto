import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { createProduct } from '#/modules/catalog/services/products'
import { createPurchase } from '#/modules/inventory/services/purchases'
import {
  getProductMargin,
  setProductMargin,
} from '#/modules/pricing/services/margins'
import {
  applySuggestedPrices,
  suggestPurchasePrices,
} from '#/modules/pricing/services/price-suggestions'
import { setPrices } from '#/modules/pricing/services/prices'
import {
  getPriceHistory,
  listWarehousePrices,
} from '#/modules/pricing/services/price-reads'
import {
  errorOf,
  pricingState,
  setupPricing,
} from '#/modules/pricing/services/testing'
import type { PricingFixture } from '#/modules/pricing/services/testing'

beforeEach(() => resetDatabase(db))

const forbidden = 'No tienes permiso para esta acción.'

const purchase = (fx: PricingFixture, warehouseId = fx.a.id) =>
  createPurchase(fx.owner, {
    supplierId: fx.supplier.id,
    warehouseId,
    purchasedOn: '2026-11-01',
    lines: [
      { productId: fx.milkBox.id, quantity: 24, totalCostCents: 39200 },
      { productId: fx.cola.id, quantity: 7, totalCostCents: 1000 },
    ],
  })

describe('product margin', () => {
  test('the owner sets it and anyone signed in reads it; unset reads as zero', async () => {
    const fx = await setupPricing()
    expect(await getProductMargin(fx.clerkA, fx.milkBox.id)).toBe(0)
    await setProductMargin(fx.owner, {
      productId: fx.milkBox.id,
      marginBps: 1200,
    })
    await setProductMargin(fx.owner, {
      productId: fx.milkBox.id,
      marginBps: 1500,
    })
    expect(await getProductMargin(fx.clerkA, fx.milkBox.id)).toBe(1500)
  })

  test('only the owner sets it', async () => {
    const fx = await setupPricing()
    const error = await errorOf(() =>
      setProductMargin(fx.managerA, {
        productId: fx.milkBox.id,
        marginBps: 1200,
      }),
    )
    expect([error.code, error.message]).toEqual(['forbidden', forbidden])
    expect(await getProductMargin(fx.owner, fx.milkBox.id)).toBe(0)
  })

  const invalidCases: Array<[string, number, string, string]> = [
    ['a negative margin', -1, 'invalid', 'El margen debe ser cero o mayor.'],
    [
      'a fractional margin',
      12.5,
      'invalid',
      'El margen debe ser cero o mayor.',
    ],
  ]
  for (const [name, marginBps, code, message] of invalidCases) {
    test(`rejects ${name}`, async () => {
      const fx = await setupPricing()
      const error = await errorOf(() =>
        setProductMargin(fx.owner, { productId: fx.milkBox.id, marginBps }),
      )
      expect([error.code, error.message]).toEqual([code, message])
    })
  }

  test('rejects an unknown product', async () => {
    const fx = await setupPricing()
    const error = await errorOf(() =>
      setProductMargin(fx.owner, {
        productId: '00000000-0000-4000-8000-000000000000',
        marginBps: 100,
      }),
    )
    expect([error.code, error.message]).toEqual([
      'not_found',
      'No encontramos ese producto.',
    ])
  })
})

describe('suggestPurchasePrices', () => {
  test('uses the lot unit cost without intermediate rounding', async () => {
    const fx = await setupPricing()
    await setProductMargin(fx.owner, {
      productId: fx.milkBox.id,
      marginBps: 1200,
    })
    const { id } = await purchase(fx)
    const suggestions = await suggestPurchasePrices(fx.managerA, id)
    // 39200 / 24 units × factor 1 × 1.12 = 1829.33… → 1829
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      productId: fx.milkBox.id,
      presentationId: fx.piece(fx.milkBox).id,
      marginBps: 1200,
      currentPriceCents: null,
      suggestedPriceCents: 1829,
    })
  })

  test('multiplies by the default presentation factor (cost 39200 / 24 units, factor 24, 12% → 43904)', async () => {
    const fx = await setupPricing()
    // Water is sold by the box (factor 12).
    await setProductMargin(fx.owner, {
      productId: fx.water.id,
      marginBps: 1200,
    })
    const { id } = await createPurchase(fx.owner, {
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      purchasedOn: '2026-11-01',
      lines: [{ productId: fx.water.id, quantity: 24, totalCostCents: 39200 }],
    })
    const [suggestion] = await suggestPurchasePrices(fx.owner, id)
    // 39200 × 12 / 24 × 1.12 = 21952
    expect(suggestion.suggestedPriceCents).toBe(21952)
    expect(suggestion.presentationId).toBe(fx.box(fx.water).id)
  })

  test('factor 24 and margin 1200 bps over 39200 cents for 24 units gives 43904', async () => {
    const fx = await setupPricing()
    const crate = await createProduct(fx.owner, {
      name: 'Jugo 200ml',
      sku: 'JUG-1',
      category: 'Jugos',
      unit: 'piezas',
      presentations: [
        { name: 'Pieza', factor: 1 },
        { name: 'Caja', factor: 24 },
      ],
      defaultIndex: 1,
    })
    await setProductMargin(fx.owner, { productId: crate.id, marginBps: 1200 })
    const { id } = await createPurchase(fx.owner, {
      supplierId: fx.supplier.id,
      warehouseId: fx.a.id,
      purchasedOn: '2026-11-01',
      lines: [{ productId: crate.id, quantity: 24, totalCostCents: 39200 }],
    })
    const [suggestion] = await suggestPurchasePrices(fx.owner, id)
    expect(suggestion.suggestedPriceCents).toBe(43904)
  })

  test('returns the current price of the default presentation in the purchase warehouse', async () => {
    const fx = await setupPricing()
    await setProductMargin(fx.owner, {
      productId: fx.milkBox.id,
      marginBps: 1000,
    })
    await setPrices(fx.owner, {
      warehouseId: fx.a.id,
      prices: [{ presentationId: fx.piece(fx.milkBox).id, priceCents: 1700 }],
    })
    await setPrices(fx.owner, {
      warehouseId: fx.b.id,
      prices: [{ presentationId: fx.piece(fx.milkBox).id, priceCents: 999 }],
    })
    const { id } = await purchase(fx)
    const [suggestion] = await suggestPurchasePrices(fx.owner, id)
    expect(suggestion.currentPriceCents).toBe(1700)
  })

  test('skips products without a target margin', async () => {
    const fx = await setupPricing()
    const { id } = await purchase(fx)
    expect(await suggestPurchasePrices(fx.owner, id)).toEqual([])
  })

  test('a clerk reads the suggestion; a manager of another warehouse cannot', async () => {
    const fx = await setupPricing()
    await setProductMargin(fx.owner, {
      productId: fx.milkBox.id,
      marginBps: 1200,
    })
    const { id } = await purchase(fx)
    expect(await suggestPurchasePrices(fx.clerkA, id)).toHaveLength(1)
    const error = await errorOf(() => suggestPurchasePrices(fx.managerB, id))
    expect([error.code, error.message]).toEqual(['forbidden', forbidden])
  })

  test('rejects an unknown purchase', async () => {
    const fx = await setupPricing()
    const error = await errorOf(() =>
      suggestPurchasePrices(fx.owner, '00000000-0000-4000-8000-000000000000'),
    )
    expect([error.code, error.message]).toEqual([
      'not_found',
      'No encontramos esa compra.',
    ])
  })
})

describe('applySuggestedPrices', () => {
  test('records the chosen prices in the receiving warehouse as purchase-suggestion', async () => {
    const fx = await setupPricing()
    await setProductMargin(fx.owner, {
      productId: fx.milkBox.id,
      marginBps: 1200,
    })
    const { id } = await purchase(fx)
    const [suggestion] = await suggestPurchasePrices(fx.owner, id)
    await applySuggestedPrices(fx.managerA, {
      purchaseId: id,
      prices: [
        {
          presentationId: suggestion.presentationId,
          priceCents: suggestion.suggestedPriceCents,
        },
      ],
    })
    const row = (await listWarehousePrices(fx.owner, fx.a.id)).find(
      (item) => item.presentationId === suggestion.presentationId,
    )
    expect(row).toMatchObject({ priceCents: 1829, origin: 'own' })
    const [latest] = await getPriceHistory(fx.owner, {
      warehouseId: fx.a.id,
      presentationId: suggestion.presentationId,
    })
    expect(latest.source).toBe('purchase-suggestion')
    expect(
      (await listWarehousePrices(fx.owner, fx.b.id)).every(
        (item) => item.priceCents === null,
      ),
    ).toBe(true)
  })

  test('a clerk cannot apply; a manager of another warehouse cannot', async () => {
    const fx = await setupPricing()
    const { id } = await purchase(fx)
    const prices = [
      { presentationId: fx.piece(fx.milkBox).id, priceCents: 1800 },
    ]
    const before = await pricingState(fx)
    for (const actor of [fx.clerkA, fx.managerB]) {
      const error = await errorOf(() =>
        applySuggestedPrices(actor, { purchaseId: id, prices }),
      )
      expect([error.code, error.message]).toEqual(['forbidden', forbidden])
    }
    expect(await pricingState(fx)).toEqual(before)
  })

  const invalidCases: Array<
    [
      string,
      (
        fx: PricingFixture,
      ) => Array<{ presentationId: string; priceCents: number }>,
      string,
      string,
    ]
  > = [
    [
      'a presentation from another product',
      (fx) => [
        { presentationId: fx.piece(fx.milkBox).id, priceCents: 1800 },
        { presentationId: fx.piece(fx.water).id, priceCents: 1800 },
      ],
      'invalid',
      'Esa presentación no es de esta compra.',
    ],
    [
      'a zero price',
      (fx) => [{ presentationId: fx.piece(fx.milkBox).id, priceCents: 0 }],
      'invalid',
      'El precio debe ser mayor que cero.',
    ],
  ]
  for (const [name, prices, code, message] of invalidCases) {
    test(`rejects ${name} and changes nothing`, async () => {
      const fx = await setupPricing()
      const { id } = await purchase(fx)
      const before = await pricingState(fx)
      const error = await errorOf(() =>
        applySuggestedPrices(fx.owner, { purchaseId: id, prices: prices(fx) }),
      )
      expect([error.code, error.message]).toEqual([code, message])
      expect(await pricingState(fx)).toEqual(before)
    })
  }

  test('rejects an unknown purchase', async () => {
    const fx = await setupPricing()
    const error = await errorOf(() =>
      applySuggestedPrices(fx.owner, {
        purchaseId: '00000000-0000-4000-8000-000000000000',
        prices: [{ presentationId: fx.piece(fx.milkBox).id, priceCents: 100 }],
      }),
    )
    expect(error.code).toBe('not_found')
  })
})
