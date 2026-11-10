import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { products } from '#/modules/catalog/db/schema'
import type { Actor } from '#/modules/access/lib/policy'
import {
  createProduct,
  getProduct,
  savePieceCost,
  updateProduct,
} from '#/modules/catalog/services/products'
import {
  counts,
  errorOf,
  setupActors,
} from '#/modules/catalog/services/testing'

beforeEach(() => resetDatabase(db))

const base = {
  name: 'Leche entera 1L',
  sku: 'LEC-001',
  category: 'Lácteos',
  unit: 'piezas',
  presentations: [{ name: 'Pieza', factor: 1 }],
  defaultIndex: 0,
}
const badAmount =
  'Los montos del proveedor deben ser enteros en diezmilésimas, de cero o más.'
const aboveList =
  'El descuento y la promoción no pueden superar el costo por pieza.'
const empty = { suppliers: 0, products: 0, presentations: 0 }

describe('supplier terms on createProduct', () => {
  test('defaults to no code and zero list price, discount and promotion', async () => {
    const { owner } = await setupActors()
    const created = await createProduct(owner, base)
    expect(created).toMatchObject({
      supplierCode: '',
      listPricePerPiece: 0,
      fixedDiscountPerPiece: 0,
      promotionPerPiece: 0,
    })
  })

  test('stores a trimmed code and the amounts in ten-thousandths', async () => {
    const { owner, staff } = await setupActors()
    const created = await createProduct(owner, {
      ...base,
      supplierCode: '  ORA-77 ',
      listPricePerPiece: 123456,
      fixedDiscountPerPiece: 1000,
      promotionPerPiece: 11055,
    })
    expect(created).toMatchObject({
      supplierCode: 'ORA-77',
      listPricePerPiece: 123456,
      fixedDiscountPerPiece: 1000,
      promotionPerPiece: 11055,
    })
    expect(await getProduct(staff, created.id)).toEqual(created)
  })

  test.each([
    ['negative list price', { listPricePerPiece: -1 }],
    ['fractional list price', { listPricePerPiece: 0.5 }],
    ['infinite list price', { listPricePerPiece: Infinity }],
    ['list price above the column range', { listPricePerPiece: 2_147_483_648 }],
    ['negative discount', { fixedDiscountPerPiece: -1 }],
    ['fractional discount', { fixedDiscountPerPiece: 1.5 }],
    ['NaN promotion', { promotionPerPiece: Number.NaN }],
    ['unsafe promotion', { promotionPerPiece: 2 ** 53 }],
    ['above the column range', { fixedDiscountPerPiece: 2_147_483_648 }],
  ])('rejects %s', async (_case, amounts) => {
    const { owner } = await setupActors()
    const error = await errorOf(() =>
      createProduct(owner, { ...base, ...amounts }),
    )
    expect(error.code).toBe('invalid')
    expect(error.message).toBe(badAmount)
    expect(await counts()).toEqual(empty)
  })

  test('stores discount plus promotion equal to the list price', async () => {
    const { owner } = await setupActors()
    const created = await createProduct(owner, {
      ...base,
      listPricePerPiece: 1500,
      fixedDiscountPerPiece: 600,
      promotionPerPiece: 900,
    })
    expect(created).toMatchObject({
      listPricePerPiece: 1500,
      fixedDiscountPerPiece: 600,
      promotionPerPiece: 900,
    })
  })

  test.each([
    [
      'discount and promotion without a list price',
      { fixedDiscountPerPiece: 1 },
    ],
    [
      'discount plus promotion above the list price',
      {
        listPricePerPiece: 1500,
        fixedDiscountPerPiece: 600,
        promotionPerPiece: 901,
      },
    ],
  ])('rejects %s and stores nothing', async (_case, amounts) => {
    const { owner } = await setupActors()
    const error = await errorOf(() =>
      createProduct(owner, { ...base, ...amounts }),
    )
    expect(error.code).toBe('invalid')
    expect(error.message).toBe(aboveList)
    expect(await counts()).toEqual(empty)
  })

  test('staff cannot set supplier terms', async () => {
    const { staff } = await setupActors()
    const error = await errorOf(() =>
      createProduct(staff, { ...base, fixedDiscountPerPiece: 1000 }),
    )
    expect(error.code).toBe('forbidden')
    expect((await counts()).products).toBe(0)
  })
})

