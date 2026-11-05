import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '#/db'
import { resetDatabase } from '#/db/testing'
import { customerLedger } from '#/modules/credit/db/schema'
import { recordAbono } from '#/modules/credit/services/customer-ledger'
import { createCustomer } from '#/modules/customers/services/customers'
import { createOrder } from '#/modules/orders/services/orders'
import { getReceivablesAging } from '#/modules/reports/services/receivables-aging'
import {
  errorOf,
  farFuture,
  receive,
  setupReports,
  useClock,
} from '#/modules/reports/services/testing'

beforeEach(() => resetDatabase(db))
afterEach(() => useClock(null))

/** Today in the scenarios: 2026-11-04 (Mexico City). */
async function scenario() {
  const fx = await setupReports()
  useClock(() => new Date('2026-11-04T18:00:00Z'))
  await receive(fx, {
    productId: fx.milkBox.id,
    quantity: 100,
    expiresOn: farFuture,
  })
  const charge = async (
    customerId: string,
    amountCents: number,
    dueOn: string,
  ) => {
    const order = await createOrder(fx.clerkA, {
      warehouseId: fx.a.id,
      customerId,
      lines: [{ presentationId: fx.pieceId, quantity: 1 }],
    })
    await db.insert(customerLedger).values({
      type: 'charge',
      customerId,
      amountCents,
      orderId: order.id,
      dueOn,
      warehouseId: fx.a.id,
      actorId: fx.clerkA.userId,
    })
  }
  const norte = fx.customer.id
  const sur = (await createCustomer(fx.owner, { name: 'Abarrotes Sur' })).id
  const paid = (await createCustomer(fx.owner, { name: 'Pagado' })).id
  await createCustomer(fx.owner, { name: 'Sin movimientos' })

  // Norte, oldest first: >60, 31–60, 1–30, current.
  await charge(norte, 1000, '2026-08-01')
  await charge(norte, 2000, '2026-09-20')
  await charge(norte, 3000, '2026-10-20')
  await charge(norte, 4000, '2026-11-10')
  // Sur sits on every bucket edge: due today and 1 / 30 / 31 / 60 / 61 days ago.
  await charge(sur, 700, '2026-11-04')
  await charge(sur, 800, '2026-11-03')
  await charge(sur, 500, '2026-10-05')
  await charge(sur, 600, '2026-10-04')
  await charge(sur, 900, '2026-09-05')
  await charge(sur, 1100, '2026-09-04')
  await charge(paid, 1000, '2026-10-01')

  // 1500 to Norte covers the 1000 charge and half of the 2000 one.
  await recordAbono(fx.owner, {
    warehouseId: fx.a.id,
    customerId: norte,
    amountCents: 1500,
  })
  await recordAbono(fx.owner, {
    warehouseId: fx.a.id,
    customerId: paid,
    amountCents: 1000,
  })
  return fx
}

describe('receivables aging', () => {
  test('abonos cover the oldest charges first and buckets follow days overdue', async () => {
    const fx = await scenario()
    const report = await getReceivablesAging(fx.owner)
    expect(report.asOf).toBe('2026-11-04')
    expect(report.rows).toEqual([
      {
        customerId: fx.customer.id,
        name: 'Distribuidora Norte',
        currentCents: 4000,
        days1to30Cents: 3000,
        days31to60Cents: 1500,
        over60Cents: 0,
        totalCents: 8500,
      },
      expect.objectContaining({
        name: 'Abarrotes Sur',
        currentCents: 700,
        days1to30Cents: 1300,
        days31to60Cents: 1500,
        over60Cents: 1100,
        totalCents: 4600,
      }),
    ])
    expect(report.totals).toEqual({
      customers: 2,
      currentCents: 4700,
      days1to30Cents: 4300,
      days31to60Cents: 3000,
      over60Cents: 1100,
      totalCents: 13100,
    })
  })

  test('owner and managers of any warehouse read it; clerks do not', async () => {
    const fx = await scenario()
    expect((await getReceivablesAging(fx.managerA)).totals.totalCents).toBe(
      13100,
    )
    expect((await getReceivablesAging(fx.managerB)).totals.totalCents).toBe(
      13100,
    )
    expect(await errorOf(() => getReceivablesAging(fx.clerkA))).toMatchObject({
      code: 'forbidden',
    })
  })
})
