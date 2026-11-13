/**
 * Permission probe (S28): owner-only operations are refused for a warehouse
 * manager and for a store customer, through the same path the server functions
 * use (`requireActor` → service → `runBoundary`, as in `runWithActor`), and a
 * refusal leaves every stored table unchanged.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { asc } from 'drizzle-orm'
import { db } from '#/db'
import { account, session, user } from '#/db/auth-schema'
import { resetDatabase } from '#/db/testing'
import { runBoundary } from '#/lib/boundary'
import { warehouseAssignments } from '#/modules/access/db/schema'
import type { Actor } from '#/modules/access/lib/policy'
import { signIn } from '#/modules/access/lib/testing'
import {
  assignWarehouse,
  bootstrapOwner,
  createStaffUser,
  listUsers,
  requireActor,
  unassignWarehouse,
} from '#/modules/access/services/access'
import { presentations, products, suppliers } from '#/modules/catalog/db/schema'
import { savePresentations } from '#/modules/catalog/services/presentations'
import {
  createSupplier,
  updateSupplier,
} from '#/modules/catalog/services/suppliers'
import {
  createProduct,
  updateProduct,
} from '#/modules/catalog/services/products'
import {
  customerCommercialRules,
  customers,
} from '#/modules/customers/db/schema'
import { saveCommercialRules } from '#/modules/customers/services/commercial-rules'
import {
  createCustomer,
  updateCustomer,
} from '#/modules/customers/services/customers'
import {
  getInventoryValue,
  getNonMovingCapital,
} from '#/modules/executive/services/inventory'
import {
  getMarginReport,
  getWarehouseRanking,
} from '#/modules/executive/services/profitability'
import { orderSettings } from '#/modules/orders/db/schema'
import { setReservationHours } from '#/modules/orders/services/reservation-settings'
import {
  getStoreAccess,
  grantStoreAccess,
  setStoreAccessPassword,
} from '#/modules/store/services/store-access'
import { warehouses } from '#/modules/warehouses/db/schema'
import { createWarehouse } from '#/modules/warehouses/services/warehouses'

const refusal = (message: string) =>
  ({ ok: false, code: 'forbidden', message }) as const
const forbidden = refusal('No tienes permiso para esta acción.')
const customerOnly = refusal('Esta cuenta solo tiene acceso a la tienda.')

/** What `runWithActor` does with a request's session cookie. */
const throughServerEntry = <T>(
  headers: Headers,
  run: (actor: Actor) => Promise<T>,
) => runBoundary(async () => run(await requireActor(headers)))

async function snapshot() {
  const all = <T>(rows: Promise<Array<T>>) => rows
  return {
    users: await all(db.select().from(user).orderBy(asc(user.id))),
    accounts: await all(db.select().from(account).orderBy(asc(account.id))),
    sessions: await all(
      db.select({ id: session.id }).from(session).orderBy(asc(session.id)),
    ),
    assignments: await all(
      db
        .select()
        .from(warehouseAssignments)
        .orderBy(
          asc(warehouseAssignments.userId),
          asc(warehouseAssignments.warehouseId),
        ),
    ),
    warehouses: await all(
      db.select().from(warehouses).orderBy(asc(warehouses.id)),
    ),
    suppliers: await all(
      db.select().from(suppliers).orderBy(asc(suppliers.id)),
    ),
    products: await all(db.select().from(products).orderBy(asc(products.id))),
    presentations: await all(
      db.select().from(presentations).orderBy(asc(presentations.id)),
    ),
    customers: await all(
      db.select().from(customers).orderBy(asc(customers.id)),
    ),
    rules: await all(
      db
        .select()
        .from(customerCommercialRules)
        .orderBy(asc(customerCommercialRules.id)),
    ),
    settings: await all(db.select().from(orderSettings)),
  }
}

