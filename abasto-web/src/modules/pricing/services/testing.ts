/** Shared fixtures for pricing service tests. */
import { count } from 'drizzle-orm'
import { db } from '#/db'
import { createProduct } from '#/modules/catalog/services/products'
import { createSupplier } from '#/modules/catalog/services/suppliers'
import { setupInventory } from '#/modules/inventory/services/testing'
import { presentationPrices } from '#/modules/pricing/db/schema'
import { listWarehousePrices } from '#/modules/pricing/services/price-reads'
import type { Fixture } from '#/modules/inventory/services/testing'

export { errorOf, receive } from '#/modules/inventory/services/testing'
export type { Fixture }

/** Inventory fixture plus a milk (Pieza, Caja 12; Alpura) and a cola (Pieza, Caja 24; Coca-Cola). */
export async function setupPricing() {
  const fx = await setupInventory()
  const cocaCola = await createSupplier(fx.owner, { name: 'Coca-Cola' })
  const milkBox = await createProduct(fx.owner, {
    name: 'Leche entera 1L',
    sku: 'LEC-9',
    category: 'Lácteos',
    unit: 'piezas',
    supplierId: fx.supplier.id,
    presentations: [
      { name: 'Pieza', factor: 1 },
      { name: 'Caja', factor: 12 },
    ],
    defaultIndex: 0,
  })
  const cola = await createProduct(fx.owner, {
    name: 'Cola 600ml',
    sku: 'COL-1',
    category: 'Refrescos',
    unit: 'piezas',
    supplierId: cocaCola.id,
    presentations: [
      { name: 'Pieza', factor: 1 },
      { name: 'Caja', factor: 24 },
    ],
    defaultIndex: 0,
  })
  // Sold by the box by default: pieces derive from the box price.
  const water = await createProduct(fx.owner, {
    name: 'Agua 1L',
    sku: 'AGU-1',
    category: 'Refrescos',
    unit: 'piezas',
    presentations: [
      { name: 'Pieza', factor: 1 },
      { name: 'Caja', factor: 12 },
    ],
    defaultIndex: 1,
  })
  const piece = (product: {
    presentations: Array<{ id: string; factor: number }>
  }) => product.presentations.find((item) => item.factor === 1)!
  const box = (product: {
    presentations: Array<{ id: string; factor: number }>
  }) => product.presentations.find((item) => item.factor !== 1)!
  return { ...fx, cocaCola, milkBox, cola, water, piece, box }
}

export type PricingFixture = Awaited<ReturnType<typeof setupPricing>>

/** Everything a rejected operation must leave untouched, read through the services. */
export async function pricingState(fx: PricingFixture) {
  return {
    a: await listWarehousePrices(fx.owner, fx.a.id),
    b: await listWarehousePrices(fx.owner, fx.b.id),
    history: (await db.select({ value: count() }).from(presentationPrices))[0]
      ?.value,
  }
}
