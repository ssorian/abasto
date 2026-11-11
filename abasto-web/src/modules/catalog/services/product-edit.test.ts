import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { createProduct, getProduct } from '#/modules/catalog/services/products'
import { updateProductWithPresentations } from '#/modules/catalog/services/product-edit'
import { createSupplier } from '#/modules/catalog/services/suppliers'
import { errorOf, setupActors } from '#/modules/catalog/services/testing'

beforeEach(() => resetDatabase(db))

const forbidden = 'No tienes permiso para esta acción.'
const requiredMessage =
  'Completa nombre, SKU, presentación, unidad y categoría.'
const rowsMessage = 'Revisa nombre, equivalencia y precio de cada presentación.'

const base = {
  name: 'Leche entera 1L',
  sku: 'LEC-001',
  category: 'Lácteos',
  unit: 'piezas',
  presentations: [
    { name: 'Pieza', factor: 1 },
    { name: 'Caja x12', factor: 12 },
  ],
  defaultIndex: 1,
}

async function setup() {
  const actors = await setupActors()
  const product = await createProduct(actors.owner, base)
  const set = (change: { name?: string; factor?: number } = {}) => ({
    presentations: product.presentations.map((p) => ({
      id: p.id,
      name: p.factor === 12 ? (change.name ?? 'Caja 12 piezas') : p.name,
      factor: p.factor === 12 ? (change.factor ?? p.factor) : p.factor,
      barcode: p.barcode,
      active: p.active,
    })),
    defaultIndex: 1,
  })
  return { ...actors, product, set }
}

describe('updateProductWithPresentations', () => {
  test('saves the product fields and its presentations together', async () => {
    const { owner, product, set } = await setup()
    const supplier = await createSupplier(owner, { name: 'Alpura' })
    const saved = await updateProductWithPresentations(owner, product.id, {
      patch: { name: 'Leche 1L', supplierId: supplier.id },
      set: set(),
    })
    expect(saved).toMatchObject({ name: 'Leche 1L', supplierId: supplier.id })
    expect(saved.presentations.map((p) => p.name).sort()).toEqual([
      'Caja 12 piezas',
      'Pieza',
    ])
    expect(await getProduct(owner, product.id)).toEqual(saved)
  })

  test('an invalid presentation rejects the whole save: the product fields stay unchanged', async () => {
    const { owner, product, set } = await setup()
    for (const bad of [{ factor: 0 }, { name: '  ' }]) {
      const error = await errorOf(() =>
        updateProductWithPresentations(owner, product.id, {
          patch: { name: 'Otro nombre' },
          set: set(bad),
        }),
      )
      expect([error.code, error.message]).toEqual(['invalid', rowsMessage])
    }
    expect(await getProduct(owner, product.id)).toEqual(product)
  })

  test('an empty name rejects the whole save: the presentations stay unchanged', async () => {
    const { owner, product, set } = await setup()
    const error = await errorOf(() =>
      updateProductWithPresentations(owner, product.id, {
        patch: { name: '   ' },
        set: set(),
      }),
    )
    expect([error.code, error.message]).toEqual(['invalid', requiredMessage])
    expect(await getProduct(owner, product.id)).toEqual(product)
  })

  test('an unknown supplier rejects the whole save', async () => {
    const { owner, product, set } = await setup()
    const error = await errorOf(() =>
      updateProductWithPresentations(owner, product.id, {
        patch: {
          name: 'Otro',
          supplierId: '00000000-0000-4000-8000-000000000000',
        },
        set: set(),
      }),
    )
    expect(error.code).toBe('not_found')
    expect(await getProduct(owner, product.id)).toEqual(product)
  })

  test('staff cannot save and nothing changes', async () => {
    const { staff, owner, product, set } = await setup()
    const error = await errorOf(() =>
      updateProductWithPresentations(staff, product.id, {
        patch: { name: 'X' },
        set: set(),
      }),
    )
    expect([error.code, error.message]).toEqual(['forbidden', forbidden])
    expect(await getProduct(owner, product.id)).toEqual(product)
  })

  test('an invalid image URL rejects the whole save', async () => {
    const { owner, product, set } = await setup()
    const error = await errorOf(() =>
      updateProductWithPresentations(owner, product.id, {
        patch: { name: 'Otro', imageUrl: 'javascript:alert(1)' },
        set: set(),
      }),
    )
    expect([error.code, error.message]).toEqual([
      'invalid',
      'La imagen debe ser una URL que empiece con http:// o https://.',
    ])
    expect(await getProduct(owner, product.id)).toEqual(product)
  })

  test('a barcode used by another product says so and changes nothing', async () => {
    const { owner, product } = await setup()
    await createProduct(owner, {
      ...base,
      sku: 'OTRO-1',
      presentations: [{ name: 'Pieza', factor: 1, barcode: '7501' }],
      defaultIndex: 0,
    })
    const error = await errorOf(() =>
      updateProductWithPresentations(owner, product.id, {
        patch: { name: 'Otro' },
        set: {
          presentations: product.presentations.map((p) => ({
            id: p.id,
            name: p.name,
            factor: p.factor,
            barcode: p.factor === 1 ? '7501' : p.barcode,
            active: p.active,
          })),
          defaultIndex: 1,
        },
      }),
    )
    expect([error.code, error.message]).toEqual([
      'conflict',
      'Ese código de barras ya pertenece a otra presentación.',
    ])
    expect(await getProduct(owner, product.id)).toEqual(product)
  })
})
