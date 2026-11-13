import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { violatedUniqueIndex } from '#/modules/catalog/db/constraints'
import { products, suppliers } from '#/modules/catalog/db/schema'
import { maxTenThousandths } from '#/lib/utils/supplier-cost'
import { insertPrices, validatePrices } from '#/modules/pricing/services/prices'
import { requireWarehouse } from '#/modules/pricing/services/price-reads'
import {
  validateSet,
  writeSet,
} from '#/modules/catalog/services/presentation-rules'
import type { PresentationSet } from '#/modules/catalog/services/presentation-rules'
import {
  loadProduct,
  loadProducts,
  productNotFound,
} from '#/modules/catalog/services/product-reads'
import type {
  Executor,
  Product,
} from '#/modules/catalog/services/product-reads'

export type ProductFields = {
  name: string
  sku: string
  category: string
  /** Base unit name; stock and presentation factors are in this unit. */
  unit: string
  brand?: string
  description?: string
  /** Absolute http(s) URL of the product photo; blank or null removes it. */
  imageUrl?: string | null
  supplierId?: string | null
  published?: boolean
  /** The supplier's own code for the product. */
  supplierCode?: string
  /** Supplier amounts per piece, in ten-thousandths of a peso. */
  listPricePerPiece?: number
  fixedDiscountPerPiece?: number
  promotionPerPiece?: number
}
export type ProductInput = ProductFields & PresentationSet
/** Sale price of the default presentation in one warehouse, saved with the product. */
export type InitialPrice = { warehouseId: string; priceCents: number }
export type NewProductInput = ProductInput & { price?: InitialPrice }
export type ProductPatch = Partial<ProductFields>

const required = () =>
  new AppError(
    'invalid',
    'Completa nombre, SKU, presentación, unidad y categoría.',
  )

const amountKeys = [
  'listPricePerPiece',
  'fixedDiscountPerPiece',
  'promotionPerPiece',
] as const

const badAmount = () =>
  new AppError(
    'invalid',
    'Los montos del proveedor deben ser enteros en diezmilésimas, de cero o más.',
  )

const aboveListPrice = () =>
  new AppError(
    'invalid',
    'El descuento y la promoción no pueden superar el costo por pieza.',
  )

/** Discount plus promotion may not exceed the list price (all in ten-thousandths). */
function requireNetCost(amounts: {
  listPricePerPiece: number
  fixedDiscountPerPiece: number
  promotionPerPiece: number
}) {
  if (
    amounts.fixedDiscountPerPiece + amounts.promotionPerPiece >
    amounts.listPricePerPiece
  ) {
    throw aboveListPrice()
  }
}

const requiredKeys = ['name', 'sku', 'unit', 'category'] as const

/** Blank means no photo; anything else must be an absolute http(s) URL. */
function cleanedImageUrl(value: string | null): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  if (URL.canParse(trimmed)) {
    const { protocol } = new URL(trimmed)
    if (protocol === 'http:' || protocol === 'https:') return trimmed
  }
  throw new AppError(
    'invalid',
    'La imagen debe ser una URL que empiece con http:// o https://.',
  )
}

function cleaned(input: ProductPatch): ProductPatch {
  const values: ProductPatch = {}
  for (const key of requiredKeys) {
    const value = input[key]?.trim()
    if (value === '') throw required()
    if (value !== undefined) values[key] = value
  }
  if (input.brand !== undefined) values.brand = input.brand.trim()
  if (input.description !== undefined) {
    values.description = input.description.trim()
  }
  if (input.imageUrl !== undefined) {
    values.imageUrl = cleanedImageUrl(input.imageUrl)
  }
  if (input.supplierId !== undefined) values.supplierId = input.supplierId
  if (input.supplierCode !== undefined) {
    values.supplierCode = input.supplierCode.trim()
  }
  for (const key of amountKeys) {
    const amount = input[key]
    if (amount === undefined) continue
    if (
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      amount > maxTenThousandths
    ) {
      throw badAmount()
    }
    values[key] = amount
  }
  if (input.published !== undefined) values.published = input.published
  return values
}

async function requireSupplier(tx: Executor, supplierId?: string | null) {
  if (!supplierId) return
  const found = await tx
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
  if (!found.length)
    throw new AppError('not_found', 'No encontramos ese proveedor.')
}

/** Maps the catalog's unique indexes to the user-facing conflicts. */
export function mapConflict(error: unknown): unknown {
  const index = violatedUniqueIndex(error)
  if (index === 'products_sku_unique') {
    return new AppError('conflict', 'El SKU ya existe.')
  }
  if (index === 'presentations_barcode_unique') {
    return new AppError('conflict', 'El código de barras ya existe.')
  }
  return error
}

/**
 * Validates and inserts a product with its presentations inside the caller's
 * transaction, so callers can write related rows atomically. No permission
 * check: callers authorize first.
 */
