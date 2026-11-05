import { beforeEach, describe, expect, test } from 'bun:test'
import { count, eq, sql } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import { db } from '#/db'
import { user } from '#/db/auth-schema'
import { resetDatabase } from '#/db/testing'
import { AppError } from '#/lib/errors'
import { bootstrapOwner, requireActor } from '#/modules/access/services/access'
import { signIn } from '#/modules/access/lib/testing'
import { cashSessions } from '#/modules/cash/db/schema'
import { suppliers, products } from '#/modules/catalog/db/schema'
import { creditAuthorizations } from '#/modules/credit/db/schema'
import { getCustomerBalance } from '#/modules/credit/services/customer-ledger'
import { customers } from '#/modules/customers/db/schema'
import { lots, stockMovements } from '#/modules/inventory/db/schema'
import {
  orderAllocations,
  orderLines,
  orders,
} from '#/modules/orders/db/schema'
import { listWarehousePrices } from '#/modules/pricing/services/price-reads'
import { transfers } from '#/modules/transfers/db/schema'
import { warehouses } from '#/modules/warehouses/db/schema'
import { demoPassword, seedDemo } from '#/db/seed/seed'

const SEED_TIMEOUT = 120_000

const total = async (table: PgTable) =>
  (await db.select({ value: count() }).from(table))[0]?.value ?? 0

async function errorOf(run: () => Promise<unknown>) {
  try {
    await run()
  } catch (error) {
    return error as AppError
  }
  throw new Error('expected an error')
}

beforeEach(() => resetDatabase(db))

describe('seedDemo', () => {
  test(
    'fills an empty database with a coherent demo of the business',
    async () => {
      const summary = await seedDemo({ password: demoPassword })

      expect(await total(warehouses)).toBe(4)
      expect(await total(suppliers)).toBe(4)
      expect(await total(products)).toBe(12)
      expect(await total(customers)).toBe(6)
      expect(summary.users.map((u) => u.email)).toContain('dueno@abasto.local')
      expect(summary.users).toHaveLength(7)

      // Every seeded user can sign in with the demo password.
      for (const seeded of summary.users) {
        const actor = await requireActor(
          await signIn(seeded.email, demoPassword),
        )
        expect(actor.role).toBe(seeded.role === 'Dueño' ? 'owner' : 'staff')
      }

      // Every product has a price in every warehouse.
      const owner = await requireActor(
        await signIn('dueno@abasto.local', demoPassword),
      )
      for (const warehouse of await db.select().from(warehouses)) {
        const prices = await listWarehousePrices(owner, warehouse.id)
        const defaults = prices.filter((row) => row.isDefault)
        expect(defaults).toHaveLength(12)
        expect(defaults.every((row) => (row.priceCents ?? 0) > 0)).toBe(true)
      }

      // Orders in every state the counter works with.
      const statuses = new Set(
        (await db.select({ status: orders.status }).from(orders)).map(
          (row) => row.status,
        ),
      )
      for (const status of ['Reservado', 'Preparado', 'Recogido', 'Cancelado'])
        expect(statuses.has(status as never)).toBe(true)

      // A pending credit authorization for the owner, and an overdue balance.
      const pending = await db
        .select()
        .from(creditAuthorizations)
        .where(eq(creditAuthorizations.status, 'pending'))
      expect(pending).toHaveLength(1)
      const [overdueCustomer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, pending[0].customerId))
      const balance = await getCustomerBalance(owner, overdueCustomer.id)
      expect(balance.overdueCents).toBeGreaterThan(0)

      // Open drawers, one closed cut, and transfers both received and in transit.
      const sessionStatuses = (
        await db.select({ status: cashSessions.status }).from(cashSessions)
      ).map((row) => row.status)
      expect(sessionStatuses).toContain('open')
      expect(sessionStatuses).toContain('closed')
      const transferStatuses = (
        await db.select({ status: transfers.status }).from(transfers)
      ).map((row) => row.status)
      expect(transferStatuses).toContain('En tránsito')
      expect(transferStatuses).toContain('Recibido con diferencia')

      // Stock invariants hold for every lot.
      for (const lot of await db.select().from(lots)) {
        const [ledger] = await db
          .select({
            value: sql<number>`coalesce(sum(${stockMovements.quantity}), 0)::int`,
          })
          .from(stockMovements)
          .where(eq(stockMovements.lotId, lot.id))
        expect(lot.onHand).toBe(ledger.value)
        const [open] = await db
          .select({
            value: sql<number>`coalesce(sum(${orderAllocations.quantity}), 0)::int`,
          })
          .from(orderAllocations)
          .innerJoin(
            orderLines,
            eq(orderLines.id, orderAllocations.orderLineId),
          )
          .innerJoin(orders, eq(orders.id, orderLines.orderId))
          .where(
            sql`${orderAllocations.lotId} = ${lot.id} and ${orders.status} in ('Reservado', 'Preparado')`,
          )
        expect(lot.reserved).toBe(open.value)
      }
    },
    SEED_TIMEOUT,
  )

  test(
    'reuses an owner created with auth:create-owner',
    async () => {
      await bootstrapOwner({
        name: 'Mi dueño',
        email: 'yo@negocio.mx',
        password: 'mi-clave-123',
      })
      const summary = await seedDemo({ password: demoPassword })
      expect(summary.users.find((u) => u.role === 'Dueño')).toEqual({
        name: 'Mi dueño',
        email: 'yo@negocio.mx',
        role: 'Dueño',
        warehouses: 'Todos',
        password: null,
      })
      expect(
        (await db.select().from(user).where(eq(user.role, 'owner'))).length,
      ).toBe(1)
    },
    SEED_TIMEOUT,
  )

  test(
    'refuses a database that already has data and changes nothing',
    async () => {
      await seedDemo({ password: demoPassword })
      const before = {
        warehouses: await total(warehouses),
        products: await total(products),
        orders: await total(orders),
        movements: await total(stockMovements),
      }
      const error = await errorOf(() => seedDemo({ password: demoPassword }))
      expect(error).toBeInstanceOf(AppError)
      expect(error.code).toBe('conflict')
      expect(error.message).toBe(
        'La base ya tiene datos. La seed solo corre sobre una base vacía (puede existir el dueño).',
      )
      expect({
        warehouses: await total(warehouses),
        products: await total(products),
        orders: await total(orders),
        movements: await total(stockMovements),
      }).toEqual(before)
    },
    SEED_TIMEOUT,
  )

  test('refuses to run in production', async () => {
    const previous = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const error = await errorOf(() => seedDemo({ password: demoPassword }))
      expect(error.code).toBe('forbidden')
      expect(error.message).toBe(
        'La seed de demostración no corre en producción.',
      )
    } finally {
      process.env.NODE_ENV = previous
    }
    expect(await total(warehouses)).toBe(0)
  })
})
