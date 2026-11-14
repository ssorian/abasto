import { describe, expect, test } from 'bun:test'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ManagerReportsPage } from '#/modules/reports/components/manager/manager-reports-page'
import type { ManagerReportsSearch } from '#/modules/reports/lib/manager-search'
import type { ManagerReportsLoad } from '#/modules/reports/server/load-manager-reports'
import type { ManagerDashboard } from '#/modules/reports/types/manager-dashboard'
import type { SalesReport } from '#/modules/reports/types/reports'

const tejupilco = { id: 'w1', name: 'Tejupilco' }
const totals = {
  orders: 0,
  units: 0,
  revenueCents: 0,
  costCents: 0,
  marginCents: 0,
}
const salesReport = (orders: number): SalesReport => ({
  range: { from: '2026-11-02', to: '2026-11-08' },
  warehouses: [tejupilco],
  summary: {
    ...totals,
    orders,
    revenueCents: orders * 100_050,
    marginCents: orders * 20_000,
  },
  byDay: [],
  byProduct: [],
  byCustomer: [],
  byChannel: [],
  byWarehouse: [],
})

const dashboard = (orders: number): ManagerDashboard => ({
  warehouse: tejupilco,
  sales: salesReport(orders),
  previousSales: salesReport(1),
  cash: {
    range: { from: '2026-11-02', to: '2026-11-08' },
    warehouses: [tejupilco],
    rows: [],
    totals: {
      sessions: 0,
      salesCents: 0,
      expectedCents: 0,
      countedCents: 0,
      differenceCents: 0,
    },
    riderShortfalls: [],
  },
  stock: {
    warehouses: [tejupilco],
    expiringDays: 7,
    lowStock: [],
    expiring: [],
    expired: [],
  },
  pendingOrders: [],
})

const lala = { id: 's1', name: 'Grupo Lala', active: true }
const alpura = { id: 's2', name: 'Alpura', active: false }

/** The rail links to other screens, so the page renders inside a router. */
async function inRouter(node: ReactNode) {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => node }),
    history: createMemoryHistory({ initialEntries: ['/reportes'] }),
  })
  await router.load()
  return renderToStaticMarkup(<RouterProvider router={router} />)
}

const render = (load: ManagerReportsLoad, search: ManagerReportsSearch = {}) =>
  inRouter(
    <ManagerReportsPage
      load={load}
      search={search}
      onSearch={() => undefined}
    />,
  )

describe('ManagerReportsPage', () => {
  test('a warehouse without sales shows an explicit empty state', async () => {
    const html = await render({
      allowed: true,
      warehouses: [tejupilco],
      suppliers: [],
      dashboard: dashboard(0),
    })
    expect(html).toContain('Sin ventas en Tejupilco')
    expect(html).not.toContain('Ticket promedio')
  })

  test('shows money with centavos, and the selector only with a choice', async () => {
    const one = await render({
      allowed: true,
      warehouses: [tejupilco],
      suppliers: [],
      dashboard: dashboard(2),
    })
    expect(one).toContain('$2,001.00')
    expect(one).not.toContain('Almacén del reporte')

    const two = await render({
      allowed: true,
      warehouses: [tejupilco, { id: 'w2', name: 'Sultepec' }],
      suppliers: [],
      dashboard: dashboard(2),
    })
    expect(two).toContain('Almacén del reporte')
    expect(two).not.toContain('Todos mis almacenes')
  })

  test('someone who manages nothing is told so', async () => {
    expect(await render({ allowed: false })).toContain('encargados de almacén')
  })

  test('offers every supplier, marks the chosen one, and says cash ignores it', async () => {
    const load: ManagerReportsLoad = {
      allowed: true,
      warehouses: [tejupilco],
      suppliers: [lala, alpura],
      dashboard: dashboard(2),
    }
    const all = await render(load)
    expect(all).toContain('Todos los proveedores')
    expect(all).toContain('Grupo Lala')
    expect(all).toContain('Alpura')
    expect(all).not.toContain('La caja no se filtra por proveedor.')

    const picked = await render(load, { proveedor: 's1' })
    expect(picked).toMatch(/<option value="s1" selected/)
    expect(picked).toContain('La caja no se filtra por proveedor.')
  })
})

