import { formatCents } from '#/modules/pricing/lib/money'
import {
  CardEmpty,
  ManagerCard,
} from '#/modules/reports/components/manager/manager-card'
import type { SalesRow } from '#/modules/reports/types/reports'

/** Sales of the period by channel: Mostrador, Tienda and Reparto (liquidated deliveries). */
export function SalesByChannelCard({ rows }: { rows: Array<SalesRow> }) {
  const total = rows.reduce((sum, row) => sum + row.revenueCents, 0)
  return (
    <ManagerCard
      title="Ventas por canal"
      subtitle="Mostrador, tienda y repartos liquidados; suman las ventas de la caja."
    >
      {rows.length === 0 ? (
        <CardEmpty>Sin ventas por canal en el periodo.</CardEmpty>
      ) : (
        <ul aria-label="Ventas por canal">
          {rows.map((row) => (
            <li key={row.key} className="mb-3">
              <div className="flex justify-between gap-2 text-[13px] text-ink-row">
                <span>
                  {row.name} · {row.orders}{' '}
                  {row.orders === 1 ? 'venta' : 'ventas'}
                </span>
                <strong className="tabular-nums">
                  {formatCents(row.revenueCents)}
                </strong>
              </div>
              <div className="mt-[5px] h-2 rounded bg-[#f6efe6]">
                <div
                  className="h-2 rounded bg-[#5b2a86]"
                  style={{
                    width: `${total ? Math.round((row.revenueCents * 100) / total) : 0}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </ManagerCard>
  )
}
