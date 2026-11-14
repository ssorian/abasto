import { describe, expect, test } from 'bun:test'
import { buildPdfReport } from '#/modules/reports/lib/pdf-report'
import type { PdfKind } from '#/modules/reports/lib/pdf-report'
import type { OwnerDashboardData } from '#/modules/reports/types/owner-dashboard'
import type { SalesRow } from '#/modules/reports/types/reports'

const metrics = (revenueCents: number, costCents: number, tickets: number) => ({
  revenueCents,
  costCents,
  marginCents: revenueCents - costCents,
  marginBps: revenueCents
    ? Math.round(((revenueCents - costCents) * 10_000) / revenueCents)
    : null,
  tickets,
  averageTicketCents: tickets ? Math.round(revenueCents / tickets) : 0,
})
const row = (
  key: string,
  name: string,
  revenueCents: number,
  costCents: number,
  orders: number,
) => ({
  key,
  name,
  orders,
  units: orders * 10,
  revenueCents,
  costCents,
  marginCents: revenueCents - costCents,
  marginBps: Math.round(((revenueCents - costCents) * 10_000) / revenueCents),
})
const day = (key: string, revenueCents: number, orders: number): SalesRow => ({
  key,
  name: key,
  orders,
  units: orders,
  revenueCents,
  costCents: revenueCents / 2,
  marginCents: revenueCents / 2,
})
const products = Array.from({ length: 12 }, (_, index) => ({
  ...row(`p${index}`, `Producto ${index}`, 1000 * (index + 1), 600, 1),
  sku: `SKU${index}`,
  unit: 'pieza',
}))

function dashboard(range: { from: string; to: string }): OwnerDashboardData {
  const previousRange = { from: '2026-10-01', to: '2026-10-13' }
  const sales = {
    range,
    warehouses: [],
    summary: {
      orders: 4,
      units: 40,
      revenueCents: 643658,
      costCents: 493631,
      marginCents: 150027,
    },
    byDay: [
      day('2026-11-02', 100000, 1),
      day('2026-11-09', 243658, 1),
      day('2026-11-13', 300000, 2),
    ],
    byProduct: [],
    byCustomer: [],
    byChannel: [],
    byWarehouse: [],
  }
  return {
    margin: {
      range,
      warehouses: [
        { id: 'w1', name: 'Arcelia' },
        { id: 'w2', name: 'Tejupilco' },
      ],
      summary: {
        orders: 4,
        units: 40,
        revenueCents: 643658,
        costCents: 493631,
        marginCents: 150027,
        marginBps: 2331,
      },
      byProduct: products,
      bySupplier: [
        row('s1', 'Grupo Lala', 326076, 231840, 3),
        row('s2', 'Alpura', 317582, 261791, 3),
      ],
      byWarehouse: [
        row('w1', 'Arcelia', 340700, 273939, 2),
        row('w2', 'Tejupilco', 302958, 219692, 2),
      ],
    },
    ranking: {
      range,
      previousRange,
      rows: [
        {
          key: 'w1',
          name: 'Arcelia',
          current: metrics(340700, 273939, 2),
          previous: metrics(574000, 440000, 5),
          delta: {
            revenueCents: 0,
            marginCents: 0,
            marginBps: null,
            tickets: 0,
            averageTicketCents: 0,
            revenueChangeBps: null,
          },
        },
      ],
    },
    inventory: {
      warehouses: [
        { id: 'w1', name: 'Arcelia', units: 10, valueCents: 984720 },
        { id: 'w2', name: 'Tejupilco', units: 90, valueCents: 134110545 },
      ],
      totalCents: 135095265,
    },
    nonMoving: {
      days: 30,
      totalCents: 122801066,
      rows: Array.from({ length: 7 }, (_, index) => ({
        warehouseId: 'w2',
        warehouseName: 'Tejupilco',
        productId: `n${index}`,
        name: `Detenido ${index}`,
        sku: `N${index}`,
        unit: 'pieza',
        onHand: 5,
        valueCents: 1000 * (index + 1),
        lastSaleOn: null,
        daysSinceLastSale: null,
      })),
    },
    sales,
    previousSales: { ...sales, range: previousRange, byDay: [] },
    cashCuts: {
      range,
      warehouses: [],
      rows: [
        {
          sessionId: 'c1',
          warehouseId: 'w1',
          warehouseName: 'Arcelia',
          status: 'closed',
          openedAt: new Date('2026-11-13T14:00:00Z'),
          closedAt: new Date('2026-11-13T23:00:00Z'),
          openedByName: 'Miguel Cruz',
          closedByName: 'Miguel Cruz',
          openingCents: 0,
          salesCents: 203834,
          entriesCents: 0,
          withdrawalsCents: 0,
          riderDifferenceCents: 0,
          expectedCents: 203834,
          countedCents: 198834,
          differenceCents: -5000,
        },
      ],
      totals: {
        sessions: 1,
        salesCents: 203834,
        expectedCents: 203834,
        countedCents: 198834,
        differenceCents: -5000,
      },
      riderShortfalls: [],
    },
    stockAlerts: {
      lowStock: [{ warehouseName: 'Arcelia' }],
      expiring: [{ expiresOn: '2026-11-14', valueCents: 55707660 }],
      expired: [],
      expiringDays: 7,
    } as unknown as OwnerDashboardData['stockAlerts'],
    supplierRecovery: {
      range,
      recoveredCents: 0,
      discountedCents: 0,
      replacedCents: 0,
      pendingCents: 34200,
      lostCents: 20784,
      scrappedCents: 0,
      unrecognizedCents: 0,
      inventoryLossCents: 20784,
    },
  }
}

