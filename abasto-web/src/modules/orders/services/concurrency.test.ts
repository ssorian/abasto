import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { lots } from '#/modules/inventory/db/schema'
import { countStock } from '#/modules/inventory/services/stock-counts'
import {
  cancelOrder,
  pickupOrder,
} from '#/modules/orders/services/order-actions'
import { orders } from '#/modules/orders/db/schema'
import { createOrder } from '#/modules/orders/services/orders'
import {
  HOUR,
  payCash,
  receive,
  setupOrders,
  useClock,
} from '#/modules/orders/services/testing'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

type Fx = Awaited<ReturnType<typeof setupOrders>>
const place = (fx: Fx, quantity: number) =>
  createOrder(fx.clerkA, {
    warehouseId: fx.a.id,
    customerId: fx.customer.id,
    lines: [{ presentationId: fx.pieceId, quantity }],
  })

/**
 * Two lots (`lo` < `hi` by id; `hi` was received first so FIFO fills it first).
 * Order Y holds 1 unit of `hi`; order P (placed later) holds 1 of `lo`.
 */
async function setupCrossing() {
  const fx = await setupOrders()
  const [one, two] = [
    await receive(fx, { productId: fx.milkBox.id, quantity: 3 }),
    await receive(fx, { productId: fx.milkBox.id, quantity: 3 }),
  ]
  const [lo, hi] = one.id < two.id ? [one, two] : [two, one]
  await db
    .update(lots)
    .set({ receivedAt: new Date('2026-01-01T00:00:00Z') })
    .where(eq(lots.id, hi.id))
  await db
    .update(lots)
    .set({ receivedAt: new Date('2026-02-01T00:00:00Z') })
    .where(eq(lots.id, lo.id))
  const y = await place(fx, 1)
  // FIFO now prefers `lo`, so P lands there.
  await db
    .update(lots)
    .set({ receivedAt: new Date('2025-12-01T00:00:00Z') })
    .where(eq(lots.id, lo.id))
  // P is placed 2 h later, so it outlives Y.
  useClock(() => new Date(Date.now() + 2 * HOUR))
  const p = await place(fx, 1)
  useClock(null)
  // The crossing only exists if each order holds a different lot.
  expect(y.lines[0].allocations.map((a) => a.lotId)).toEqual([hi.id])
  expect(p.lines[0].allocations.map((a) => a.lotId)).toEqual([lo.id])
  return { fx, y, p, lo }
}

type Race = 'pickup' | 'cancel' | 'count'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Waits until `count` database sessions are blocked on a lock. */
async function waitForBlocked(count: number) {
  for (let i = 0; i < 400; i++) {
    const { rows } = await db.execute<{ blocked: number }>(
      sql`select count(*)::int as blocked from pg_stat_activity
          where datname = current_database() and wait_event_type = 'Lock'`,
    )
    if (rows[0].blocked >= count) return
    await sleep(10)
  }
  throw new Error('The operations never blocked.')
}

/**
 * A stalled operation crosses an expiry. A helper transaction holds `lo`, so
 * operation A (creates an order, locking `lo` then `hi`; the clock says Y is
 * not overdue yet) waits. Operation B then starts when Y is overdue: its lazy
 * expiry releases `hi` and then wants `lo`. When the helper lets go, A gets
 * `lo` and wants `hi` while B holds `hi` and wants `lo`: without a
 * per-warehouse lock Postgres aborts one of them (40P01).
 */
async function crossingRound(race: Race) {
  await resetDatabase(db)
  const { fx, y, p, lo } = await setupCrossing()
  const early = new Date(Date.now() + HOUR)
  const late = new Date(Date.now() + 25 * HOUR) // Y overdue, P (expires at +26 h) not
  let overdue = false
  useClock(() => (overdue ? late : early))
  let release = () => {}
  let held = () => {}
  const holding = new Promise<void>((resolve) => (held = resolve))
  const helper = db.transaction(async (tx) => {
    await tx.select().from(lots).where(eq(lots.id, lo.id)).for('update')
    held()
    await new Promise<void>((resolve) => (release = resolve))
  })
  await holding
  const first = Promise.allSettled([place(fx, 2)])
  await waitForBlocked(1)
  overdue = true
  const second = Promise.allSettled([
    race === 'pickup'
      ? pickupOrder(fx.clerkA, p.id, payCash)
      : race === 'cancel'
        ? cancelOrder(fx.clerkA, p.id)
        : countStock(fx.managerA, {
            warehouseId: fx.a.id,
            productId: fx.milkBox.id,
            countedQuantity: 6,
          }),
  ])
  await waitForBlocked(2)
  release()
  await helper
  const results = [...(await first), ...(await second)]
  const yStatus = (await db.select().from(orders).where(eq(orders.id, y.id)))[0]
    .status
  useClock(null)
  return { yStatus, results }
}

describe('warehouse write serialization', () => {
  test('orders, pickups, cancels and counts crossing an expiry never deadlock', async () => {
    const failures: Array<string> = []
    const statuses: Array<string> = []
    for (const race of ['pickup', 'cancel', 'count', 'pickup'] as const) {
      const { yStatus, results } = await crossingRound(race)
      for (const result of results) {
        if (
          result.status === 'rejected' &&
          (result.reason as { cause?: { code?: string } }).cause?.code ===
            '40P01'
        ) {
          failures.push(`${race}: deadlock detected`)
        }
      }
      statuses.push(yStatus)
    }
    expect(failures).toEqual([])
    expect(statuses).toEqual(Array(4).fill('Vencido'))
  }, 60_000)
})
