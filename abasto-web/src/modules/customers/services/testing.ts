/** Shared fixtures for customers service tests. */
import { count } from 'drizzle-orm'
import { db } from '#/db'
import { createProduct, getProduct } from '#/modules/catalog/services/products'
import {
  customerCommercialRules,
  customers,
} from '#/modules/customers/db/schema'

export { errorOf, setupActors } from '#/modules/catalog/services/testing'

/** Creates a product and returns its piece and box (x12) presentation ids. */
export async function createPresentations(
  owner: Parameters<typeof createProduct>[0],
  sku = 'LEC-001',
) {
  const product = await createProduct(owner, {
    name: `Leche ${sku}`,
    sku,
    category: 'Lácteos',
    unit: 'piezas',
    presentations: [
      { name: 'Pieza', factor: 1 },
      { name: 'Caja x12', factor: 12 },
    ],
    defaultIndex: 0,
  })
  const rows = (await getProduct(owner, product.id)).presentations
  const idOf = (factor: number) => rows.find((r) => r.factor === factor)!.id
  return { piece: idOf(1), box: idOf(12) }
}

const countOf = async (
  table: typeof customers | typeof customerCommercialRules,
) => (await db.select({ value: count() }).from(table))[0]?.value

export const customerCounts = async () => ({
  customers: await countOf(customers),
  rules: await countOf(customerCommercialRules),
})
