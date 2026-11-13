import { beforeEach, describe, expect, test } from 'bun:test'
import { and, count, eq, isNotNull, sql } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import { db } from '#/db'
import { user } from '#/db/auth-schema'
import { resetDatabase } from '#/db/testing'
import { AppError } from '#/lib/errors'
import { bootstrapOwner, requireActor } from '#/modules/access/services/access'
import { signIn } from '#/modules/access/lib/testing'
import { cashSessions } from '#/modules/cash/db/schema'
import { presentations, suppliers, products } from '#/modules/catalog/db/schema'
import { customers } from '#/modules/customers/db/schema'
import {
  lots,
  purchaseLines,
  purchases,
  stockMovements,
  supplierPendings,
} from '#/modules/inventory/db/schema'
import {
  orderAllocations,
  orderLines,
  orders,
} from '#/modules/orders/db/schema'
import { listWarehousePrices } from '#/modules/pricing/services/price-reads'
import { transfers } from '#/modules/transfers/db/schema'
import { warehouses } from '#/modules/warehouses/db/schema'
import { defaultSeedPassword, seedDatabase } from '#/db/seed/seed'

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

describe('seedDatabase', () => {
  test(
    'fills an empty database with a coherent sample of the business',
    async () => {
      const summary = await seedDatabase({ password: defaultSeedPassword })

      expect(await total(warehouses)).toBe(2)
      expect(await total(suppliers)).toBe(2)
      expect(await total(products)).toBe(73)
      expect(await total(customers)).toBe(6)
      expect(summary.users.map((u) => u.email)).toContain('dueno@abasto.local')
      expect(summary.users).toHaveLength(3)

      expect(
        (await db.select({ name: warehouses.name }).from(warehouses))
          .map((row) => row.name)
          .sort(),
      ).toEqual(['Arcelia', 'Tejupilco'])
      const photos = await db
        .select({ imageUrl: products.imageUrl })
        .from(products)
      expect(photos).toHaveLength(73)
      expect(photos.every((row) => row.imageUrl?.startsWith('https://'))).toBe(
        true,
      )

      // Supplier identifiers, discounts and presentations come from the spreadsheets.
      const productBySku = async (sku: string) => {
        const [row] = await db
          .select()
          .from(products)
          .where(eq(products.sku, sku))
        const rows = await db
          .select()
          .from(presentations)
          .where(eq(presentations.productId, row.id))
        return { row, presentations: rows }
      }
      const crema = await productBySku('CR93')
      expect(crema.row).toMatchObject({
        brand: 'Alpura',
        supplierCode: 'CRAC215',
        listPricePerPiece: 168100,
        fixedDiscountPerPiece: 840,
        promotionPerPiece: 12055,
      })
      expect(
        crema.presentations
          .map((p) => [p.name, p.factor, p.barcode, p.isDefault])
          .sort(),
      ).toEqual([
        ['Caja', 24, null, true],
        ['Pieza', 1, '7501055919390', false],
      ])
      expect(crema.row.description).toContain('Caja con 24 piezas')
      expect(crema.row.description).not.toContain('Charola')
      const nutri = await productBySku('13455')
      expect(nutri.row).toMatchObject({
        supplierCode: '13455',
        listPricePerPiece: 176700,
        fixedDiscountPerPiece: 0,
        promotionPerPiece: 0,
      })
      const nutriBox = nutri.presentations.find((p) => p.isDefault)!
      expect(nutriBox.factor).toBe(12)

      // Every seeded user can sign in with the default password.
      for (const seeded of summary.users) {
        const actor = await requireActor(
          await signIn(seeded.email, defaultSeedPassword),
        )
        expect(actor.role).toBe(seeded.role === 'Dueño' ? 'owner' : 'staff')
      }

      // Every product has a price in every warehouse.
      const owner = await requireActor(
        await signIn('dueno@abasto.local', defaultSeedPassword),
      )
      for (const warehouse of await db.select().from(warehouses)) {
        const prices = await listWarehousePrices(owner, warehouse.id)
        const defaults = prices.filter((row) => row.isDefault)
        expect(defaults).toHaveLength(73)
        expect(defaults.every((row) => (row.priceCents ?? 0) > 0)).toBe(true)
        if (warehouse.name === 'Tejupilco') {
          // Route price 22.78 per piece × 12 pieces.
          expect(
            defaults.find((row) => row.presentationId === nutriBox.id)
              ?.priceCents,
          ).toBe(27336)
        }
      }

      // Orders in every state the counter works with.
      const statuses = new Set(
        (await db.select({ status: orders.status }).from(orders)).map(
          (row) => row.status,
        ),
      )
      for (const status of ['Reservado', 'Recogido', 'Cancelado'])
        expect(statuses.has(status as never)).toBe(true)

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

      // Orders: received ones, one still waiting, and a damaged box owed by the supplier.
      const orderStatuses = (
        await db.select({ status: purchases.status }).from(purchases)
      ).map((row) => row.status)
      expect(orderStatuses).toContain('Recibido')
      expect(
        orderStatuses.filter((status) => status === 'Pedido'),
      ).toHaveLength(1)
      const pendings = await db.select().from(supplierPendings)
      expect(pendings.filter((row) => row.type === 'damaged')).toHaveLength(1)
      for (const row of pendings) expect(row.quantity).toBeGreaterThan(0)

      // Every purchased lot sells at or above its cost per box.
      const purchased = await db
        .select({
          price: lots.salePriceCents,
          quantity: lots.receivedQuantity,
          cost: lots.receivedCostCents,
          boxFactor: presentations.factor,
        })
        .from(lots)
        .innerJoin(
          presentations,
          and(
            eq(presentations.productId, lots.productId),
            eq(presentations.isDefault, true),
          ),
        )
        .where(isNotNull(lots.purchaseLineId))
      expect(purchased.length).toBeGreaterThan(0)
      for (const lot of purchased) {
        expect(lot.price).not.toBeNull()
        // price × boxes ≥ cost, with boxes = quantity / boxFactor.
        expect(lot.price! * lot.quantity).toBeGreaterThanOrEqual(
          lot.cost * lot.boxFactor,
        )
      }

      // Order lines are boxes only: each one snapshots the catalog price of its product.
      const orderLinesWithPrice = await db
        .select({
          line: purchaseLines.listPricePerPiece,
          product: products.listPricePerPiece,
          quantity: purchaseLines.quantity,
          gross: purchaseLines.grossCostCents,
        })
        .from(purchaseLines)
        .innerJoin(products, eq(products.id, purchaseLines.productId))
      expect(orderLinesWithPrice.length).toBeGreaterThan(0)
      for (const row of orderLinesWithPrice) {
        expect(row.product).toBeGreaterThan(0)
        expect(row.line).toBe(row.product)
        expect(row.gross).toBe(Math.round((row.quantity * row.line) / 100))
      }

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
            sql`${orderAllocations.lotId} = ${lot.id} and ${orders.status} in ('Reservado')`,
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
      const summary = await seedDatabase({ password: defaultSeedPassword })
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
      await seedDatabase({ password: defaultSeedPassword })
      const before = {
        warehouses: await total(warehouses),
        products: await total(products),
        orders: await total(orders),
        movements: await total(stockMovements),
      }
      const error = await errorOf(() =>
        seedDatabase({ password: defaultSeedPassword }),
      )
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
      const error = await errorOf(() =>
        seedDatabase({ password: defaultSeedPassword }),
      )
      expect(error.code).toBe('forbidden')
      expect(error.message).toBe('La seed no corre en producción.')
    } finally {
      process.env.NODE_ENV = previous
    }
    expect(await total(warehouses)).toBe(0)
  })
})
