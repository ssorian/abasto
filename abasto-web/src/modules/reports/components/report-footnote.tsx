import type { ReactNode } from 'react'

/** Small print that explains how the figures above are calculated. */
export function ReportFootnote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-[25px] max-w-[950px] text-[11px] leading-[1.8] text-ink-footnote">
      {children}
    </p>
  )
}
