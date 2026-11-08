import { formatCents } from '#/modules/pricing/lib/money'
import type { OverviewMetric } from '#/modules/overview/components/overview-metrics'
import type { Overview } from '#/modules/overview/types/overview'

/** The headline figures; money only for those who manage a warehouse. */
export function metricsOf(overview: Overview): Array<OverviewMetric> {
  const { totals, warehouses } = overview
  const open = { label: 'Pedidos abiertos', value: String(totals.openOrders) }
  if (totals.salesCents !== undefined && totals.marginCents !== undefined) {
    return [
      { label: 'Ventas de hoy', value: formatCents(totals.salesCents) },
      {
        label: 'Utilidad bruta de hoy',
        value: formatCents(totals.marginCents),
      },
      open,
    ]
  }
  return [
    { label: 'Entregas de hoy', value: String(totals.pickedUpToday) },
    open,
    {
      label: 'Pedidos que vencen hoy',
      value: String(totals.expiringTodayOrders),
    },
    {
      label: 'Cajas abiertas',
      value: `${totals.drawersOpen} de ${warehouses.length}`,
    },
  ]
}
