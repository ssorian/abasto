import {
  formatBpsPercent,
  formatDeltaBps,
  formatDeltaCents,
} from '#/modules/executive/lib/format'
import { metricsOf } from '#/modules/executive/lib/profitability'
import type {
  MarginRow,
  WarehouseMetrics,
} from '#/modules/executive/types/profitability'
import { formatCents } from '#/modules/pricing/lib/money'
import {
  closedCashCuts,
  dailySeries,
  previousTotals,
  relativeChangeBps,
} from '#/modules/reports/lib/owner-series'
import type { DailyPoint } from '#/modules/reports/lib/owner-series'
import { monthLabel, weekdayLabel } from '#/modules/reports/lib/owner-view'
import { addDays, longRangeLabel } from '#/modules/reports/lib/period'
import type { ManagerDashboard } from '#/modules/reports/types/manager-dashboard'
import type { OwnerDashboardData } from '#/modules/reports/types/owner-dashboard'
import type {
  CashCuts,
  DateRange,
  StockAlerts,
} from '#/modules/reports/types/reports'

export type PdfKind = 'day' | 'week' | 'month'

/** One numbered block of the report: a table, or `empty` when it has no rows. */
export type PdfSection = {
  title: string
  head?: Array<string>
  rows: Array<Array<string>>
  /** Totals row, drawn in bold under the body. */
  foot?: Array<string>
  /** Said instead of the table when there are no rows. */
  empty?: string
  /** Small print under the table. */
  note?: string
}

/** A report ready to draw: plain strings only, so the renderer decides nothing. */
export type PdfReport = {
  kind: PdfKind
  heading: string
  /** Lines under the heading: scope, comparison, who generated it. */
  lines: Array<string>
  filename: string
  footer: string
  sections: Array<PdfSection>
}

export type PdfMeta = {
  business: string
  /** "Todo el negocio · 2 almacenes" or the selected warehouse and supplier. */
  scope: string
  /** Already formatted: "13 nov 2026, 20:29". */
  generatedAt: string
  generatedBy?: string
}

const longWeekdays = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
]
const topProducts = 10
const topIdle = 5

/** "2026-11-13" → "viernes 13 de noviembre de 2026". */
function longDay(date: string) {
  const weekday = longWeekdays[new Date(`${date}T12:00:00Z`).getUTCDay()]
  const [month, year] = monthLabel(date).toLowerCase().split(' ')
  return `${weekday} ${Number(date.slice(8))} de ${month} de ${year}`
}

const marginRow = (row: MarginRow) => [
  row.name,
  formatCents(row.revenueCents),
  formatCents(row.marginCents),
  formatBpsPercent(row.marginBps),
  String(row.orders),
]

const byRevenue = <T extends { revenueCents: number }>(
  rows: ReadonlyArray<T>,
) => [...rows].sort((a, b) => b.revenueCents - a.revenueCents)

function resultSection(
  kind: PdfKind,
  current: WarehouseMetrics,
  previous: WarehouseMetrics,
): PdfSection {
  if (kind === 'day') {
    return {
      title: 'Resultado',
      rows: [
        ['Ventas', formatCents(current.revenueCents)],
        ['Utilidad bruta', formatCents(current.marginCents)],
        ['Margen', formatBpsPercent(current.marginBps)],
        ['Tickets', String(current.tickets)],
        ['Ticket promedio', formatCents(current.averageTicketCents)],
      ],
    }
  }
  const signed = (value: number) => `${value > 0 ? '+' : ''}${value}`
  const money = (now: number, before: number) => [
    formatCents(now),
    formatCents(before),
    formatDeltaBps(relativeChangeBps(now, before), '%'),
  ]
  const period = kind === 'week' ? 'Semana' : 'Mes'
  return {
    title: 'Resultado',
    head: ['Concepto', period, `${period} anterior`, 'Cambio'],
    rows: [
      ['Ventas', ...money(current.revenueCents, previous.revenueCents)],
      ['Utilidad bruta', ...money(current.marginCents, previous.marginCents)],
      [
        'Margen',
        formatBpsPercent(current.marginBps),
        formatBpsPercent(previous.marginBps),
        formatDeltaBps(
          current.marginBps === null || previous.marginBps === null
            ? null
            : current.marginBps - previous.marginBps,
          'pp',
        ),
      ],
      [
        'Tickets',
        String(current.tickets),
        String(previous.tickets),
        signed(current.tickets - previous.tickets),
      ],
      [
        'Ticket promedio',
        ...money(current.averageTicketCents, previous.averageTicketCents),
      ],
    ],
  }
}

