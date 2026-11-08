import { formatCents } from '#/modules/pricing/lib/money'
import { topByMargin } from '#/modules/reports/lib/manager-chart-data'
import {
  CardEmpty,
  ManagerCard,
} from '#/modules/reports/components/manager/manager-card'
import type { ProductSalesRow } from '#/modules/reports/types/reports'

/** The five products that left the most gross profit in the period. */
export function TopProductsCard({ rows }: { rows: Array<ProductSalesRow> }) {
  const top = topByMargin(rows, 5)
  return (
    <ManagerCard
      title="Top productos"
      subtitle="Por utilidad bruta del periodo."
    >
      {top.length === 0 ? (
        <CardEmpty>Sin utilidad por producto en el periodo.</CardEmpty>
      ) : (
        <ol aria-label="Cinco productos con más utilidad en el periodo">
          {top.map((row) => (
            <li key={row.key} className="mb-3">
              <div className="flex justify-between gap-2 text-[13px] text-ink-row">
                <span>{row.name}</span>
                <strong className="tabular-nums">
                  {formatCents(row.marginCents)}
                </strong>
              </div>
              <div className="mt-[5px] h-2 rounded bg-[#f6efe6]">
                <div
                  className="h-2 rounded bg-[#5b2a86]"
                  style={{ width: `${row.widthPercent}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </ManagerCard>
  )
}
