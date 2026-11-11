/**
 * Seed for local development. It goes through the real services, so
 * every rule, lock and ledger the app enforces also holds for the seeded data.
 * It only runs on an empty database (an owner may already exist) and never
 * deletes anything.
 */
import { count, eq } from 'drizzle-orm'
import { db } from '#/db'
import { user } from '#/db/auth-schema'
import { AppError } from '#/lib/errors'
import type { WarehouseRole } from '#/modules/access/db/schema'
import type { Actor } from '#/modules/access/lib/policy'
import {
  assignWarehouse,
  bootstrapOwner,
  createStaffUser,
} from '#/modules/access/services/access'
import {
  openCashSession,
  closeCashSession,
} from '#/modules/cash/services/cash-sessions'
import { recordCashWithdrawal } from '#/modules/cash/services/cash-movements'
import { products, suppliers } from '#/modules/catalog/db/schema'
import { createProduct } from '#/modules/catalog/services/products'
import type { Product } from '#/modules/catalog/services/product-reads'
import { createSupplier } from '#/modules/catalog/services/suppliers'
import { customers } from '#/modules/customers/db/schema'
import { saveCommercialRules } from '#/modules/customers/services/commercial-rules'
import {
  createCustomer,
  updateCustomer,
} from '#/modules/customers/services/customers'
import {
  createSupplierOrder,
  getSupplierOrder,
  receiveSupplierOrder,
} from '#/modules/inventory/services/supplier-orders'
import { registerLoss } from '#/modules/inventory/services/stock-adjustments'
import { setMinimumStock } from '#/modules/inventory/services/stock-minimums'
import { businessDate } from '#/modules/orders/services/clock'
import {
  cancelOrder,
  pickupOrder,
  prepareOrder,
} from '#/modules/orders/services/order-actions'
import type { PickupPayment } from '#/modules/orders/services/pickup-gate'
import { createOrder } from '#/modules/orders/services/orders'
import { setReservationHours } from '#/modules/orders/services/reservation-settings'
import { setPrices } from '#/modules/pricing/services/prices'
import { dispatchTransfer } from '#/modules/transfers/services/transfer-dispatch'
import { getTransfer } from '#/modules/transfers/services/transfer-reads'
import { receiveTransfer } from '#/modules/transfers/services/transfer-receive'
import { warehouses } from '#/modules/warehouses/db/schema'
import { createWarehouse } from '#/modules/warehouses/services/warehouses'
import {
  customerSeed,
  minimumSeed,
  ownerSeed,
  productSeed,
  staffSeed,
  stockSeed,
  supplierSeed,
  warehouseNames,
  warehousePriceOffset,
} from '#/db/seed/seed-data'
import type {
  SeedProduct,
  SupplierKey,
  WarehouseName,
} from '#/db/seed/seed-data'

/** Default password of every seeded user (development only). */
export const defaultSeedPassword = 'abasto-2026'

export type SeededUser = {
  name: string
  email: string
  role: 'Dueño' | 'Encargado'
  warehouses: string
  /** Null when the owner already existed (their password is unchanged). */
  password: string | null
}

export type SeedSummary = { users: Array<SeededUser> }

