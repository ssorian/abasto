import { cn } from '#/lib/utils/cn'

import type { ReactNode } from 'react'

/** "Activo" in green, "Inactivo" muted. */
export function StatusBadge({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'mt-1 flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold',
        active ? 'bg-[#e7f3e9] text-[#2f6b3c]' : 'bg-[#f1ecea] text-[#7d6a70]',
      )}
    >
      {children}
    </span>
  )
}
