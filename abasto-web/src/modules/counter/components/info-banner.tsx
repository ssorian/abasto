import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '#/lib/utils/cn'

type InfoBannerProps = {
  icon: LucideIcon
  title: string
  children: string
  className?: string
}

/** Blue highlighted banner at the top of each Mostrador tab. */
export function InfoBanner({
  icon: Icon,
  title,
  children,
  className,
}: InfoBannerProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-[14px] border border-[#dce5ef] bg-[#f1f6fb] p-4 text-[#254b78] md:items-center md:px-[23px] md:py-5',
        className,
      )}
    >
      <Icon size={24} className="shrink-0" />
      <div>
        <strong className="text-[15px]">{title}</strong>
        <p className="mt-1 text-xs leading-[1.7] text-[#71859e] md:text-[13px]">
          {children}
        </p>
      </div>
    </div>
  )
}

/** Muted explanatory paragraph (`.section-help`). */
export function SectionHelp({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <p
      data-section-help
      className={cn(
        'mt-3 mb-5 text-sm leading-[1.8] text-[#8b99aa]',
        className,
      )}
    >
      {children}
    </p>
  )
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-[#f0ccc5] bg-[#fff0ed] p-[13px] text-[13px] leading-[1.6] text-[#b26357]"
    >
      {children}
    </p>
  )
}

export function WarningInline({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 flex items-center gap-[9px] rounded-[7px] bg-[#fff7e0] p-3 text-xs leading-[1.7] text-[#a08442]">
      {children}
    </p>
  )
}
