import { asc, eq } from 'drizzle-orm'
import type { db } from '#/db'
import { AppError } from '#/lib/errors'
import { presentations, products } from '#/modules/catalog/db/schema'

export type Presentation = typeof presentations.$inferSelect
export type Product = typeof products.$inferSelect & {
  presentations: Array<Presentation>
}

/** A database or an open transaction. */
export type Executor = Pick<typeof db, 'select' | 'insert' | 'update'>

export const productNotFound = () =>
  new AppError('not_found', 'No encontramos ese producto.')

const byFactor = [asc(presentations.factor), asc(presentations.name)]

export async function loadProducts(
  executor: Executor,
  id?: string,
): Promise<Array<Product>> {
  const rows = await executor
    .select()
    .from(products)
    .where(id ? eq(products.id, id) : undefined)
    .orderBy(asc(products.name), asc(products.sku))
  const items = await executor
    .select()
    .from(presentations)
    .where(id ? eq(presentations.productId, id) : undefined)
    .orderBy(...byFactor)
  return rows.map((row) => ({
    ...row,
    presentations: items.filter((item) => item.productId === row.id),
  }))
}

export async function loadProduct(
  executor: Executor,
  id: string,
): Promise<Product> {
  const product = (await loadProducts(executor, id)).at(0)
  if (!product) throw productNotFound()
  return product
}
