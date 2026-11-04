import { businessDate } from '#/lib/utils/format'
import { ReportDialog } from '#/modules/reports/components/report-dialog'
import { formatMoney } from '#/modules/reports/lib/money'
import { eventAmounts } from '#/modules/reports/lib/sales'

import type { SaleEvent } from '#/modules/reports/types/reports'

/** Price, cost and profit of one sale or return, as they were recorded. */
export function OperationDetailDialog({
  event,
  onClose,
}: {
  event: SaleEvent
  onClose: () => void
}) {
  const amounts = eventAmounts(event)
  const rows: Array<[string, string]> = [
    ['Promoción', event.promotionName || 'Sin promoción'],
    ['Canal', event.channel || 'Sin registrar'],
    ['Cliente', event.customer || 'Sin registrar'],
    ['Lote', event.lot || 'Sin lote'],
    ['Recepción', event.receiptId],
    ['Almacén', event.warehouse],
    ['Cantidad', `${event.quantity} ${event.unit}`],
    ['Precio por presentación', formatMoney(event.unitPriceCents)],
    [
      'Presentación',
      `${event.presentationName || event.unit} · ${event.priceFactor || 1} ${event.unit}`,
    ],
    ['Descuento', `${event.discountPct}%`],
    ['Precio neto unitario', formatMoney(event.netUnitPriceCents)],
    ['Costo unitario original', formatMoney(event.unitCostCents)],
    ['Venta neta', formatMoney(amounts.net)],
    ['Costo neto', formatMoney(amounts.cost)],
    ['Utilidad bruta', formatMoney(amounts.profit)],
  ]

  return (
    <ReportDialog
      title={`Detalle de ${event.type.toLowerCase()}`}
      description={`${event.orderId} · ${businessDate(new Date(event.date))}`}
      onClose={onClose}
    >
      <h3 className="my-2.5 text-[17px] font-semibold text-[#193c67]">
        {event.productName}
      </h3>
      <div>
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between gap-5 border-b border-[#edf1f5] py-[13px] text-xs md:text-sm"
          >
            <span className="shrink-0 text-[#91a0b2]">{label}</span>
            <b className="text-right font-[550] text-[#496480]">{value}</b>
          </div>
        ))}
      </div>
      <p className="mt-3 mb-5 text-xs leading-[1.8] text-[#8b99aa] md:text-sm">
        El registro conserva los valores de la operación. Editar precios
        actuales no modifica este resultado.
      </p>
    </ReportDialog>
  )
}
