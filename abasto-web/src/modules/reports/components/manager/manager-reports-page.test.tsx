import { describe, expect, test } from 'bun:test'
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

const render = (load: ManagerReportsLoad, search: ManagerReportsSearch = {}) =>
  renderToStaticMarkup(
    <ManagerReportsPage
      load={load}
      search={search}
      onSearch={() => undefined}
    />,
  )

describe('ManagerReportsPage', () => {
  test('a warehouse without sales shows an explicit empty state', () => {
    const html = render({
      allowed: true,
      warehouses: [tejupilco],
      suppliers: [],
      dashboard: dashboard(0),
    })
    expect(html).toContain('Sin ventas en Tejupilco')
    expect(html).not.toContain('Ticket promedio')
  })

  test('shows money with centavos, and the selector only with a choice', () => {
    const one = render({
      allowed: true,
      warehouses: [tejupilco],
      suppliers: [],
      dashboard: dashboard(2),
    })
    expect(one).toContain('$2,001.00')
    expect(one).not.toContain('Almacén del reporte')

    const two = render({
      allowed: true,
      warehouses: [tejupilco, { id: 'w2', name: 'Sultepec' }],
      suppliers: [],
      dashboard: dashboard(2),
    })
    expect(two).toContain('Almacén del reporte')
    expect(two).not.toContain('Todos mis almacenes')
  })

  test('someone who manages nothing is told so', () => {
    expect(render({ allowed: false })).toContain('encargados de almacén')
  })

  test('offers every supplier, marks the chosen one, and says cash ignores it', () => {
    const load: ManagerReportsLoad = {
      allowed: true,
      warehouses: [tejupilco],
      suppliers: [lala, alpura],
      dashboard: dashboard(2),
    }
    const all = render(load)
    expect(all).toContain('Todos los proveedores')
    expect(all).toContain('Grupo Lala')
    expect(all).toContain('Alpura')
    expect(all).not.toContain('La caja no se filtra por proveedor.')

    const picked = render(load, { proveedor: 's1' })
    expect(picked).toMatch(/<option value="s1" selected/)
    expect(picked).toContain('La caja no se filtra por proveedor.')
  })
})
