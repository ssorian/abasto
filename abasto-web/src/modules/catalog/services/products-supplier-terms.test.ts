import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import {
  createProduct,
  getProduct,
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
const empty = { suppliers: 0, products: 0, presentations: 0 }

describe('supplier terms on createProduct', () => {
  test('defaults to no code and zero discount and promotion, and holds no list price', async () => {
    const { owner } = await setupActors()
    const created = await createProduct(owner, base)
    expect(created).toMatchObject({
      supplierCode: '',
      fixedDiscountPerPiece: 0,
      promotionPerPiece: 0,
    })
    expect(created).not.toHaveProperty('listPricePerPiece')
  })

  test('stores a trimmed code and the amounts in ten-thousandths', async () => {
    const { owner, staff } = await setupActors()
    const created = await createProduct(owner, {
      ...base,
      supplierCode: '  ORA-77 ',
      fixedDiscountPerPiece: 1000,
      promotionPerPiece: 11055,
    })
    expect(created).toMatchObject({
      supplierCode: 'ORA-77',
      fixedDiscountPerPiece: 1000,
      promotionPerPiece: 11055,
    })
    expect(created).not.toHaveProperty('listPricePerPiece')
    expect(await getProduct(staff, created.id)).toEqual(created)
  })

  test.each([
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

  test('no list price to compare: any non-negative discount and promotion are stored', async () => {
    const { owner } = await setupActors()
    const created = await createProduct(owner, {
      ...base,
      fixedDiscountPerPiece: 600,
      promotionPerPiece: 900,
    })
    expect(created).toMatchObject({
      fixedDiscountPerPiece: 600,
      promotionPerPiece: 900,
    })
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
      fixedDiscountPerPiece: 5000,
    })
    const updated = await updateProduct(owner, product.id, {
      promotionPerPiece: 500,
    })
    expect(updated).toMatchObject({
      supplierCode: 'A1',
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

  test('staff cannot update the amounts', async () => {
    const { owner, staff } = await setupActors()
    const product = await createProduct(owner, base)
    const error = await errorOf(() =>
      updateProduct(staff, product.id, { fixedDiscountPerPiece: 100 }),
    )
    expect(error.code).toBe('forbidden')
    expect(await getProduct(owner, product.id)).toEqual(product)
  })
})
