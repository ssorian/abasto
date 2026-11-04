import { businessDate } from '#/lib/utils/format'
import { unregistered } from '#/modules/reports/lib/constants'
import { eventAmounts } from '#/modules/reports/lib/sales'

import type {
  AgingRow,
  LossRow,
  SaleEvent,
} from '#/modules/reports/types/reports'

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

const cents = (value: number) => (value / 100).toFixed(2)

export function salesCsv(rows: ReadonlyArray<SaleEvent>) {
  return buildCsv(
    [
      'Fecha (Ciudad de México)',
      'Tipo',
      'Pedido',
      'Canal',
      'Cliente',
      'Promoción',
      'Producto',
      'SKU',
      'Almacén',
      'Recepción',
      'Lote',
      'Cantidad base',
      'Unidad base',
      'Presentación',
      'Equivalencia',
      'Costo por unidad base',
      'Precio acordado',
      'Precio neto',
      'Descuento %',
      'Venta neta',
      'Costo neto',
      'Utilidad bruta',
    ],
    rows.map((event) => {
      const amounts = eventAmounts(event)
      return [
        businessDate(new Date(event.date)),
        event.type,
        event.orderId,
        event.channel || unregistered,
        event.customer || unregistered,
        event.promotionName,
        event.productName,
        event.sku,
        event.warehouse,
        event.receiptId,
        event.lot,
        amounts.quantity,
        event.unit,
        event.presentationName || event.unit,
        event.priceFactor || 1,
        (event.unitCostCents / 100).toFixed(6),
        cents(event.unitPriceCents),
        cents(event.netUnitPriceCents),
        event.discountPct,
        cents(amounts.net),
        cents(amounts.cost),
        cents(amounts.profit),
      ]
    }),
  )
}

export function lossesCsv(rows: ReadonlyArray<LossRow>) {
  return buildCsv(
    [
      'Fecha CDMX',
      'Referencia',
      'SKU',
      'Producto',
      'Almacén',
      'Lote',
      'Motivo',
      'Cantidad base',
      'Unidad',
      'Costo histórico de baja',
      'Responsable',
      'Nota',
    ],
    rows.map((row) => [
      row.date,
      row.ref,
      row.sku,
      row.name,
      row.warehouse,
      row.lot,
      row.reason,
      row.quantity,
      row.unit,
      cents(row.costCents),
      row.actor,
      row.note,
    ]),
  )
}

export function agingCsv(rows: ReadonlyArray<AgingRow>) {
  const today = businessDate()
  return buildCsv(
    [
      'Consulta al',
      'SKU',
      'Producto',
      'Almacén',
      'Existencia base',
      'Unidad',
      'Valor al costo',
      'Última venta registrada',
      'Primera entrada conocida',
      'Días desde venta o entrada',
      'Sin ventas registradas',
    ],
    rows.map((row) => [
      today,
      row.sku,
      row.name,
      row.warehouse,
      row.quantity,
      row.unit,
      cents(row.valueCents),
      row.lastSale,
      row.firstKnown,
      row.days,
      row.lastSale ? 'No' : 'Sí',
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
