import { Link } from '@tanstack/react-router'
import { AlertTriangleIcon, ClockIcon } from 'lucide-react'

import { formatCents } from '#/modules/pricing/lib/money'
import { ReportCard } from '#/modules/reports/components/owner/chart-kit'
import type { StockAlertSummary } from '#/modules/reports/lib/owner-series'

/** What needs attention today across every warehouse. */
export function StockAlerts({
  summary,
  expiredCount,
  expiringDays,
}: {
  summary: StockAlertSummary
  expiredCount: number
  expiringDays: number
}) {
  const items = [
    summary.lowStockCount > 0 && {
      key: 'low',
      icon: <AlertTriangleIcon size={20} className="text-[#a77a24]" />,
      title: `${summary.lowStockCount} ${summary.lowStockCount === 1 ? 'producto con stock bajo' : 'productos con stock bajo'}`,
      note: summary.lowStockByWarehouse
        .map((item) => `${item.name} ${item.count}`)
        .join(' · '),
    },
    summary.expiringCount > 0 && {
      key: 'expiring',
      icon: <ClockIcon size={20} className="text-[#bd5754]" />,
      title: `${summary.expiringCount} ${summary.expiringCount === 1 ? 'lote caduca' : 'lotes caducan'} en ${expiringDays} días`,
      note: `${formatCents(summary.expiringValueCents)} a costo · el más próximo: ${summary.nextExpiry ?? '—'}`,
    },
    expiredCount > 0 && {
      key: 'expired',
      icon: <ClockIcon size={20} className="text-[#bd5754]" />,
      title: `${expiredCount} ${expiredCount === 1 ? 'lote vencido' : 'lotes vencidos'} con existencia`,
      note: 'Retíralos del inventario.',
    },
  ].filter((item) => item !== false)
  return (
    <ReportCard
      title="Alertas de stock"
      description="Todos los almacenes, hoy."
    >
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Sin alertas de stock por ahora.
        </p>
      ) : (
        <ul className="grid gap-3.5">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3">
              {item.icon}
              <div className="flex-1 text-sm text-ink-row">
                <strong>{item.title}</strong>
                <small className="mt-0.5 block text-[11px] text-muted-foreground">
                  {item.note}
                </small>
              </div>
              <Link
                to="/inventario"
                className="text-[13px] font-[650] text-ink-link hover:underline"
              >
                Ver
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ReportCard>
  )
}