describe('ManagerReportsPage on one screen', () => {
  const busy = (): ManagerDashboard => {
    const base = dashboard(2)
    return {
      ...base,
      sales: {
        ...base.sales,
        byProduct: [
          {
            key: 'p1',
            name: 'Crema Ácida Alpura 426 ml',
            sku: 'ALP-426',
            unit: 'pieza',
            orders: 2,
            units: 60,
            revenueCents: 200_100,
            costCents: 160_100,
            marginCents: 40_000,
          },
        ],
        byChannel: [
          {
            key: 'counter',
            name: 'Mostrador',
            orders: 2,
            units: 60,
            revenueCents: 200_100,
            costCents: 160_100,
            marginCents: 40_000,
          },
        ],
      },
      cash: {
        ...base.cash,
        rows: [
          {
            sessionId: 'c1',
            warehouseId: 'w1',
            warehouseName: 'Tejupilco',
            status: 'open',
            openedAt: new Date('2026-11-13T14:41:00Z'),
            closedAt: null,
            openedByName: 'Laura',
            closedByName: null,
            openingCents: 50_000,
            salesCents: 186_866,
            entriesCents: 0,
            withdrawalsCents: 0,
            riderDifferenceCents: 0,
            expectedCents: 236_866,
            countedCents: null,
            differenceCents: null,
          },
        ],
      },
      stock: {
        ...base.stock,
        lowStock: [
          {
            warehouseId: 'w1',
            warehouseName: 'Tejupilco',
            productId: 'p1',
            name: 'Crema Ácida Alpura 426 ml',
            sku: 'ALP-426',
            unit: 'pieza',
            available: 96,
            minimum: 120,
            missing: 24,
          },
        ],
      },
    }
  }
  const load = (warehouses = [tejupilco]): ManagerReportsLoad => ({
    allowed: true,
    warehouses,
    suppliers: [],
    dashboard: busy(),
  })

  test('works in calendar periods with the week by default', async () => {
    const html = await render(load())
    expect(html).toContain('Reportes · Tejupilco')
    expect(html).toMatch(/aria-pressed="true"[^>]*>Semana</)
    expect(html).toContain('>Mes<')
    expect(html).not.toContain('7 días')
    expect(await render(load(), { periodo: 'month' })).toMatch(
      /aria-pressed="true"[^>]*>Mes</,
    )
  })

  test('breaks the sales down by product and controls cash and deliveries only', async () => {
    const html = await render(load())
    expect(html).toContain('Producto, de mayor a menor venta')
    expect(html).toContain('60 pieza')
    expect(html).toContain('Por canal')
    expect(html).toContain('Cortes de caja')
    expect(html).toContain('Repartos')
    expect(html).not.toContain('Proveedores, por recuperar')
  })

  test('the rail shows the open drawer, what needs attention and orders to receive', async () => {
    const html = await render(load())
    expect(html).toContain('Tu almacén hoy')
    expect(html).toContain('Abierta 08:41')
    expect(html).toContain('$2,368.66')
    expect(html).toContain('1 producto con stock bajo')
    expect(html).toContain('Crema Ácida Alpura 426 ml · 96 de mínimo 120')
    expect(html).toContain('No hay pedidos pendientes con proveedores.')
    expect(html).toContain('href="/inventario?almacen=w1"')
  })

  test('a manager of several picks among their own warehouses, never all of them', async () => {
    const html = await render(load([tejupilco, { id: 'w2', name: 'Sultepec' }]))
    expect(html).toMatch(/<option value="w1" selected/)
    expect(html).toContain('Sultepec')
    expect(html).not.toContain('Todos los almacenes')
  })
})
