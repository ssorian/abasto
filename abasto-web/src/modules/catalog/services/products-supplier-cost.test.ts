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
const negativeNet =
  'El descuento y la promoción no pueden superar el precio de lista.'
const badAmount =
  'Los montos del proveedor deben ser enteros en diezmilésimas, de cero o más.'
const empty = { suppliers: 0, products: 0, presentations: 0 }

describe('supplier cost on createProduct', () => {
  test('defaults to no code and zero amounts', async () => {
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
      listPricePerPiece: 12055,
      fixedDiscountPerPiece: 1000,
      promotionPerPiece: 12055 - 1000,
    })
    expect(created).toMatchObject({
      supplierCode: 'ORA-77',
      listPricePerPiece: 12055,
      fixedDiscountPerPiece: 1000,
      promotionPerPiece: 11055,
    })
    expect(await getProduct(staff, created.id)).toEqual(created)
  })

  test.each([
    ['negative list', { listPricePerPiece: -1 }],
    ['fractional discount', { fixedDiscountPerPiece: 1.5 }],
    ['NaN promotion', { promotionPerPiece: Number.NaN }],
    ['unsafe list', { listPricePerPiece: 2 ** 53 }],
    ['above the column range', { listPricePerPiece: 2_147_483_648 }],
  ])('rejects %s', async (_case, amounts) => {
    const { owner } = await setupActors()
    const error = await errorOf(() =>
      createProduct(owner, { ...base, ...amounts }),
    )
    expect(error.code).toBe('invalid')
    expect(error.message).toBe(badAmount)
    expect(await counts()).toEqual(empty)
  })

  test('rejects a net cost below zero', async () => {
    const { owner } = await setupActors()
    const error = await errorOf(() =>
      createProduct(owner, {
        ...base,
        listPricePerPiece: 1000,
        fixedDiscountPerPiece: 600,
        promotionPerPiece: 401,
      }),
    )
    expect(error.code).toBe('invalid')
    expect(error.message).toBe(negativeNet)
    expect(await counts()).toEqual(empty)
  })

  test('accepts a net cost of exactly zero', async () => {
    const { owner } = await setupActors()
    const created = await createProduct(owner, {
      ...base,
      listPricePerPiece: 1000,
      fixedDiscountPerPiece: 600,
      promotionPerPiece: 400,
    })
    expect(created.listPricePerPiece).toBe(1000)
  })

  test('staff cannot set supplier cost', async () => {
    const { staff } = await setupActors()
    const error = await errorOf(() =>
      createProduct(staff, { ...base, listPricePerPiece: 1000 }),
    )
    expect(error.code).toBe('forbidden')
    expect((await counts()).products).toBe(0)
  })
})

describe('supplier cost on updateProduct', () => {
  test('updates the cost and keeps untouched fields', async () => {
    const { owner } = await setupActors()
    const product = await createProduct(owner, {
      ...base,
      supplierCode: 'A1',
      listPricePerPiece: 5000,
    })
    const updated = await updateProduct(owner, product.id, {
      fixedDiscountPerPiece: 500,
    })
    expect(updated).toMatchObject({
      supplierCode: 'A1',
      listPricePerPiece: 5000,
      fixedDiscountPerPiece: 500,
      promotionPerPiece: 0,
    })
    expect(await getProduct(owner, product.id)).toEqual(updated)
  })

  test('validates the net against the stored amounts and leaves data unchanged', async () => {
    const { owner } = await setupActors()
    const product = await createProduct(owner, {
      ...base,
      listPricePerPiece: 5000,
      fixedDiscountPerPiece: 1000,
    })
    const tooMuch = await errorOf(() =>
      updateProduct(owner, product.id, { promotionPerPiece: 4001 }),
    )
    expect(tooMuch.code).toBe('invalid')
    expect(tooMuch.message).toBe(negativeNet)
    const lowerList = await errorOf(() =>
      updateProduct(owner, product.id, { listPricePerPiece: 999 }),
    )
    expect(lowerList.message).toBe(negativeNet)
    expect(await getProduct(owner, product.id)).toEqual(product)
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

  test('staff cannot update the cost', async () => {
    const { owner, staff } = await setupActors()
    const product = await createProduct(owner, base)
    const error = await errorOf(() =>
      updateProduct(staff, product.id, { listPricePerPiece: 100 }),
    )
    expect(error.code).toBe('forbidden')
    expect(await getProduct(owner, product.id)).toEqual(product)
  })
})