const salesHead = ['Ventas', 'Utilidad', 'Tickets']
const salesCells = (points: ReadonlyArray<DailyPoint>) => [
  formatCents(points.reduce((sum, point) => sum + point.revenueCents, 0)),
  formatCents(points.reduce((sum, point) => sum + point.marginCents, 0)),
  String(points.reduce((sum, point) => sum + point.orders, 0)),
]

/** Days of the month grouped by calendar week (Monday to Sunday). */
function weeksOf(days: ReadonlyArray<DailyPoint>) {
  const weeks = new Map<string, Array<DailyPoint>>()
  for (const point of days) {
    const weekday = new Date(`${point.day}T12:00:00Z`).getUTCDay()
    const monday = addDays(point.day, -((weekday + 6) % 7))
    weeks.set(monday, [...(weeks.get(monday) ?? []), point])
  }
  return [...weeks.values()]
}

function timeSection(kind: PdfKind, days: Array<DailyPoint>): PdfSection {
  if (kind === 'week') {
    return {
      title: 'Ventas por día',
      head: ['Día', ...salesHead],
      rows: days.map((point) => [
        weekdayLabel(point.day),
        ...salesCells([point]),
      ]),
    }
  }
  const year = Number(days[0]?.day.slice(0, 4))
  return {
    title: 'Ventas por semana',
    head: ['Semana (lunes a domingo)', ...salesHead],
    rows: weeksOf(days).map((week) => [
      longRangeLabel(
        { from: week[0].day, to: week[week.length - 1].day },
        year,
      ),
      ...salesCells(week),
    ]),
  }
}

/** One warehouse needs no warehouse column. */
function cashSection(
  kind: PdfKind,
  cashCuts: CashCuts,
  oneWarehouse = false,
): PdfSection {
  const cuts = closedCashCuts(cashCuts.rows)
  const open = cashCuts.rows.length - cuts.length
  const total = cuts.reduce((sum, cut) => sum + cut.differenceCents, 0)
  const lead = [
    ...(kind === 'day' ? [] : ['Día']),
    ...(oneWarehouse ? [] : ['Almacén']),
  ]
  return {
    title: 'Cortes de caja',
    head: [...lead, 'Cerró', 'Esperado', 'Contado', 'Diferencia'],
    rows: cuts.map((cut) => [
      ...(kind === 'day' ? [] : [weekdayLabel(cut.day)]),
      ...(oneWarehouse ? [] : [cut.warehouseName]),
      cut.closedByName ?? '-',
      formatCents(cut.expectedCents),
      formatCents(cut.countedCents ?? 0),
      formatDeltaCents(cut.differenceCents),
    ]),
    foot:
      cuts.length > 1
        ? ['Total', ...lead.map(() => ''), '', '', formatDeltaCents(total)]
        : undefined,
    empty: 'No hay cortes cerrados en el periodo.',
    note:
      open > 0
        ? `${open} ${open === 1 ? 'caja sigue abierta y no se incluye' : 'cajas siguen abiertas y no se incluyen'}.`
        : undefined,
  }
}

