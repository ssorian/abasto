import type { ReactNode } from 'react'

import { cn } from '#/lib/utils/cn'

/** Titled white panel of the manager dashboard. */
export function ManagerCard({
  title,
  subtitle,
  badge,
  className,
  children,
}: {
  title: string
  subtitle?: string
  badge?: ReactNode
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
        {badge}
      </div>
      {subtitle && (
        <p className="mt-1.5 mb-4 text-xs text-ink-muted">{subtitle}</p>
      )}
      {children}
    </section>
  )
}

const chipTones = {
  amber: 'bg-[#fff0d1] [&>i]:bg-[#a77a24]',
  green: 'bg-[#e9f4ef] [&>i]:bg-[#39816e]',
  red: 'bg-[#fbeae7] [&>i]:bg-[#bd5754]',
  blue: 'bg-[#e9f0fa] [&>i]:bg-[#557caa]',
  gray: 'bg-[#e9edf2] [&>i]:bg-[#85909e]',
}

/** Small status pill with a dot; the text always carries the meaning. */
export function Chip({
  tone,
  children,
}: {
  tone: keyof typeof chipTones
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-[650] whitespace-nowrap text-ink-row',
        chipTones[tone],
      )}
    >
      <i aria-hidden="true" className="block size-2 rounded-full" />
      {children}
    </span>
  )
}

/** Quiet line shown inside a card that has nothing to list. */
export function CardEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[10px] border border-dashed border-[#e6dfeb] px-4 py-6 text-center text-[13px] text-ink-muted">
      {children}
    </p>
  )
}