/** YYYY-MM-DD plus `days` (calendar arithmetic, time zone free). */
function addDays(date: string, days: number) {
  const next = new Date(`${date}T12:00:00Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

async function assertEmpty() {
  const counts = await Promise.all([
    db.select({ value: count() }).from(warehouses),
    db.select({ value: count() }).from(suppliers),
    db.select({ value: count() }).from(products),
    db.select({ value: count() }).from(customers),
    db.select({ value: count() }).from(user).where(eq(user.role, 'staff')),
  ])
  if (counts.some(([row]) => row.value > 0)) {
    throw new AppError(
      'conflict',
      'La base ya tiene datos. La seed solo corre sobre una base vacía (puede existir el dueño).',
    )
  }
}

async function ownerActor(password: string) {
  const existing = (
    await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.role, 'owner'))
  ).at(0)
  const owner = existing ?? (await bootstrapOwner({ ...ownerSeed, password }))
  const actor: Actor = {
    userId: owner.id,
    role: 'owner',
    assignments: new Map(),
  }
  const seeded: SeededUser = {
    name: owner.name,
    email: owner.email,
    role: 'Dueño',
    warehouses: 'Todos',
    password: existing ? null : password,
  }
  return { actor, seeded }
}

export async function seedDatabase({
  password,
}: {
  password: string
}): Promise<SeedSummary> {
  if (process.env.NODE_ENV === 'production') {
    throw new AppError('forbidden', 'La seed no corre en producción.')
  }
  await assertEmpty()
  const today = businessDate()
  const { actor: owner, seeded: ownerRow } = await ownerActor(password)
  await setReservationHours(owner, 48)

  // Warehouses and staff.
  const warehouseId = {} as Record<WarehouseName, string>
  for (const name of warehouseNames) {
    warehouseId[name] = (await createWarehouse(owner, { name })).id
  }
  const staff = new Map<string, Actor>()
  const users: Array<SeededUser> = [ownerRow]
  for (const member of staffSeed) {
    const created = await createStaffUser(owner, { ...member, password })
    await assignWarehouse(owner, {
      userId: created.id,
      warehouseId: warehouseId[member.warehouse],
      role: 'manager',
    })
    staff.set(member.email, {
      userId: created.id,
      role: 'staff',
      assignments: new Map<string, WarehouseRole>([
        [warehouseId[member.warehouse], 'manager'],
      ]),
    })
    users.push({
      name: member.name,
      email: member.email,
      role: 'Encargado',
      warehouses: member.warehouse,
      password,
    })
  }
  const as = (email: string) => staff.get(email)!
  const managerOf = (warehouse: WarehouseName) =>
    as(staffSeed.find((m) => m.warehouse === warehouse)!.email)

  // Catalog.
  const supplierId = {} as Record<string, string>
  for (const supplier of supplierSeed) {
    const { key, ...input } = supplier
    supplierId[key] = (await createSupplier(owner, input)).id
  }
  const catalog = new Map<string, { seed: SeedProduct; product: Product }>()
  for (const seed of productSeed) {
    const product = await createProduct(owner, {
      sku: seed.sku,
      name: seed.name,
      brand: seed.brand,
      description: seed.description,
      category: seed.category,
      imageUrl: seed.imageUrl,
      unit: 'piezas',
      supplierId: supplierId[seed.supplier],
      supplierCode: seed.supplierCode,
      listPricePerPiece: seed.listPricePerPiece,
      fixedDiscountPerPiece: seed.fixedDiscountPerPiece,
      promotionPerPiece: seed.promotionPerPiece,
      presentations: seed.presentations,
      defaultIndex: seed.presentations.findIndex(
        (p) => p.factor === seed.boxFactor,
      ),
    })
    catalog.set(seed.sku, { seed, product })
  }
  const item = (sku: string) => catalog.get(sku)!
  const boxOf = (sku: string) =>
    item(sku).product.presentations.find(
      (p) => p.factor === item(sku).seed.boxFactor,
    )!.id
  const pieceOf = (sku: string) =>
    item(sku).product.presentations.find((p) => p.factor === 1)!.id

  // Prices per warehouse: boxes priced, pieces derived, except one loose price.
  for (const name of warehouseNames) {
    await setPrices(owner, {
      warehouseId: warehouseId[name],
      reason: 'Lista inicial',
      prices: productSeed.map((seed) => ({
        presentationId: boxOf(seed.sku),
        priceCents: seed.boxPriceCents + warehousePriceOffset[name],
      })),
    })
  }
  await setPrices(owner, {
    warehouseId: warehouseId.Tejupilco,
    reason: 'Precio por pieza suelta',
    prices: [{ presentationId: pieceOf('13455'), priceCents: 2400 }],
  })

  // Orders go through the real flow: created as Pedido, then verified on arrival.
  const lineFor = (
    sku: string,
    warehouse: (typeof warehouseNames)[number],
    boxes: number,
    expiresInDays: number,
  ) => {
    const { seed, product } = item(sku)
    return {
      productId: product.id,
      boxes,
      expiresOn: addDays(today, expiresInDays),
      warehouse,
      seed,
    }
  }
  type SeedLine = ReturnType<typeof lineFor>
  /** Creates the order and receives it; `damaged` boxes per sku arrive unusable. */
  const orderAndReceive = async (
    warehouse: (typeof warehouseNames)[number],
    supplierKey: SupplierKey,
    reference: string,
    lines: Array<SeedLine>,
    damaged: Partial<Record<string, number>> = {},
  ) => {
    const actor = managerOf(warehouse)
    // Damaged boxes are ordered on top, so the stock that stays is the seeded one.
    const order = await createSupplierOrder(actor, {
      supplierId: supplierId[supplierKey],
      warehouseId: warehouseId[warehouse],
      reference,
      lines: lines.map((line) => {
        const boxes = line.boxes + (damaged[line.seed.sku] ?? 0)
        return { productId: line.productId, boxes }
      }),
    })
    const stored = await getSupplierOrder(actor, order.id)
    return receiveSupplierOrder(actor, {
      purchaseId: order.id,
      lines: stored.lines.map((stock) => {
        const line = lines.find((entry) => entry.productId === stock.productId)!
        return {
          lineId: stock.id,
          missingBoxes: 0,
          damagedBoxes: damaged[line.seed.sku] ?? 0,
          expiresOn: line.expiresOn,
          noExpiry: !line.expiresOn,
        }
      }),
    })
  }
  let folio = 1000
  for (const name of warehouseNames) {
    for (const supplier of supplierSeed) {
      const lines = productSeed
        .filter((seed) => seed.supplier === supplier.key)
        .flatMap((seed) => {
          const boxes = stockSeed[name][seed.sku]
          return boxes
            ? [lineFor(seed.sku, name, boxes, seed.shelfLifeDays)]
            : []
        })
      if (!lines.length) continue
      // One box of the first Lala product arrives damaged in Tejupilco: a supplier pending.
      const damaged =
        name === 'Tejupilco' && supplier.key === 'lala'
          ? { [lines[0].seed.sku]: 1 }
          : {}
      await orderAndReceive(name, supplier.key, `F-${folio++}`, lines, damaged)
    }
  }
  // An older Lala lot about to expire in Tejupilco (FEFO sells it first).
  await orderAndReceive('Tejupilco', 'lala', `F-${folio++}`, [
    lineFor('13455', 'Tejupilco', 10, 3),
  ])
  // Expired yoghurt in Arcelia, written off as a loss.
  const expired = await orderAndReceive('Arcelia', 'lala', `F-${folio++}`, [
    lineFor('23431', 'Arcelia', 1, -2),
  ])
  await registerLoss(managerOf('Arcelia'), {
    lotId: expired.lots[0].id,
    quantity: item('23431').seed.boxFactor,
    category: 'caducado',
    reason: 'Lote vencido sin vender',
  })
  // Waiting in the "Por recibir" queue: an Alpura order for Tejupilco, not received yet.
  const waiting = productSeed.filter((seed) => seed.supplier === 'alpura')
  await createSupplierOrder(managerOf('Tejupilco'), {
    supplierId: supplierId.alpura,
    warehouseId: warehouseId.Tejupilco,
    reference: `P-${folio++}`,
    expectedOn: addDays(today, 3),
    lines: waiting.slice(0, 2).map((seed) => ({
      productId: item(seed.sku).product.id,
      boxes: 4,
    })),
  })

  // Minimum stock.
  for (const name of warehouseNames) {
    for (const [sku, boxes] of Object.entries(minimumSeed[name])) {
      await setMinimumStock(managerOf(name), {
        productId: item(sku).product.id,
        warehouseId: warehouseId[name],
        minimum: boxes! * item(sku).seed.boxFactor,
      })
    }
  }

  // Customers and commercial rules.
  const customerId = {} as Record<string, string>
  for (const seed of customerSeed) {
    const created = await createCustomer(owner, {
      name: seed.name,
      contact: seed.contact,
      phone: seed.phone,
      addresses: [seed.address],
      notes: seed.notes,
    })
    customerId[seed.key] = created.id
    if (seed.rules) {
      await saveCommercialRules(
        owner,
        created.id,
        seed.rules.map((rule) => ({
          presentationId: boxOf(rule.sku),
          minQuantity: rule.minBoxes,
          discountBps: rule.discountBps,
          priceCents: rule.priceCents,
        })),
      )
    }
    if (seed.active === false) {
      await updateCustomer(owner, created.id, { active: false })
    }
  }

  const order = (
    warehouse: WarehouseName,
    customer: string,
    lines: Array<[sku: string, boxes: number]>,
    notes?: string,
  ) =>
    createOrder(managerOf(warehouse), {
      warehouseId: warehouseId[warehouse],
      customerId: customerId[customer],
      notes,
      lines: lines.map(([sku, boxes]) => ({
        presentationId: boxOf(sku),
        quantity: boxes,
      })),
    })
  const pickup = (
    warehouse: WarehouseName,
    orderId: string,
    payment: PickupPayment,
  ) => pickupOrder(managerOf(warehouse), orderId, payment)
  /** Cash tendered rounded up to the next 100 pesos. */
  const cash = (totalCents: number): PickupPayment => ({
    terms: 'contado',
    tenderedCents: Math.ceil(totalCents / 10_000) * 10_000,
  })

  // Today in Tejupilco: drawer, cash sale, withdrawal and open orders.
  await openCashSession(managerOf('Tejupilco'), {
    warehouseId: warehouseId.Tejupilco,
    openingCents: 100_000,
  })
  const counterSale = await order('Tejupilco', 'esquinita', [
    ['13455', 5],
    ['23431', 3],
  ])
  await pickup('Tejupilco', counterSale.id, cash(counterSale.totalCents))
  await recordCashWithdrawal(managerOf('Tejupilco'), {
    warehouseId: warehouseId.Tejupilco,
    amountCents: 15_000,
    reason: 'Compra de bolsas y hielo',
  })
  await order('Tejupilco', 'sanchez', [['13455', 25]], 'Pasa mañana temprano.')
  const prepared = await order('Tejupilco', 'donPepe', [
    ['25018', 4],
    ['LU11', 2],
  ])
  await prepareOrder(managerOf('Tejupilco'), prepared.id)
  const cancelled = await order('Tejupilco', 'esquinita', [['SA80', 2]])
  await cancelOrder(managerOf('Tejupilco'), cancelled.id)

  // Arcelia: a full day already closed with a 50-peso shortage, then today's
  // open drawer, a cash sale and a reservation.
  await openCashSession(managerOf('Arcelia'), {
    warehouseId: warehouseId.Arcelia,
    openingCents: 50_000,
  })
  const yesterdaySale = await order('Arcelia', 'esquinita', [
    ['13455', 3],
    ['LU53', 2],
  ])
  await pickup('Arcelia', yesterdaySale.id, cash(yesterdaySale.totalCents))
  await closeCashSession(managerOf('Arcelia'), {
    warehouseId: warehouseId.Arcelia,
    countedCents: 50_000 + yesterdaySale.totalCents - 5_000,
  })
  await openCashSession(managerOf('Arcelia'), {
    warehouseId: warehouseId.Arcelia,
    openingCents: 50_000,
  })
  const arceliaSale = await order('Arcelia', 'pinos', [['CA10', 2]])
  await pickup('Arcelia', arceliaSale.id, cash(arceliaSale.totalCents))
  await order('Arcelia', 'sanchez', [['13455', 10]])

  // Transfers: Tejupilco → Arcelia received one piece short, then another Tejupilco → Arcelia in transit.
  const toArcelia = await dispatchTransfer(managerOf('Tejupilco'), {
    fromWarehouseId: warehouseId.Tejupilco,
    toWarehouseId: warehouseId.Arcelia,
    notes: 'Reposición de lácteos',
    items: [
      { productId: item('LU53').product.id, quantity: 24 },
      { productId: item('25023').product.id, quantity: 12 },
    ],
  })
  const sent = await getTransfer(managerOf('Arcelia'), toArcelia.id)
  await receiveTransfer(managerOf('Arcelia'), {
    transferId: toArcelia.id,
    lines: sent.lines.map((line) => ({
      lineId: line.id,
      receivedQuantity:
        line.productId === item('25023').product.id
          ? line.quantity - 1
          : line.quantity,
    })),
  })
  await dispatchTransfer(managerOf('Tejupilco'), {
    fromWarehouseId: warehouseId.Tejupilco,
    toWarehouseId: warehouseId.Arcelia,
    notes: 'Leche saborizada para el fin de semana',
    items: [{ productId: item('SA80').product.id, quantity: 48 }],
  })

  return { users }
}