function ridersSection(cashCuts: CashCuts, oneWarehouse = false): PdfSection {
  return {
    title: 'Repartos con diferencia',
    head: [
      'Repartidor',
      ...(oneWarehouse ? [] : ['Almacén']),
      'Entregas',
      'Faltante',
      'Sobrante',
      'Neto',
    ],
    rows: cashCuts.riderShortfalls.map((row) => [
      row.riderName,
      ...(oneWarehouse ? [] : [row.warehouseName]),
      String(row.deliveries),
      formatCents(row.shortfallCents),
      formatCents(row.surplusCents),
      formatDeltaCents(row.netCents),
    ]),
    empty: 'Ningún reparto liquidado tuvo faltante ni sobrante.',
  }
}

function alertRows(stock: StockAlerts) {
  const { expired, expiring, expiringDays, lowStock } = stock
  const value = expiring.reduce((sum, lot) => sum + lot.valueCents, 0)
  return [
    ['Lotes vencidos con existencia', String(expired.length)],
    [
      `Lotes que caducan en ${expiringDays} días`,
      expiring.length
        ? `${expiring.length} (${formatCents(value)} a costo)`
        : '0',
    ],
    ['Productos con stock bajo', String(lowStock.length)],
  ]
}

function periodSections(
  kind: 'week' | 'month',
  data: OwnerDashboardData,
): Array<PdfSection> {
  const { margin, supplierRecovery: money, inventory, nonMoving } = data
  const byProfit = [...margin.byProduct].sort(
    (a, b) => b.marginCents - a.marginCents,
  )
  const idle = [...nonMoving.rows].sort((a, b) => b.valueCents - a.valueCents)
  const head = ['Ventas', 'Utilidad', 'Margen', 'Tickets']
  return [
    {
      title: 'Por almacén',
      head: ['Almacén', ...head],
      rows: byRevenue(margin.byWarehouse).map(marginRow),
    },
    {
      title: 'Por proveedor',
      head: ['Proveedor', ...head],
      rows: byRevenue(margin.bySupplier).map(marginRow),
      note: 'Un ticket puede incluir productos de varios proveedores; los tickets por fila no suman el total.',
    },
    {
      title:
        kind === 'week'
          ? 'Productos con más utilidad'
          : 'Productos, de mayor a menor utilidad',
      head: ['Producto', 'Ventas', 'Utilidad', 'Margen'],
      rows: (kind === 'week' ? byProfit.slice(0, topProducts) : byProfit).map(
        (row) => marginRow(row).slice(0, 4),
      ),
    },
    cashSection(kind, data.cashCuts),
    ridersSection(data.cashCuts),
    {
      title: 'Proveedores',
      head: ['Concepto', 'Monto'],
      rows: [
        ['Recuperado', formatCents(money.recoveredCents)],
        ['   Descontado en pedidos', formatCents(money.discountedCents)],
        ['   Repuesto en mercadería', formatCents(money.replacedCents)],
        ['Pendiente, a hoy', formatCents(money.pendingCents)],
        ['Perdido', formatCents(money.lostCents)],
        ['   Merma de proveedor', formatCents(money.scrappedCents)],
        [
          '   No reconocido en devoluciones',
          formatCents(money.unrecognizedCents),
        ],
        ['   Pérdidas de inventario', formatCents(money.inventoryLossCents)],
      ],
    },
    {
      title: 'Inventario al generar el reporte',
      head: ['Almacén', 'Valor a costo'],
      rows: [...inventory.warehouses]
        .sort((a, b) => b.valueCents - a.valueCents)
        .map((row) => [row.name, formatCents(row.valueCents)])
        .concat(alertRows(data.stockAlerts)),
      foot: ['Total', formatCents(inventory.totalCents)],
      note: 'Es la foto del inventario al generar el reporte; no depende del periodo.',
    },
    {
      title: `Capital sin venta en ${nonMoving.days} días`,
      head: ['Producto', 'Almacén', 'Existencia', 'Valor a costo'],
      rows: (kind === 'week' ? idle.slice(0, topIdle) : idle).map((row) => [
        row.name,
        row.warehouseName,
        `${row.onHand} ${row.unit}`,
        formatCents(row.valueCents),
      ]),
      foot: ['Total', '', '', formatCents(nonMoving.totalCents)],
      empty: 'Todo el inventario tuvo venta.',
      note:
        kind === 'week' && idle.length > topIdle
          ? `Los ${topIdle} mayores de ${idle.length}; el reporte mensual los lista todos.`
          : undefined,
    },
  ]
}

