import type { ReactNode } from 'react'

import { cn } from '#/lib/utils/cn'

const shell =
  'flex flex-col items-center gap-[15px] rounded-[14px] border border-dashed border-[#e6dfeb] bg-white px-[25px] py-[60px] text-center text-[#91757e]'

/** Dashed placeholder shown when a report has nothing to list. */
export function ReportEmpty({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={cn(shell, className)}>{children}</div>
}
