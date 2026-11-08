import { eq } from 'drizzle-orm'
import { db } from '#/db'
import { AppError } from '#/lib/errors'
import { authorize } from '#/modules/access/lib/policy'
import type { Actor } from '#/modules/access/lib/policy'
import { violatedUniqueIndex } from '#/modules/catalog/db/constraints'
import { products, suppliers } from '#/modules/catalog/db/schema'
import { maxTenThousandths } from '#/modules/inventory/lib/supplier-cost'
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
  fixedDiscountPerPiece?: number
  promotionPerPiece?: number
}
export type ProductInput = ProductFields & PresentationSet
export type ProductPatch = Partial<ProductFields>

const required = () =>
  new AppError(
    'invalid',
    'Completa nombre, SKU, presentación, unidad y categoría.',
  )

const amountKeys = ['fixedDiscountPerPiece', 'promotionPerPiece'] as const

const badAmount = () =>
  new AppError(
    'invalid',
    'Los montos del proveedor deben ser enteros en diezmilésimas, de cero o más.',
  )

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
function mapConflict(error: unknown): unknown {
  const index = violatedUniqueIndex(error)
  if (index === 'products_sku_unique') {
    return new AppError('conflict', 'El SKU ya existe.')
  }
  if (index === 'presentations_barcode_unique') {
    return new AppError('conflict', 'El código de barras ya existe.')
  }
  return error
}

export async function createProduct(
  actor: Actor,
  input: ProductInput,
): Promise<Product> {
  authorize(actor, 'catalog.manage')
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
  try {
    return await db.transaction(async (tx) => {
      await requireSupplier(tx, values.supplierId)
      const [created] = await tx.insert(products).values(values).returning()
      await writeSet(tx, created.id, rows, defaultIndex)
      return loadProduct(tx, created.id)
    })
  } catch (error) {
    throw mapConflict(error)
  }
}

export async function updateProduct(
  actor: Actor,
  id: string,
  patch: ProductPatch,
): Promise<Product> {
  authorize(actor, 'catalog.manage')
  const values = cleaned(patch)
  try {
    return await db.transaction(async (tx) => {
      await loadProduct(tx, id)
      await requireSupplier(tx, values.supplierId)
      if (Object.keys(values).length) {
        const updated = await tx
          .update(products)
          .set(values)
          .where(eq(products.id, id))
          .returning({ id: products.id })
        if (!updated.length) throw productNotFound()
      }
      return loadProduct(tx, id)
    })
  } catch (error) {
    throw mapConflict(error)
  }
}

/** Any signed-in actor may read the catalog. */
export async function listProducts(_actor: Actor): Promise<Array<Product>> {
  return loadProducts(db)
}

export async function getProduct(_actor: Actor, id: string): Promise<Product> {
  return loadProduct(db, id)
}
