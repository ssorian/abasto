import { businessTimeZone } from '#/modules/orders/services/clock'
import type {
  CashCutRow,
  LotAlertRow,
  LowStockRow,
  ProductSalesRow,
  SalesDimension,
  SalesRow,
} from '#/modules/reports/types/reports'
import { marginPercent } from '#/modules/reports/lib/margin'

type Cell = string | number | null | undefined

/** Quotes a value; neutralises leading formula characters (spreadsheet injection). */
function cell(value: Cell) {
  let text = String(value ?? '')
  const startsLikeFormula =
    /^\s*[=+@]/.test(text) ||
    (/^\s*-/.test(text) && !/^-\d+(?:\.\d+)?$/.test(text))
  if (startsLikeFormula) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

/** UTF-8 CSV with BOM so spreadsheets open the accents correctly. */
export function buildCsv(headings: Array<string>, rows: Array<Array<Cell>>) {
  return `\uFEFF${[headings, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')}`
}

/** Integer cents as an exact decimal string: -1005 → "-10.05". */
export function centsToDecimal(cents: number) {
  const abs = Math.abs(cents)
  const text = `${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
  return cents < 0 ? `-${text}` : text
}

const percentText = (margin: number, revenue: number) => {
  const value = marginPercent(margin, revenue)
  return value === null ? '' : value.toFixed(2)
}

const dimensionHeading: Record<SalesDimension, string> = {
  day: 'Día',
  product: 'Producto',
  customer: 'Cliente',
  channel: 'Canal',
  warehouse: 'Almacén',
}

export function salesCsv(
  dimension: SalesDimension,
  rows: ReadonlyArray<SalesRow | ProductSalesRow>,
) {
  return buildCsv(
    [
      dimensionHeading[dimension],
      'Pedidos',
      'Unidades base',
      'Ventas',
      'Costo',
      'Utilidad',
      'Margen %',
    ],
    rows.map((row) => [
      row.name,
      row.orders,
      row.units,
      centsToDecimal(row.revenueCents),
      centsToDecimal(row.costCents),
      centsToDecimal(row.marginCents),
      percentText(row.marginCents, row.revenueCents),
    ]),
  )
}

const businessDateTime = new Intl.DateTimeFormat('sv-SE', {
  timeZone: businessTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "YYYY-MM-DD HH:mm" in the business time zone. */
export const csvDateTime = (date: Date | null) =>
  date ? businessDateTime.format(date) : ''

export function cashCutsCsv(rows: ReadonlyArray<CashCutRow>) {
  return buildCsv(
    [
      'Almacén',
      'Estado',
      'Apertura',
      'Cierre',
      'Abrió',
      'Cerró',
      'Fondo inicial',
      'Ventas en efectivo',
      'Entradas',
      'Retiros',
      'Esperado',
      'Contado',
      'Diferencia',
    ],
    rows.map((row) => [
      row.warehouseName,
      row.status === 'open' ? 'Abierta' : 'Cerrada',
      csvDateTime(row.openedAt),
      csvDateTime(row.closedAt),
      row.openedByName,
      row.closedByName,
      centsToDecimal(row.openingCents),
      centsToDecimal(row.salesCents),
      centsToDecimal(row.entriesCents),
      centsToDecimal(row.withdrawalsCents),
      centsToDecimal(row.expectedCents),
      row.countedCents === null ? '' : centsToDecimal(row.countedCents),
      row.differenceCents === null ? '' : centsToDecimal(row.differenceCents),
    ]),
  )
}

export function lowStockCsv(rows: ReadonlyArray<LowStockRow>) {
  return buildCsv(
    ['Almacén', 'SKU', 'Producto', 'Disponible', 'Mínimo', 'Faltan', 'Unidad'],
    rows.map((row) => [
      row.warehouseName,
      row.sku,
      row.name,
      row.available,
      row.minimum,
      row.missing,
      row.unit,
    ]),
  )
}

export function lotsCsv(rows: ReadonlyArray<LotAlertRow>) {
  return buildCsv(
    [
      'Almacén',
      'SKU',
      'Producto',
      'Lote',
      'Caduca',
      'Días',
      'Existencia',
      'Apartado',
      'Unidad',
      'Valor al costo',
    ],
    rows.map((row) => [
      row.warehouseName,
      row.sku,
      row.name,
      row.lotCode,
      row.expiresOn,
      row.daysLeft,
      row.onHand,
      row.reserved,
      row.unit,
      centsToDecimal(row.valueCents),
    ]),
  )
}

/** Starts a browser download of a text file. */
export function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/csv;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
