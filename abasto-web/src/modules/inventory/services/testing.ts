/** Shared fixtures for inventory service tests. */
import { asc, count, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { user } from '#/db/auth-schema'
import { signIn } from '#/modules/access/lib/testing'
import type { WarehouseRole } from '#/modules/access/db/schema'
import type { Actor } from '#/modules/access/lib/policy'
import {
  assignWarehouse,
  bootstrapOwner,
  requireActor,
} from '#/modules/access/services/access'
import { createProduct } from '#/modules/catalog/services/products'
import { createSupplier } from '#/modules/catalog/services/suppliers'
import {
  lots,
  purchases,
  stockCounts,
  stockMovements,
} from '#/modules/inventory/db/schema'
import { createPurchase } from '#/modules/inventory/services/purchases'
import { createWarehouse } from '#/modules/warehouses/services/warehouses'

export { errorOf } from '#/modules/catalog/services/testing'

/**
 * Staff actor with one warehouse assignment. The user row is inserted directly
 * (no password hashing or sign-in): these tests exercise the policy, not Better Auth.
 */
async function staffActor(
  owner: Actor,
  name: string,
  warehouseId: string,
  role: WarehouseRole,
): Promise<Actor> {
  const userId = `user-${name}`
  await db.insert(user).values({
    id: userId,
    name,
    email: `${name}@abasto.test`,
    role: 'staff',
  })
  await assignWarehouse(owner, { userId, warehouseId, role })
  return {
    userId,
    role: 'staff',
    assignments: new Map([[warehouseId, role]]),
  }
}

const productInput = (sku: string, name: string) => ({
  name,
  sku,
  category: 'Lácteos',
  unit: 'piezas',
  presentations: [{ name: 'Pieza', factor: 1 }],
  defaultIndex: 0,
})

/** Owner, warehouses A and B (two managers in A, one in B), a supplier and two products. */
export async function setupInventory() {
  await bootstrapOwner({
    name: 'Dueño',
    email: 'dueno@abasto.test',
    password: 'secreto-123',
  })
  const owner = await requireActor(
    await signIn('dueno@abasto.test', 'secreto-123'),
  )
  const a = await createWarehouse(owner, { name: 'Almacén A' })
  const b = await createWarehouse(owner, { name: 'Almacén B' })
  const managerA = await staffActor(owner, 'gerente-a', a.id, 'manager')
  const staffA = await staffActor(owner, 'cajero-a', a.id, 'manager')
  const managerB = await staffActor(owner, 'gerente-b', b.id, 'manager')
  const supplier = await createSupplier(owner, { name: 'Alpura' })
  const milk = await createProduct(owner, productInput('LEC-1', 'Leche 1L'))
  const soda = await createProduct(
    owner,
    productInput('REF-1', 'Refresco 600ml'),
  )
  return { owner, a, b, managerA, staffA, managerB, supplier, milk, soda }
}

export type Fixture = Awaited<ReturnType<typeof setupInventory>>

/** Receives one purchase line and returns the lot it created. */
export async function receive(
  fx: Fixture,
  line: {
    productId?: string
    warehouseId?: string
    quantity: number
    totalCostCents?: number
    salePriceCents?: number
    lotCode?: string
    expiresOn?: string
  },
) {
  const { warehouseId = fx.a.id, productId = fx.milk.id, ...rest } = line
  const purchase = await createPurchase(fx.owner, {
    supplierId: fx.supplier.id,
    warehouseId,
    purchasedOn: '2026-11-01',
    lines: [{ productId, totalCostCents: 1000, ...rest }],
  })
  return purchase.lots[0]
}

/** Everything a rejected operation must leave untouched. */
export async function inventoryState() {
  const total = async (table: typeof purchases | typeof stockCounts) =>
    (await db.select({ value: count() }).from(table))[0]?.value
  return {
    lots: await db
      .select({ id: lots.id, onHand: lots.onHand })
      .from(lots)
      .orderBy(asc(lots.id)),
    movements: (await db.select({ value: count() }).from(stockMovements))[0]
      ?.value,
    purchases: await total(purchases),
    counts: await total(stockCounts),
  }
}

/** Ledger sum per lot, to compare with the cached `on_hand`. */
export async function ledgerSum(lotId: string) {
  const [row] = await db
    .select({
      value: sql<number>`coalesce(sum(${stockMovements.quantity}), 0)::int`,
    })
    .from(stockMovements)
    .where(eq(stockMovements.lotId, lotId))
  return row.value
}

export const onHandOf = async (lotId: string) =>
  (await db.select().from(lots).where(eq(lots.id, lotId)))[0]?.onHand