async function setup() {
  await bootstrapOwner({
    name: 'Dueño',
    email: 'dueno@abasto.test',
    password: 'secreto-123',
  })
  const owner = await requireActor(
    await signIn('dueno@abasto.test', 'secreto-123'),
  )
  const north = await createWarehouse(owner, { name: 'Norte' })
  const staffUser = await createStaffUser(owner, {
    name: 'Encargado',
    email: 'encargado@abasto.test',
    password: 'secreto-456',
  })
  await assignWarehouse(owner, {
    userId: staffUser.id,
    warehouseId: north.id,
    role: 'manager',
  })
  const supplier = await createSupplier(owner, { name: 'Alpura' })
  const product = await createProduct(owner, {
    name: 'Leche 1L',
    sku: 'LEC-1',
    category: 'Lácteos',
    unit: 'piezas',
    supplierId: supplier.id,
    presentations: [
      { name: 'Pieza', factor: 1 },
      { name: 'Caja', factor: 12 },
    ],
    defaultIndex: 0,
  })
  const customer = await createCustomer(owner, { name: 'Abarrotes' })
  await grantStoreAccess(owner, {
    customerId: customer.id,
    email: 'tienda@cliente.test',
    password: 'cliente-123',
  })
  return {
    owner,
    north,
    staffUser,
    supplier,
    product,
    customer,
    managerHeaders: await signIn('encargado@abasto.test', 'secreto-456'),
    customerHeaders: await signIn('tienda@cliente.test', 'cliente-123'),
  }
}

type Fixture = Awaited<ReturnType<typeof setup>>

/** Catalog services: the owner and any warehouse manager, never a customer. */
const managerCatalog: Array<
  [string, (actor: Actor, fx: Fixture) => Promise<unknown>]
> = [
  [
    'catalog.manage createProduct',
    (actor) =>
      createProduct(actor, {
        name: 'Refresco',
        sku: 'REF-1',
        category: 'Bebidas',
        unit: 'piezas',
        presentations: [{ name: 'Pieza', factor: 1 }],
        defaultIndex: 0,
      }),
  ],
  [
    'catalog.manage updateProduct',
    (actor, fx) => updateProduct(actor, fx.product.id, { name: 'Robado' }),
  ],
  [
    'catalog.manage savePresentations',
    (actor, fx) =>
      savePresentations(actor, fx.product.id, {
        presentations: [{ name: 'Pieza', factor: 1 }],
        defaultIndex: 0,
      }),
  ],
  [
    'catalog.manage createSupplier',
    (actor) => createSupplier(actor, { name: 'Falso' }),
  ],
  [
    'catalog.manage updateSupplier',
    (actor, fx) => updateSupplier(actor, fx.supplier.id, { active: false }),
  ],
]

/** Every owner-only service, with valid input, keyed by the permission it needs. */
const ownerOnly: Array<
  [string, (actor: Actor, fx: Fixture) => Promise<unknown>]
