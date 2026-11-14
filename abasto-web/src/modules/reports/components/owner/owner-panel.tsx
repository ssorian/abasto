import type { ComponentProps } from 'react'

import { cn } from '#/lib/utils/cn'

/** White card of the owner dashboard. */
export function Panel({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-[14px] border border-border bg-card', className)}
      {...props}
    />
  )
}

/** Small uppercase title of a column, with a plain-words note beside it. */
export function ColumnHeading({
  id,
  title,
  note,
}: {
  id: string
  title: string
  note?: string
}) {
  return (
    <div className="flex min-h-[22px] flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <h2
        id={id}
        className="text-[13px] font-bold tracking-[0.6px] text-ink-heading uppercase"
      >
        {title}
      </h2>
      {note && (
        <span className="text-[13px] text-muted-foreground">{note}</span>
      )}
    </div>
  )
}

/** Label, figure and one supporting line. */
export function Figure({
  label,
  value,
  note,
  size = 'md',
  tone,
}: {
  label: string
  value: string
  note?: React.ReactNode
  size?: 'xl' | 'lg' | 'md'
  tone?: 'negative' | 'quiet'
}) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div
        className={cn(
          'leading-[1.15] font-bold tracking-[-0.8px] text-ink-figure tabular-nums',
          size === 'xl' && 'text-4xl tracking-[-1.2px]',
          size === 'lg' && 'text-[28px]',
          size === 'md' && 'text-[22px]',
          tone === 'negative' && 'text-destructive',
          tone === 'quiet' && 'text-muted-foreground',
        )}
      >
        {value}
      </div>
      {note && (
        <div className="mt-[3px] text-xs text-muted-foreground">{note}</div>
      )}
    </div>
  )
}

export const numericCell = 'text-right whitespace-nowrap tabular-nums'

/** Plain table of the dashboard: quiet header, hairline rows. */
export function PlainTable({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          'w-full border-collapse text-left text-[13px] text-ink-row [&_td]:border-b [&_td]:border-[#f4ede3] [&_td]:px-2.5 [&_td]:py-[9px] [&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th]:border-b [&_th]:border-border [&_th]:px-2.5 [&_th]:py-[7px] [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted-foreground [&_th:first-child]:pl-0 [&_th:last-child]:pr-0 [&_tr:last-child_td]:border-b-0',
          className,
        )}
        {...props}
      />
    </div>
  )
}
