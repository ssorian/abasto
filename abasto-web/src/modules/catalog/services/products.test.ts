import { beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import {
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
} from '#/modules/catalog/services/products'
import { savePresentations } from '#/modules/catalog/services/presentations'
import { createSupplier } from '#/modules/catalog/services/suppliers'
import {
  counts,
  errorOf,
  setupActors,
} from '#/modules/catalog/services/testing'

beforeEach(() => resetDatabase(db))

const forbidden = 'No tienes permiso para esta acción.'
const requiredMessage =
  'Completa nombre, SKU, presentación, unidad y categoría.'

const base = {
  name: 'Leche entera 1L',
  sku: 'LEC-001',
  category: 'Lácteos',
  unit: 'piezas',
  presentations: [
    { name: 'Pieza', factor: 1, barcode: '7501' },
    { name: 'Caja x12', factor: 12 },
  ],
  defaultIndex: 1,
}

describe('createProduct', () => {
  test('creates the product with its presentations and default; staff can read', async () => {
    const { owner, staff } = await setupActors()
    const supplier = await createSupplier(owner, { name: 'Alpura' })
    const created = await createProduct(owner, {
      ...base,
      sku: ' LEC-001 ',
      supplierId: supplier.id,
    })
    expect(created).toMatchObject({
      sku: 'LEC-001',
      supplierId: supplier.id,
      published: true,
    })
    expect(
      created.presentations.map((p) => [
        p.name,
        p.factor,
        p.isDefault,
        p.active,
      ]),
    ).toEqual([
      ['Pieza', 1, false, true],
      ['Caja x12', 12, true, true],
    ])
    expect(await getProduct(staff, created.id)).toEqual(created)
    expect(await listProducts(staff)).toEqual([created])
  })

  test.each([
    ['name', { name: ' ' }],
    ['sku', { sku: '' }],
    ['unit', { unit: '' }],
    ['category', { category: '  ' }],
    ['presentations', { presentations: [], defaultIndex: 0 }],
  ])('rejects a missing %s', async (_field, patch) => {
    const { owner } = await setupActors()
    const error = await errorOf(() =>
      createProduct(owner, { ...base, ...patch }),
    )
    expect(error.code).toBe('invalid')
    expect(error.message).toBe(requiredMessage)
    expect(await counts()).toEqual({
      suppliers: 0,
      products: 0,
      presentations: 0,
    })
  })

  test('rejects a duplicate SKU regardless of case', async () => {
    const { owner } = await setupActors()
    await createProduct(owner, base)
    const before = await counts()
    const error = await errorOf(() =>
      createProduct(owner, {
        ...base,
        presentations: [{ name: 'Pieza', factor: 1 }],
        defaultIndex: 0,
        sku: 'lec-001',
      }),
    )
    expect(error.code).toBe('conflict')
    expect(error.message).toBe('El SKU ya existe.')
    expect(await counts()).toEqual(before)
  })

  test('rejects a barcode already used by another product', async () => {
    const { owner } = await setupActors()
    await createProduct(owner, base)
    const before = await counts()
    const error = await errorOf(() =>
      createProduct(owner, { ...base, sku: 'LEC-002' }),
    )
    expect(error.code).toBe('conflict')
    expect(error.message).toBe('El código de barras ya existe.')
    expect(await counts()).toEqual(before)
  })

  test('rejects an unknown supplier', async () => {
    const { owner } = await setupActors()
    const error = await errorOf(() =>
      createProduct(owner, { ...base, supplierId: crypto.randomUUID() }),
    )
    expect(error.code).toBe('not_found')
    expect(error.message).toBe('No encontramos ese proveedor.')
    expect((await counts()).products).toBe(0)
  })

  test('applies the presentation rules and stores nothing when they fail', async () => {
    const { owner } = await setupActors()
    const noBase = await errorOf(() =>
      createProduct(owner, {
        ...base,
        presentations: [{ name: 'Caja', factor: 12 }],
        defaultIndex: 0,
      }),
    )
    expect(noBase.message).toBe(
      'Conserva una presentación activa de una unidad base.',
    )
    const reserved = await errorOf(() =>
      createProduct(owner, {
        ...base,
        presentations: [{ name: 'Pieza', factor: 1, barcode: 'AB0123456789' }],
        defaultIndex: 0,
      }),
    )
    expect(reserved.message).toBe(
      'Este código está reservado para etiquetas internas.',
    )
    const badRow = await errorOf(() =>
      createProduct(owner, {
        ...base,
        presentations: [
          { name: 'Pieza', factor: 1 },
          { name: 'Media', factor: 1.5 },
        ],
        defaultIndex: 0,
      }),
    )
    expect(badRow.message).toBe(
      'Revisa nombre, equivalencia y precio de cada presentación.',
    )
    const noDefault = await errorOf(() =>
      createProduct(owner, { ...base, defaultIndex: 5 }),
    )
    expect(noDefault.message).toBe(
      'Selecciona una presentación activa para la venta por defecto.',
    )
    for (const error of [noBase, reserved, badRow, noDefault])
      expect(error.code).toBe('invalid')
    expect(await counts()).toEqual({
      suppliers: 0,
      products: 0,
      presentations: 0,
    })
  })

  test('staff cannot create products', async () => {
    const { staff } = await setupActors()
    const error = await errorOf(() => createProduct(staff, base))
    expect(error.code).toBe('forbidden')
    expect(error.message).toBe(forbidden)
    expect((await counts()).products).toBe(0)
  })
})

describe('updateProduct', () => {
  test('updates fields, supplier and published flag', async () => {
    const { owner } = await setupActors()
    const supplier = await createSupplier(owner, { name: 'Alpura' })
    const product = await createProduct(owner, base)
    const updated = await updateProduct(owner, product.id, {
      name: 'Leche 1L',
      brand: 'Alpura',
      supplierId: supplier.id,
      published: false,
    })
    expect(updated).toMatchObject({
      name: 'Leche 1L',
      brand: 'Alpura',
      supplierId: supplier.id,
      published: false,
    })
    expect(updated.presentations).toEqual(product.presentations)
    expect(await getProduct(owner, product.id)).toEqual(updated)
    const cleared = await updateProduct(owner, product.id, { supplierId: null })
    expect(cleared.supplierId).toBeNull()
  })

  test("allows keeping its own SKU in another case, rejects another product's SKU", async () => {
    const { owner } = await setupActors()
    const first = await createProduct(owner, base)
    const second = await createProduct(owner, {
      ...base,
      sku: 'LEC-002',
      presentations: [{ name: 'Pieza', factor: 1 }],
      defaultIndex: 0,
    })
    expect((await updateProduct(owner, first.id, { sku: 'lec-001' })).sku).toBe(
      'lec-001',
    )
    const before = await listProducts(owner)
    const error = await errorOf(() =>
      updateProduct(owner, second.id, { sku: 'LEC-001' }),
    )
    expect(error.code).toBe('conflict')
    expect(error.message).toBe('El SKU ya existe.')
    expect(await listProducts(owner)).toEqual(before)
  })

  test('rejects blank required fields, unknown supplier and unknown product', async () => {
    const { owner } = await setupActors()
    const product = await createProduct(owner, base)
    const blank = await errorOf(() =>
      updateProduct(owner, product.id, { name: ' ' }),
    )
    expect(blank.code).toBe('invalid')
    expect(blank.message).toBe(requiredMessage)
    const supplier = await errorOf(() =>
      updateProduct(owner, product.id, { supplierId: crypto.randomUUID() }),
    )
    expect(supplier.code).toBe('not_found')
    expect(supplier.message).toBe('No encontramos ese proveedor.')
    const missing = await errorOf(() =>
      updateProduct(owner, crypto.randomUUID(), { brand: 'x' }),
    )
    expect(missing.code).toBe('not_found')
    expect(missing.message).toBe('No encontramos ese producto.')
    expect(await getProduct(owner, product.id)).toEqual(product)
  })

  test('staff cannot update products', async () => {
    const { owner, staff } = await setupActors()
    const product = await createProduct(owner, base)
    const error = await errorOf(() =>
      updateProduct(staff, product.id, { name: 'X' }),
    )
    expect(error.code).toBe('forbidden')
    expect(error.message).toBe(forbidden)
    expect(await getProduct(owner, product.id)).toEqual(product)
  })
})

describe('getProduct', () => {
  test('unknown id is not found', async () => {
    const { owner } = await setupActors()
    const error = await errorOf(() => getProduct(owner, crypto.randomUUID()))
    expect(error.code).toBe('not_found')
    expect(error.message).toBe('No encontramos ese producto.')
  })
})

describe('savePresentations', () => {
  const rowsOf = (product: Awaited<ReturnType<typeof createProduct>>) =>
    product.presentations.map(({ id, name, factor, barcode, active }) => ({
      id,
      name,
      factor,
      barcode,
      active,
    }))

  test('keeps existing rows, adds new ones, moves the default', async () => {
    const { owner, staff } = await setupActors()
    const product = await createProduct(owner, base)
    const rows = [
      ...rowsOf(product).map((row) => ({ ...row, name: `${row.name}!` })),
      { name: 'Tarima', factor: 480, barcode: '999' },
    ]
    const saved = await savePresentations(owner, product.id, {
      presentations: rows,
      defaultIndex: 2,
    })
    expect(
      saved.presentations.map((p) => [p.name, p.factor, p.isDefault]),
    ).toEqual([
      ['Pieza!', 1, false],
      ['Caja x12!', 12, false],
      ['Tarima', 480, true],
    ])
    expect(saved.presentations[0]?.id).toBe(product.presentations[0]?.id)
    expect(await getProduct(staff, product.id)).toEqual(saved)
  })

  test('a row left out is deactivated, never deleted', async () => {
    const { owner } = await setupActors()
    const product = await createProduct(owner, base)
    const [piece] = rowsOf(product)
    const saved = await savePresentations(owner, product.id, {
      presentations: [piece],
      defaultIndex: 0,
    })
    expect(
      saved.presentations.map((p) => [p.name, p.active, p.isDefault]),
    ).toEqual([
      ['Pieza', true, true],
      ['Caja x12', false, false],
    ])
    expect((await counts()).presentations).toBe(2)
  })

  test('an inactive row may be reactivated and keeps its factor', async () => {
    const { owner } = await setupActors()
    const product = await createProduct(owner, base)
    const rows = rowsOf(product)
    await savePresentations(owner, product.id, {
      presentations: [rows[0]],
      defaultIndex: 0,
    })
    const saved = await savePresentations(owner, product.id, {
      presentations: rows,
      defaultIndex: 1,
    })
    expect(saved.presentations.every((p) => p.active)).toBe(true)
    expect(saved.presentations[1]?.isDefault).toBe(true)
  })

  test('each rule rejects with its message and leaves the stored set unchanged', async () => {
    const { owner } = await setupActors()
    const product = await createProduct(owner, base)
    const other = await createProduct(owner, {
      ...base,
      sku: 'LEC-002',
      presentations: [{ name: 'Pieza', factor: 1, barcode: '8888' }],
      defaultIndex: 0,
    })
    const [piece, box] = rowsOf(product) as [
      ReturnType<typeof rowsOf>[number],
      ReturnType<typeof rowsOf>[number],
    ]
    const attempt = (rows: Array<object>, defaultIndex: number) =>
      errorOf(() =>
        savePresentations(owner, product.id, {
          presentations: rows as never,
          defaultIndex,
        }),
      )
    const cases: Array<
      [string, string, string, Awaited<ReturnType<typeof attempt>>]
    > = [
      [
        'invalid',
        'Conserva una presentación activa de una unidad base.',
        'no base',
        await attempt([{ ...piece, active: false }, box], 1),
      ],
      [
        'invalid',
        'Revisa nombre, equivalencia y precio de cada presentación.',
        'empty name',
        await attempt([{ ...piece, name: ' ' }, box], 0),
      ],
      [
        'invalid',
        'Revisa nombre, equivalencia y precio de cada presentación.',
        'factor 0',
        await attempt([piece, { name: 'Cero', factor: 0 }], 0),
      ],
      [
        'invalid',
        'Revisa nombre, equivalencia y precio de cada presentación.',
        'fraction',
        await attempt([piece, { name: 'Media', factor: 1.5 }], 0),
      ],
      [
        'invalid',
        'Revisa nombre, equivalencia y precio de cada presentación.',
        'unknown id',
        await attempt([piece, { ...box, id: crypto.randomUUID() }], 0),
      ],
      [
        'invalid',
        'Una equivalencia existente no cambia: desactívala y crea otra presentación.',
        'factor change',
        await attempt([piece, { ...box, factor: 24 }], 0),
      ],
      [
        'invalid',
        'Este código está reservado para etiquetas internas.',
        'reserved',
        await attempt([{ ...piece, barcode: 'AB0123456789' }, box], 0),
      ],
      [
        'conflict',
        'Ese código de barras ya pertenece a otra presentación.',
        'other product',
        await attempt([piece, { ...box, barcode: '8888' }], 0),
      ],
      [
        'conflict',
        'Ese código de barras ya pertenece a otra presentación.',
        'same set',
        await attempt([piece, { ...box, barcode: '7501' }], 0),
      ],
      [
        'invalid',
        'Selecciona una presentación activa para la venta por defecto.',
        'inactive default',
        await attempt([piece, { ...box, active: false }], 1),
      ],
      [
        'invalid',
        'Selecciona una presentación activa para la venta por defecto.',
        'out of range',
        await attempt([piece, box], 9),
      ],
    ]
    for (const [code, message, label, error] of cases) {
      expect([label, error.code, error.message]).toEqual([label, code, message])
    }
    expect(await getProduct(owner, product.id)).toEqual(product)
    expect((await getProduct(owner, other.id)).presentations).toEqual(
      other.presentations,
    )
    expect((await counts()).presentations).toBe(3)
  })

  test('unknown product is not found; staff are forbidden', async () => {
    const { owner, staff } = await setupActors()
    const product = await createProduct(owner, base)
    const rows = rowsOf(product)
    const missing = await errorOf(() =>
      savePresentations(owner, crypto.randomUUID(), {
        presentations: rows,
        defaultIndex: 0,
      }),
    )
    expect(missing.code).toBe('not_found')
    expect(missing.message).toBe('No encontramos ese producto.')
    const denied = await errorOf(() =>
      savePresentations(staff, product.id, {
        presentations: [{ name: 'Nueva', factor: 1 }],
        defaultIndex: 0,
      }),
    )
    expect(denied.code).toBe('forbidden')
    expect(denied.message).toBe(forbidden)
    expect(await getProduct(owner, product.id)).toEqual(product)
  })
})
