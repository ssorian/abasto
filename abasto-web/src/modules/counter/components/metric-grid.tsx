import type { ReactNode } from 'react'

import { cn } from '#/lib/utils/cn'

type Metric = { label: string; value: string }

/** Row of labelled figures (`.ops-metrics`). */
export function MetricGrid({
  items,
  className,
}: {
  items: Array<Metric>
  className?: string
}) {
  return (
    <div
      className={cn(
        'my-[18px] grid grid-cols-2 rounded-xl border border-[#e1e8f0] bg-white md:grid-cols-4',
        className,
      )}
    >
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
        </div>
      ))}
    </div>
  )
}

/** Key/value rows for detail dialogs (`.info-pairs`). */
export function InfoPairs({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div>
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between gap-5 border-b border-[#edf1f5] py-[13px] text-xs"
        >
          <span className="shrink-0 text-[#91a0b2]">{label}</span>
          <b className="text-right font-[550] text-[#496480]">{value}</b>
        </div>
      ))}
    </div>
  )
}

/** Soft grey box with order or shift details (`.ops-details`). */
export function DetailsBox({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-[10px] bg-[#f5f8fc] px-[18px] py-4 text-[13px] leading-[1.8] whitespace-pre-line text-[#637c99] [&_b]:text-[#314f74]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Light panel that hosts an inline form step (`.ops-step`). */
export function StepPanel({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'my-[14px] flex flex-col gap-[18px] rounded-xl border border-[#d3e0ed] bg-[#f6f9fc] p-4 md:p-[21px]',
        className,
      )}
    >
      {children}
    </div>
  )
}