describe('supplier terms on updateProduct', () => {
  test('updates the amounts and keeps untouched fields', async () => {
    const { owner } = await setupActors()
    const product = await createProduct(owner, {
      ...base,
      supplierCode: 'A1',
      listPricePerPiece: 12000,
      fixedDiscountPerPiece: 5000,
    })
    const updated = await updateProduct(owner, product.id, {
      promotionPerPiece: 500,
    })
    expect(updated).toMatchObject({
      supplierCode: 'A1',
      listPricePerPiece: 12000,
      fixedDiscountPerPiece: 5000,
      promotionPerPiece: 500,
    })
    expect(await getProduct(owner, product.id)).toEqual(updated)
  })

  test('rejects an invalid amount and does not apply other fields', async () => {
    const { owner } = await setupActors()
    const product = await createProduct(owner, base)
    const error = await errorOf(() =>
      updateProduct(owner, product.id, { name: 'Otro', promotionPerPiece: -5 }),
    )
    expect(error.code).toBe('invalid')
    expect(error.message).toBe(badAmount)
    expect(await getProduct(owner, product.id)).toEqual(product)
  })

  test('the list price alone can be edited, and lowering it is checked against the stored discounts', async () => {
    const { owner } = await setupActors()
    const product = await createProduct(owner, {
      ...base,
      listPricePerPiece: 12000,
      fixedDiscountPerPiece: 5000,
      promotionPerPiece: 3000,
    })
    const raised = await updateProduct(owner, product.id, {
      listPricePerPiece: 15000,
    })
    expect(raised).toMatchObject({ listPricePerPiece: 15000 })
    const equal = await updateProduct(owner, product.id, {
      listPricePerPiece: 8000,
    })
    expect(equal.listPricePerPiece).toBe(8000)
    const error = await errorOf(() =>
      updateProduct(owner, product.id, { listPricePerPiece: 7999 }),
    )
    expect(error.code).toBe('invalid')
    expect(error.message).toBe(aboveList)
    expect(await getProduct(owner, product.id)).toEqual(equal)
  })

  test('raising a discount above the stored list price is rejected without applying other fields', async () => {
    const { owner } = await setupActors()
    const product = await createProduct(owner, {
      ...base,
      listPricePerPiece: 1000,
      fixedDiscountPerPiece: 400,
    })
    const error = await errorOf(() =>
      updateProduct(owner, product.id, {
        name: 'Otro',
        promotionPerPiece: 601,
      }),
    )
    expect(error.code).toBe('invalid')
    expect(error.message).toBe(aboveList)
    expect(await getProduct(owner, product.id)).toEqual(product)
  })

  test('a patch that touches no amount is not checked against legacy data', async () => {
    const { owner } = await setupActors()
    const product = await createProduct(owner, base)
    // Legacy state: discounts stored with a zero list price (products before the list price existed).
    await db
      .update(products)
      .set({ fixedDiscountPerPiece: 500 })
      .where(eq(products.id, product.id))
    const updated = await updateProduct(owner, product.id, { name: 'Otro' })
    expect(updated).toMatchObject({ name: 'Otro', fixedDiscountPerPiece: 500 })
  })

  test('staff cannot update the amounts', async () => {
    const { owner, staff } = await setupActors()
    const product = await createProduct(owner, base)
    const error = await errorOf(() =>
      updateProduct(staff, product.id, { listPricePerPiece: 100 }),
    )
    expect(error.code).toBe('forbidden')
    expect(await getProduct(owner, product.id)).toEqual(product)
  })
})

describe('savePieceCost', () => {
  const managerOf = (staff: Actor): Actor => ({
    ...staff,
    assignments: new Map([['warehouse-north', 'manager']]),
  })
  const terms = {
    listPricePerPiece: 79500,
    fixedDiscountPerPiece: 169,
    promotionPerPiece: 2452,
  }

  test('a warehouse manager saves the three amounts and nothing else changes', async () => {
    const { owner, staff } = await setupActors()
    const product = await createProduct(owner, base)
    const saved = await savePieceCost(managerOf(staff), product.id, terms)
    expect(saved).toEqual({ ...product, ...terms })
    expect(await getProduct(owner, product.id)).toEqual(saved)
  })

  test('the owner saves them too', async () => {
    const { owner } = await setupActors()
    const product = await createProduct(owner, base)
    expect(await savePieceCost(owner, product.id, terms)).toMatchObject(terms)
  })

  test('fields other than the amounts are ignored', async () => {
    const { owner, staff } = await setupActors()
    const product = await createProduct(owner, base)
    const sneaky = { ...terms, name: 'Otro', published: false } as typeof terms
    const saved = await savePieceCost(managerOf(staff), product.id, sneaky)
    expect(saved).toEqual({ ...product, ...terms })
  })

  test('staff without a warehouse are forbidden and nothing changes', async () => {
    const { owner, staff } = await setupActors()
    const product = await createProduct(owner, base)
    const error = await errorOf(() => savePieceCost(staff, product.id, terms))
    expect(error.code).toBe('forbidden')
    expect(error.message).toBe('No tienes permiso para esta acción.')
    expect(await getProduct(owner, product.id)).toEqual(product)
  })

  test('discount plus promotion above the cost per piece is rejected and nothing changes', async () => {
    const { owner, staff } = await setupActors()
    const product = await createProduct(owner, base)
    const error = await errorOf(() =>
      savePieceCost(managerOf(staff), product.id, {
        ...terms,
        listPricePerPiece: 2000,
      }),
    )
    expect(error.code).toBe('invalid')
    expect(error.message).toBe(aboveList)
    expect(await getProduct(owner, product.id)).toEqual(product)
  })

  test('an invalid amount is rejected and nothing changes', async () => {
    const { owner, staff } = await setupActors()
    const product = await createProduct(owner, base)
    const error = await errorOf(() =>
      savePieceCost(managerOf(staff), product.id, {
        ...terms,
        promotionPerPiece: -1,
      }),
    )
    expect(error.message).toBe(badAmount)
    expect(await getProduct(owner, product.id)).toEqual(product)
  })

  test('a manager still cannot edit the product itself', async () => {
    const { owner, staff } = await setupActors()
    const product = await createProduct(owner, base)
    const error = await errorOf(() =>
      updateProduct(managerOf(staff), product.id, { name: 'Otro' }),
    )
    expect(error.code).toBe('forbidden')
    expect(await getProduct(owner, product.id)).toEqual(product)
  })
})