function daySections(data: OwnerDashboardData): Array<PdfSection> {
  const { margin } = data
  const { summary } = margin
  return [
    {
      title: 'Ventas por almacén',
      head: ['Almacén', 'Ventas', 'Utilidad', 'Margen', 'Tickets'],
      rows: byRevenue(margin.byWarehouse).map(marginRow),
      foot: [
        'Total',
        formatCents(summary.revenueCents),
        formatCents(summary.marginCents),
        formatBpsPercent(summary.marginBps),
        String(summary.orders),
      ],
    },
    {
      title: 'Productos con más ventas',
      head: ['Producto', 'Unidades', 'Ventas'],
      rows: byRevenue(margin.byProduct)
        .slice(0, topProducts)
        .map((row) => [
          row.name,
          `${row.units} ${row.unit}`,
          formatCents(row.revenueCents),
        ]),
    },
    cashSection('day', data.cashCuts),
    ridersSection(data.cashCuts),
    {
      title: 'Alertas de inventario al generar el reporte',
      rows: alertRows(data.stockAlerts),
    },
  ]
}

type Assembly = {
  kind: PdfKind
  range: DateRange
  previousRange: DateRange
  orders: number
  result: PdfSection
  body: Array<PdfSection>
  meta: PdfMeta
}

/** Heading, numbering and filename shared by the owner and manager reports. */
function assemble({
  kind,
  range,
  previousRange,
  orders,
  result,
  body,
  meta,
}: Assembly): PdfReport {
  const compared = `Comparado con ${longRangeLabel(previousRange, Number(range.to.slice(0, 4)))}`
  const generated = `Generado ${meta.generatedAt}${meta.generatedBy ? ` por ${meta.generatedBy}` : ''}`
  const scope = `${meta.business} · ${meta.scope}`
  const noSales: PdfSection = {
    title: 'Ventas',
    rows: [],
    empty: 'No hay pedidos entregados en el periodo.',
  }
  // Without sales the sales tables say nothing; cash, suppliers and stock stay.
  const sections = (
    orders > 0
      ? [result, ...body]
      : [noSales, ...body.filter((section) => !salesTitles.has(section.title))]
  ).map((section, index) => ({
    ...section,
    title: `${index + 1}. ${section.title}`,
  }))
  const shared = { kind, footer: `Abasto · ${meta.business}`, sections }
  if (kind === 'day') {
    return {
      ...shared,
      heading: `Cierre del día · ${longDay(range.to)}`,
      lines: [scope, generated],
      filename: `abasto-reporte-dia-${range.to}.pdf`,
    }
  }
  if (kind === 'week') {
    return {
      ...shared,
      heading: `Reporte semanal · ${longRangeLabel(range)}`,
      lines: [scope, compared, generated],
      filename: `abasto-reporte-semana-${range.from}.pdf`,
    }
  }
  return {
    ...shared,
    heading: `Reporte mensual · ${monthLabel(range.from)}`,
    lines: [
      scope,
      `Datos del ${longRangeLabel(range)} · ${compared}`,
      generated,
    ],
    filename: `abasto-reporte-mes-${range.from.slice(0, 7)}.pdf`,
  }
}

/**
 * Turns the owner dashboard of one day, week or month into the report to
 * print. Only what the dashboard holds is reported; nothing is estimated.
 */
