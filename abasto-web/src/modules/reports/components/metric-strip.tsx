import type { ReactNode } from 'react'

type Metric = { label: string; value: string; note?: ReactNode }

/** Row of labelled figures in one bordered card. */
export function MetricStrip({ items }: { items: Array<Metric> }) {
  return (
    <div className="my-[18px] grid grid-cols-1 rounded-xl border border-[#e1e8f0] bg-white md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 p-4 md:px-4 md:py-[22px] md:not-first:border-l md:not-first:border-[#e5e9e2]"
        >
          <span className="mb-[9px] block text-[11px] text-[#6c8199]">
            {item.label}
          </span>
          <strong className="block text-xl tracking-[-0.7px] text-ink-figure metrics:text-[23px]">
            {item.value}
          </strong>
          {item.note && (
            <small className="mt-[5px] block text-[10px] leading-[1.6] text-[#8195ac]">
              {item.note}
            </small>
          )}
        </div>
      ))}
    </div>
  )
}
