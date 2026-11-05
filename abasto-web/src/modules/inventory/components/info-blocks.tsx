import type { ComponentProps, ReactNode } from 'react'

import { cn } from '#/lib/utils/cn'

/** Blue note box (`.info-banner.compact`). */
export function InfoBanner({
  icon,
  className,
  children,
}: {
  icon?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'my-[15px] flex items-center gap-[13px] rounded-[9px] border border-[#e7deed] bg-[#f8f2ec] p-[13px] text-xs leading-[1.7] text-[#856972] max-md:items-start',
        className,
      )}
    >
      {icon}
      <p className="flex-1">{children}</p>
    </div>
  )
}

/** Muted explanatory paragraph (`.section-help`). */
export function SectionHelp({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'mt-3 mb-5 text-sm leading-[1.8] text-[#a49197] max-md:text-xs',
        className,
      )}
      {...props}
    />
  )
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-[8px] border border-[#f0ccc5] bg-[#fff0ed] p-[13px] text-[13px] leading-[1.6] text-[#b26357]"
    >
      {children}
    </p>
  )
}

export function WarningInline({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'mt-3 flex items-center gap-[9px] rounded-[7px] bg-[#fff7e0] p-3 text-xs leading-[1.7] text-[#a08442]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[8px] border border-[#d8ecdf] bg-[#edf7f2] p-3.5 text-xs leading-[1.7] text-[#4a917b]">
      {children}
    </div>
  )
}

/** Key/value rows for detail dialogs (`.info-pairs`). */
export function InfoPairs({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div>
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between gap-5 border-b border-[#f5f1ed] py-[13px] text-xs md:text-sm"
        >
          <span className="shrink-0 text-[#ab989e]">{label}</span>
          <b className="text-right font-[550] text-[#715860]">{value}</b>
        </div>
      ))}
    </div>
  )
}

/** Signed quantity coloured green/red (`.positive-text` / `.negative-text`). */
export function SignedQuantity({
  qty,
  className,
}: {
  qty: number
  className?: string
}) {
  return (
    <span
      className={cn(qty > 0 ? 'text-[#198567]' : 'text-[#c35850]', className)}
    >
      {qty > 0 ? '+' : ''}
      {qty}
    </span>
  )
}