export function buildPdfReport(
  kind: PdfKind,
  data: OwnerDashboardData,
  meta: PdfMeta,
): PdfReport {
  const { margin, ranking } = data
  const current = metricsOf(
    margin.summary.revenueCents,
    margin.summary.costCents,
    margin.summary.orders,
  )
  const days = dailySeries(
    { range: data.sales.range, rows: data.sales.byDay },
    { range: data.previousSales.range, rows: data.previousSales.byDay },
  )
  return assemble({
    kind,
    range: margin.range,
    previousRange: ranking.previousRange,
    orders: margin.summary.orders,
    result: resultSection(kind, current, previousTotals(ranking.rows)),
    body:
      kind === 'day'
        ? daySections(data)
        : [timeSection(kind, days), ...periodSections(kind, data)],
    meta,
  })
}

function channelSection(sales: ManagerDashboard['sales']): PdfSection {
  return {
    title: 'Ventas por canal',
    head: ['Canal', 'Ventas', 'Utilidad', 'Margen', 'Tickets'],
    rows: byRevenue(sales.byChannel).map((row) => [
      row.name,
      formatCents(row.revenueCents),
      formatCents(row.marginCents),
      formatBpsPercent(
        metricsOf(row.revenueCents, row.costCents, row.orders).marginBps,
      ),
      String(row.orders),
    ]),
  }
}

function ordersSection(orders: ManagerDashboard['pendingOrders']): PdfSection {
  return {
    title: 'Pedidos a proveedor por recibir',
    head: ['Proveedor', 'Pedido', 'Llega', 'Total'],
    rows: orders.map((order) => [
      order.supplierName,
      order.code,
      order.expectedOn ? weekdayLabel(order.expectedOn) : 'Sin fecha',
      formatCents(order.totalCostCents),
    ]),
    empty: 'No hay pedidos pendientes con proveedores.',
    note: 'Al generar el reporte; no depende del periodo.',
  }
}

/**
 * The report of one warehouse for its manager: its sales, cash and stock,
 * without the supplier balances and whole inventory only the owner sees.
 */
export function buildManagerPdfReport(
  kind: PdfKind,
  data: ManagerDashboard,
  meta: PdfMeta,
): PdfReport {
  const { sales, previousSales } = data
  const totals = (report: typeof sales) =>
    metricsOf(
      report.summary.revenueCents,
      report.summary.costCents,
      report.summary.orders,
    )
  const days = dailySeries(
    { range: sales.range, rows: sales.byDay },
    { range: previousSales.range, rows: previousSales.byDay },
  )
  const products = byRevenue(sales.byProduct)
  const productSection: PdfSection = {
    title:
      kind === 'month'
        ? 'Productos, de mayor a menor venta'
        : 'Productos con más ventas',
    head: ['Producto', 'Unidades', 'Ventas', 'Utilidad'],
    rows: (kind === 'month' ? products : products.slice(0, topProducts)).map(
      (row) => [
        row.name,
        `${row.units} ${row.unit}`,
        formatCents(row.revenueCents),
        formatCents(row.marginCents),
      ],
    ),
  }
  const stock: PdfSection = {
    title:
      kind === 'day'
        ? 'Alertas de inventario al generar el reporte'
        : 'Inventario al generar el reporte',
    rows: alertRows(data.stock),
  }
  return assemble({
    kind,
    range: sales.range,
    previousRange: previousSales.range,
    orders: sales.summary.orders,
    result: resultSection(kind, totals(sales), totals(previousSales)),
    body: [
      ...(kind === 'day' ? [] : [timeSection(kind, days)]),
      channelSection(sales),
      productSection,
      cashSection(kind, data.cash, true),
      ridersSection(data.cash, true),
      stock,
      ordersSection(data.pendingOrders),
    ],
    meta,
  })
}
const salesTitles = new Set([
  'Ventas por día',
  'Ventas por semana',
  'Ventas por almacén',
  'Por almacén',
  'Por proveedor',
  'Productos con más ventas',
  'Productos con más utilidad',
  'Productos, de mayor a menor utilidad',
  'Productos, de mayor a menor venta',
  'Ventas por canal',
])
