import type { ReactNode } from 'react'

import { cn } from '#/lib/utils/cn'

type Metric = { label: string; value: string; note?: ReactNode }

/** Row of labelled figures in one bordered card (`.ops-metrics`). */
export function MetricStrip({
  items,
  columns = 3,
}: {
  items: Array<Metric>
  /** Four columns become a two-by-two grid on phones. */
  columns?: 3 | 4
}) {
  return (
    <div
      className={cn(
        'my-[18px] grid rounded-xl border border-[#f0e9e1] bg-white',
        columns === 3
          ? 'grid-cols-1 md:grid-cols-3'
          : 'grid-cols-2 md:grid-cols-4',
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 p-4 md:px-4 md:py-[22px] md:not-first:border-l md:not-first:border-[#e5e9e2]"
        >
          <span className="mb-[9px] block text-[11px] text-[#90757e]">
            {item.label}
          </span>
          <strong className="block text-xl tracking-[-0.7px] text-ink-figure metrics:text-[23px]">
            {item.value}
          </strong>
          {item.note && (
            <small className="mt-[5px] block text-[10px] leading-[1.6] text-[#a38a92]">
              {item.note}
            </small>
          )}
        </div>
      ))}
    </div>
  )
}
