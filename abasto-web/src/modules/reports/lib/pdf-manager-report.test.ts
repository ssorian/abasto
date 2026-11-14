import { describe, expect, test } from 'bun:test'
import { buildManagerPdfReport } from '#/modules/reports/lib/pdf-report'
import type { ManagerDashboard } from '#/modules/reports/types/manager-dashboard'
import type { SalesReport, SalesRow } from '#/modules/reports/types/reports'

const arcelia = { id: 'w1', name: 'Arcelia' }
const sale = (key: string, revenueCents: number, orders: number): SalesRow => ({
  key,
  name: key,
  orders,
  units: orders * 10,
  revenueCents,
  costCents: revenueCents * 0.8,
  marginCents: revenueCents * 0.2,
})
const report = (
  range: { from: string; to: string },
  byDay: Array<SalesRow>,
): SalesReport => {
  const sum = (field: 'orders' | 'revenueCents' | 'costCents') =>
    byDay.reduce((total, item) => total + item[field], 0)
  return {
    range,
    warehouses: [arcelia],
    summary: {
      orders: sum('orders'),
      units: 0,
      revenueCents: sum('revenueCents'),
      costCents: sum('costCents'),
      marginCents: sum('revenueCents') - sum('costCents'),
    },
    byDay,
    byProduct: byDay.length
      ? [
          {
            ...sale('p1', sum('revenueCents'), 1),
            name: 'Crema',
            sku: 'C1',
            unit: 'pieza',
          },
        ]
      : [],
    byCustomer: [],
    byChannel: byDay.length
      ? [{ ...sale('Mostrador', sum('revenueCents'), 1) }]
      : [],
    byWarehouse: [],
  }
}

const dashboard = (byDay: Array<SalesRow>): ManagerDashboard => ({
  warehouse: arcelia,
  sales: report({ from: '2026-11-09', to: '2026-11-13' }, byDay),
  previousSales: report({ from: '2026-11-02', to: '2026-11-06' }, [
    sale('2026-11-03', 100_000, 1),
  ]),
  cash: {
    range: { from: '2026-11-09', to: '2026-11-13' },
    warehouses: [arcelia],
    rows: [
      {
        sessionId: 'c1',
        warehouseId: 'w1',
        warehouseName: 'Arcelia',
        status: 'closed',
        openedAt: new Date('2026-11-13T14:00:00Z'),
        closedAt: new Date('2026-11-14T02:00:00Z'),
        openedByName: 'Miguel Cruz',
        closedByName: 'Miguel Cruz',
        openingCents: 0,
        salesCents: 0,
        entriesCents: 0,
        withdrawalsCents: 0,
        riderDifferenceCents: 0,
        expectedCents: 203_834,
        countedCents: 198_834,
        differenceCents: -5_000,
      },
    ],
    totals: {
      sessions: 1,
      salesCents: 0,
      expectedCents: 0,
      countedCents: 0,
      differenceCents: -5_000,
    },
    riderShortfalls: [],
  },
  stock: {
    warehouses: [arcelia],
    expiringDays: 7,
    lowStock: [],
    expiring: [],
    expired: [],
  },
  pendingOrders: [],
})

const meta = {
  business: 'Distribuidora del Sur',
  scope: 'Almacén Arcelia',
  generatedAt: '13 nov 2026, 20:29',
  generatedBy: 'Miguel Cruz',
}
const titles = (sections: Array<{ title: string }>) =>
  sections.map((section) => section.title)

describe('buildManagerPdfReport', () => {
  const sold = dashboard([
    sale('2026-11-10', 120_000, 1),
    sale('2026-11-13', 340_700, 1),
  ])

  test('the week of one warehouse, without the owner-only sections', () => {
    const pdf = buildManagerPdfReport('week', sold, meta)
    expect(pdf.filename).toBe('abasto-reporte-semana-2026-11-09.pdf')
    expect(pdf.lines[0]).toBe('Distribuidora del Sur · Almacén Arcelia')
    expect(pdf.lines[1]).toBe('Comparado con 2 al 6 nov')
    expect(titles(pdf.sections)).toEqual([
      '1. Resultado',
      '2. Ventas por día',
      '3. Ventas por canal',
      '4. Productos con más ventas',
      '5. Cortes de caja',
      '6. Repartos con diferencia',
      '7. Inventario al generar el reporte',
      '8. Pedidos a proveedor por recibir',
    ])
    const cash = pdf.sections[4]
    expect(cash.head).toEqual([
      'Día',
      'Cerró',
      'Esperado',
      'Contado',
      'Diferencia',
    ])
    expect(cash.rows[0]).toContain('-$50.00')
    expect(pdf.sections[0].rows[0]).toEqual([
      'Ventas',
      '$4,607.00',
      '$1,000.00',
      '+360.7 %',
    ])
    expect(pdf.sections[7].empty).toBe(
      'No hay pedidos pendientes con proveedores.',
    )
  })

  test('the day is a closing sheet; the month lists every product', () => {
    const day = buildManagerPdfReport('day', sold, meta)
    expect(day.filename).toBe('abasto-reporte-dia-2026-11-13.pdf')
    expect(titles(day.sections)).not.toContain('2. Ventas por día')
    expect(day.sections[3].head).toEqual([
      'Cerró',
      'Esperado',
      'Contado',
      'Diferencia',
    ])
    const month = buildManagerPdfReport('month', sold, meta)
    expect(month.filename).toBe('abasto-reporte-mes-2026-11.pdf')
    expect(titles(month.sections)).toContain(
      '4. Productos, de mayor a menor venta',
    )
  })

  test('without sales only cash, stock and orders remain', () => {
    const pdf = buildManagerPdfReport('week', dashboard([]), meta)
    expect(titles(pdf.sections)).toEqual([
      '1. Ventas',
      '2. Cortes de caja',
      '3. Repartos con diferencia',
      '4. Inventario al generar el reporte',
      '5. Pedidos a proveedor por recibir',
    ])
  })
})
