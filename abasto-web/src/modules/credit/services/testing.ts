/** Shared fixtures for cash and credit service tests. */
import { asc, count } from 'drizzle-orm'
import { db } from '#/db'
import { cashMovements, cashSessions } from '#/modules/cash/db/schema'
import {
  creditAuthorizations,
  customerLedger,
} from '#/modules/credit/db/schema'
import { setCustomerCredit } from '#/modules/customers/services/customers'
import { createOrder } from '#/modules/orders/services/orders'
import { setPrices } from '#/modules/pricing/services/prices'
import {
  orderState,
  receive,
  setupOrders,
} from '#/modules/orders/services/testing'

export {
  advance,
  errorOf,
  orderState,
  payCash,
  receive,
  useClock,
} from '#/modules/orders/services/testing'

/** Piece price 1000 cents; customer credit limit 5000 cents, 7-day terms; 100 pieces in A. */
export async function setupCredit() {
  const fx = await setupOrders()
  await setCustomerCredit(fx.owner, fx.customer.id, {
    enabled: true,
    limitCents: 5000,
    termsDays: 7,
  })
  await receive(fx, { productId: fx.milkBox.id, quantity: 100 })
  const place = (
    quantity: number,
    options: { warehouseId?: string; customerId?: string } = {},
  ) =>
    createOrder(options.warehouseId === fx.b.id ? fx.managerB : fx.clerkA, {
      warehouseId: options.warehouseId ?? fx.a.id,
      customerId: options.customerId ?? fx.customer.id,
      lines: [{ presentationId: fx.pieceId, quantity }],
    })
  return { ...fx, place }
}

export type CreditFixture = Awaited<ReturnType<typeof setupCredit>>

/** Warehouse B stock, price and open drawer, so a second warehouse can sell and receive cash. */
export async function equipWarehouseB(fx: CreditFixture) {
  await setPrices(fx.owner, {
    warehouseId: fx.b.id,
    prices: [{ presentationId: fx.pieceId, priceCents: 1000 }],
  })
  await receive(fx, {
    warehouseId: fx.b.id,
    productId: fx.milkBox.id,
    quantity: 100,
  })
}

const total = async (
  table:
    | typeof cashSessions
    | typeof cashMovements
    | typeof customerLedger
    | typeof creditAuthorizations,
) => (await db.select({ value: count() }).from(table))[0]?.value

/** Everything a rejected cash or credit operation must leave untouched. */
export async function paymentState() {
  return {
    ...(await orderState()),
    sessions: await db
      .select()
      .from(cashSessions)
      .orderBy(asc(cashSessions.id)),
    cashMovements: await total(cashMovements),
    ledger: await total(customerLedger),
    authorizations: await db
      .select()
      .from(creditAuthorizations)
      .orderBy(asc(creditAuthorizations.id)),
  }
}