const meta = {
  business: 'Distribuidora del Sur',
  scope: 'Todo el negocio · 2 almacenes',
  generatedAt: '13 nov 2026, 20:29',
  generatedBy: 'Marco Reyes',
}
const build = (kind: PdfKind, from: string, to: string) =>
  buildPdfReport(kind, dashboard({ from, to }), meta)
const titles = (report: ReturnType<typeof build>) =>
  report.sections.map((section) => section.title)
const section = (report: ReturnType<typeof build>, start: string) => {
  const found = report.sections.find((item) => item.title.startsWith(start))
  if (!found) throw new Error(`no section ${start}`)
  return found
}

describe('buildPdfReport', () => {
  test('the day report is a closing sheet', () => {
    const report = build('day', '2026-11-13', '2026-11-13')
    expect(report.heading).toBe(
      'Cierre del día · viernes 13 de noviembre de 2026',
    )
    expect(report.filename).toBe('abasto-reporte-dia-2026-11-13.pdf')
    expect(report.lines).toEqual([
      'Distribuidora del Sur · Todo el negocio · 2 almacenes',
      'Generado 13 nov 2026, 20:29 por Marco Reyes',
    ])
    expect(titles(report)).toEqual([
      '1. Resultado',
      '2. Ventas por almacén',
      '3. Productos con más ventas',
      '4. Cortes de caja',
      '5. Repartos con diferencia',
      '6. Alertas de inventario al generar el reporte',
    ])
    expect(section(report, '1.').rows).toEqual([
      ['Ventas', '$6,436.58'],
      ['Utilidad bruta', '$1,500.27'],
      ['Margen', '23.3 %'],
      ['Tickets', '4'],
      ['Ticket promedio', '$1,609.15'],
    ])
    expect(section(report, '2.').rows[0]).toEqual([
      'Arcelia',
      '$3,407.00',
      '$667.61',
      '19.6 %',
      '2',
    ])
    expect(section(report, '2.').foot).toEqual([
      'Total',
      '$6,436.58',
      '$1,500.27',
      '23.3 %',
      '4',
    ])
    // Top ten by sales, best first.
    expect(section(report, '3.').rows).toHaveLength(10)
    expect(section(report, '3.').rows[0]).toEqual([
      'Producto 11',
      '10 pieza',
      '$120.00',
    ])
    expect(section(report, '4.').rows).toEqual([
      ['Arcelia', 'Miguel Cruz', '$2,038.34', '$1,988.34', '-$50.00'],
    ])
    expect(section(report, '5.')).toMatchObject({
      rows: [],
      empty: 'Ningún reparto liquidado tuvo faltante ni sobrante.',
    })
    expect(section(report, '6.').rows).toEqual([
      ['Lotes vencidos con existencia', '0'],
      ['Lotes que caducan en 7 días', '1 ($557,076.60 a costo)'],
      ['Productos con stock bajo', '1'],
    ])
  })

  test('the week report compares with the week before and lists each day', () => {
    const report = build('week', '2026-11-09', '2026-11-13')
    expect(report.heading).toBe('Reporte semanal · 9 al 13 nov 2026')
    expect(report.filename).toBe('abasto-reporte-semana-2026-11-09.pdf')
    expect(report.lines[1]).toBe('Comparado con 1 al 13 oct')
    expect(titles(report)).toEqual([
      '1. Resultado',
      '2. Ventas por día',
      '3. Por almacén',
      '4. Por proveedor',
      '5. Productos con más utilidad',
      '6. Cortes de caja',
      '7. Repartos con diferencia',
      '8. Proveedores',
      '9. Inventario al generar el reporte',
      '10. Capital sin venta en 30 días',
    ])
    expect(section(report, '1.').head).toEqual([
      'Concepto',
      'Semana',
      'Semana anterior',
      'Cambio',
    ])
    expect(section(report, '1.').rows[0]).toEqual([
      'Ventas',
      '$6,436.58',
      '$5,740.00',
      '+12.1 %',
    ])
    expect(section(report, '1.').rows[3]).toEqual(['Tickets', '4', '5', '-1'])
    const days = section(report, '2.').rows
    expect(days).toHaveLength(5)
    expect(days[0]).toEqual(['Lun 9', '$2,436.58', '$1,218.29', '1'])
    expect(days[1]).toEqual(['Mar 10', '$0.00', '$0.00', '0'])
    expect(section(report, '5.').rows).toHaveLength(10)
    expect(section(report, '6.').head?.[0]).toBe('Día')
    expect(section(report, '8.').rows).toContainEqual([
      'Pendiente, a hoy',
      '$342.00',
    ])
    expect(section(report, '9.').foot).toEqual(['Total', '$1,350,952.65'])
    // Five largest only; the month lists them all.
    expect(section(report, '10.').rows).toHaveLength(5)
  })

  test('the month report groups sales by week and lists every product', () => {
    const report = build('month', '2026-11-01', '2026-11-13')
    expect(report.heading).toBe('Reporte mensual · Noviembre 2026')
    expect(report.filename).toBe('abasto-reporte-mes-2026-11.pdf')
    expect(report.lines[1]).toBe(
      'Datos del 1 al 13 nov 2026 · Comparado con 1 al 13 oct',
    )
    expect(section(report, '2.').title).toBe('2. Ventas por semana')
    expect(section(report, '2.').rows).toEqual([
      ['1 nov', '$0.00', '$0.00', '0'],
      ['2 al 8 nov', '$1,000.00', '$500.00', '1'],
      ['9 al 13 nov', '$5,436.58', '$2,718.29', '3'],
    ])
    expect(section(report, '5.').title).toBe(
      '5. Productos, de mayor a menor utilidad',
    )
    expect(section(report, '5.').rows).toHaveLength(12)
    expect(section(report, '10.').rows).toHaveLength(7)
  })
})