export async function insertProduct(
  tx: Executor,
  input: ProductInput,
): Promise<Product> {
  const { presentations: rawRows, defaultIndex, ...fields } = input
  const values = cleaned(fields) as ProductFields
  if (!rawRows.length || requiredKeys.some((key) => !values[key])) {
    throw required()
  }
  const rows = validateSet(
    { presentations: rawRows, defaultIndex },
    new Map(),
    'El código de barras ya existe.',
  )
  requireNetCost({
    listPricePerPiece: values.listPricePerPiece ?? 0,
    fixedDiscountPerPiece: values.fixedDiscountPerPiece ?? 0,
    promotionPerPiece: values.promotionPerPiece ?? 0,
  })
  await requireSupplier(tx, values.supplierId)
  const [created] = await tx.insert(products).values(values).returning()
  await writeSet(tx, created.id, rows, defaultIndex)
  return loadProduct(tx, created.id)
}

export async function createProduct(
  actor: Actor,
  input: NewProductInput,
): Promise<Product> {
  authorize(actor, 'catalog.manage')
  const { price, ...productFields } = input
  if (price) authorize(actor, 'warehouse.manage', price.warehouseId)
  try {
    return await db.transaction(async (tx) => {
      // Validate the price before writing anything; the whole creation is one
      // transaction, so a later failure also leaves no product or cost behind.
      if (price) {
        validatePrices([
          { presentationId: 'new', priceCents: price.priceCents },
        ])
      }
      const created = await insertProduct(tx, productFields)
      if (price) {
        await requireWarehouse(tx, price.warehouseId)
        const target = created.presentations.find((item) => item.isDefault)
        if (!target) throw required()
        await insertPrices(
          tx,
          actor,
          [
            {
              presentationId: target.id,
              warehouseId: price.warehouseId,
              priceCents: price.priceCents,
            },
          ],
          'manual',
        )
      }
      return created
    })
  } catch (error) {
    throw mapConflict(error)
  }
}

/** Applies a validated patch inside the caller's transaction; no permission check. */
export async function patchProduct(
  tx: Executor,
  id: string,
  patch: ProductPatch,
): Promise<Product> {
  const values = cleaned(patch)
  const stored = await loadProduct(tx, id)
  await requireSupplier(tx, values.supplierId)
  // Only a patch that touches an amount is checked, merged with the stored ones.
  if (amountKeys.some((key) => values[key] !== undefined)) {
    requireNetCost({
      listPricePerPiece: values.listPricePerPiece ?? stored.listPricePerPiece,
      fixedDiscountPerPiece:
        values.fixedDiscountPerPiece ?? stored.fixedDiscountPerPiece,
      promotionPerPiece: values.promotionPerPiece ?? stored.promotionPerPiece,
    })
  }
  if (Object.keys(values).length) {
    const updated = await tx
      .update(products)
      .set(values)
      .where(eq(products.id, id))
      .returning({ id: products.id })
    if (!updated.length) throw productNotFound()
  }
  return loadProduct(tx, id)
}

export async function updateProduct(
  actor: Actor,
  id: string,
  patch: ProductPatch,
): Promise<Product> {
  authorize(actor, 'catalog.manage')
  cleaned(patch)
  try {
    return await db.transaction((tx) => patchProduct(tx, id, patch))
  } catch (error) {
    throw mapConflict(error)
  }
}

/** Supplier cost per piece, fixed discount and promotion, in ten-thousandths. */
export type PieceCost = Pick<ProductFields, (typeof amountKeys)[number]>

/**
 * Saves only the supplier amounts of a product; the owner or any warehouse
 * manager may. Keys other than the three amounts are ignored, and the result
 * is checked merged with the stored amounts.
 */
export async function savePieceCost(
  actor: Actor,
  id: string,
  cost: PieceCost,
): Promise<Product> {
  authorize(actor, 'catalog.cost')
  const values = cleaned({
    listPricePerPiece: cost.listPricePerPiece,
    fixedDiscountPerPiece: cost.fixedDiscountPerPiece,
    promotionPerPiece: cost.promotionPerPiece,
  })
  return db.transaction(async (tx) => {
    const stored = await loadProduct(tx, id)
    requireNetCost({
      listPricePerPiece: values.listPricePerPiece ?? stored.listPricePerPiece,
      fixedDiscountPerPiece:
        values.fixedDiscountPerPiece ?? stored.fixedDiscountPerPiece,
      promotionPerPiece: values.promotionPerPiece ?? stored.promotionPerPiece,
    })
    if (Object.keys(values).length) {
      await tx.update(products).set(values).where(eq(products.id, id))
    }
    return loadProduct(tx, id)
  })
}

/** Any signed-in actor may read the catalog. */
export async function listProducts(_actor: Actor): Promise<Array<Product>> {
  return loadProducts(db)
}

export async function getProduct(_actor: Actor, id: string): Promise<Product> {
  return loadProduct(db, id)
}
