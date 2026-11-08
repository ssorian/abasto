import type { ReactNode } from 'react'

import { ChartTooltipContent } from '#/components/ui/chart'
import { cn } from '#/lib/utils/cn'
import { formatCents } from '#/modules/pricing/lib/money'

/** Series colors of the owner dashboard (design/system.md). */
export const chartColors = {
  sales: '#c81d4e',
  profit: '#5b2a86',
  previous: '#938789',
  idle30: '#557caa',
  idle60: '#a77a24',
  idle90: '#bd5754',
  surplus: '#39816e',
  shortage: '#bd5754',
} as const

/** Colors for groups without a fixed meaning (suppliers), most important first. */
export const groupColors = [
  '#c81d4e',
  '#5b2a86',
  '#557caa',
  '#a77a24',
  '#39816e',
  '#85909e',
]

/** Tooltip that prints cents as pesos with centavos. */
export function MoneyTooltip({
  labelFormatter,
}: {
  labelFormatter?: (label: ReactNode) => ReactNode
}) {
  return (
    <ChartTooltipContent
      labelFormatter={labelFormatter}
      formatter={(value, name, item) => (
        <>
          <span
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ background: item.color ?? item.payload?.fill }}
          />
          <span className="flex-1 text-muted-foreground">{name}</span>
          <span className="font-medium text-ink-figure tabular-nums">
            {formatCents(Number(value))}
          </span>
        </>
      )}
    />
  )
}

type LegendItem = {
  label: string
  color: string
  dashed?: boolean
  line?: boolean
}

/** Legend row above a chart, as drawn in the design. */
export function ChartLegendRow({ items }: { items: Array<LegendItem> }) {
  return (
    <ul className="mb-2.5 flex flex-wrap gap-x-[18px] gap-y-1 text-xs text-ink-row">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-[7px]">
          <i
            aria-hidden
            className={cn(
              'block',
              item.line
                ? 'h-0 w-4 border-t-[3px]'
                : 'size-[11px] rounded-[3px]',
              item.dashed && 'border-dashed',
            )}
            style={
              item.line
                ? { borderColor: item.color }
                : { background: item.color }
            }
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

/** Card with title, optional plain-language sentence and its figures. */
export function ReportCard({
  title,
  description,
  sentence,
  action,
  className,
  children,
}: {
  title: string
  description?: string
  /** One sentence in plain words about what the figures say. */
  sentence?: string | null
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-xl border border-[#f0e9e1] bg-white p-[22px]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[17px] font-[650] tracking-[-0.4px]">{title}</h2>
        {action}
      </div>
      {sentence && (
        <p className="mt-1.5 text-[13px] leading-[1.5] font-medium text-ink-row">
          {sentence}
        </p>
      )}
      {description && (
        <p className="mt-1.5 mb-4 text-xs text-ink-muted">{description}</p>
      )}
      {!description && <div className="mb-3" />}
      {children}
    </section>
  )
}