> = [
  ['users.manage listUsers', (actor) => listUsers(actor)],
  [
    'users.manage createStaffUser',
    (actor) =>
      createStaffUser(actor, {
        name: 'Intruso',
        email: 'intruso@abasto.test',
        password: 'secreto-789',
      }),
  ],
  [
    'users.manage assignWarehouse',
    (actor, fx) =>
      assignWarehouse(actor, {
        userId: fx.staffUser.id,
        warehouseId: fx.north.id,
        role: 'manager',
      }),
  ],
  [
    'users.manage unassignWarehouse',
    (actor, fx) =>
      unassignWarehouse(actor, {
        userId: fx.staffUser.id,
        warehouseId: fx.north.id,
      }),
  ],
  [
    'warehouses.manage createWarehouse',
    (actor) => createWarehouse(actor, { name: 'Sur' }),
  ],
  [
    'warehouses.manage setReservationHours',
    (actor) => setReservationHours(actor, 48),
  ],
  [
    'customers.manage createCustomer',
    (actor) => createCustomer(actor, { name: 'Intruso' }),
  ],
  [
    'customers.manage updateCustomer',
    (actor, fx) => updateCustomer(actor, fx.customer.id, { name: 'Robado' }),
  ],
  [
    'customers.manage saveCommercialRules',
    (actor, fx) =>
      saveCommercialRules(actor, fx.customer.id, [
        {
          presentationId: fx.product.presentations[0].id,
          minQuantity: 1,
          discountBps: 5000,
        },
      ]),
  ],
  [
    'customers.manage getStoreAccess',
    (actor, fx) => getStoreAccess(actor, fx.customer.id),
  ],
  [
    'customers.manage grantStoreAccess',
    (actor, fx) =>
      grantStoreAccess(actor, {
        customerId: fx.customer.id,
        email: 'otro@cliente.test',
        password: 'cliente-456',
      }),
  ],
  [
    'customers.manage setStoreAccessPassword',
    (actor, fx) =>
      setStoreAccessPassword(actor, {
        customerId: fx.customer.id,
        password: 'nueva-clave-1',
      }),
  ],
  [
    'executive getMarginReport',
    (actor) => getMarginReport(actor, { period: { preset: '30' } }),
  ],
  [
    'executive getWarehouseRanking',
    (actor) => getWarehouseRanking(actor, { period: { preset: '30' } }),
  ],
  ['executive getInventoryValue', (actor) => getInventoryValue(actor)],
  ['executive getNonMovingCapital', (actor) => getNonMovingCapital(actor)],
]

beforeEach(() => resetDatabase(db))

describe('catalog operations', () => {
  test.each(managerCatalog)(
    'a warehouse manager passes the server entry: %s',
    async (_name, call) => {
      const fx = await setup()
      const result = await throughServerEntry(fx.managerHeaders, (actor) =>
        call(actor, fx),
      )
      expect(result).toMatchObject({ ok: true })
    },
  )

  test.each(managerCatalog)(
    'a store customer is refused at the server entry: %s',
    async (_name, call) => {
      const fx = await setup()
      const before = await snapshot()
      const result = await throughServerEntry(fx.customerHeaders, (actor) =>
        call(actor, fx),
      )
      expect(result).toEqual(customerOnly)
      expect(await snapshot()).toEqual(before)
    },
  )
})

describe('owner-only operations', () => {
  test.each(ownerOnly)(
    'a warehouse manager is refused: %s',
    async (_name, call) => {
      const fx = await setup()
      const before = await snapshot()
      const result = await throughServerEntry(fx.managerHeaders, (actor) =>
        call(actor, fx),
      )
      expect(result).toEqual(forbidden)
      expect(await snapshot()).toEqual(before)
    },
  )

  test.each(ownerOnly)(
    'a store customer is refused at the server entry: %s',
    async (_name, call) => {
      const fx = await setup()
      const before = await snapshot()
      const result = await throughServerEntry(fx.customerHeaders, (actor) =>
        call(actor, fx),
      )
      expect(result).toEqual(customerOnly)
      expect(await snapshot()).toEqual(before)
    },
  )

  test.each(ownerOnly)(
    'a customer actor reaching the service directly is refused: %s',
    async (_name, call) => {
      const fx = await setup()
      const before = await snapshot()
      const customerActor: Actor = {
        userId: 'user-customer',
        role: 'customer',
        assignments: new Map([[fx.north.id, 'manager']]),
      }
      const result = await runBoundary(() => call(customerActor, fx))
      expect(result).toEqual(forbidden)
      expect(await snapshot()).toEqual(before)
    },
  )

  test('the owner still passes the same entry', async () => {
    const fx = await setup()
    const ownerHeaders = await signIn('dueno@abasto.test', 'secreto-123')
    const result = await throughServerEntry(ownerHeaders, (actor) =>
      createWarehouse(actor, { name: 'Sur' }),
    )
    expect(result).toMatchObject({ ok: true, data: { name: 'Sur' } })
    expect((await snapshot()).warehouses).toHaveLength(2)
    expect(fx.north.name).toBe('Norte')
  })
})
