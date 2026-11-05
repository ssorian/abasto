import type { ReactNode } from 'react'

type SectionRowProps = {
  title: string
  description: string
  action?: ReactNode
}

/** Heading of a tab panel with an optional action (`.section-row`). */
export function SectionRow({ title, description, action }: SectionRowProps) {
  return (
    <div className="mb-[23px] flex items-center justify-between gap-[15px] max-md:items-start">
      <div>
        <h2 className="text-[19px] font-[650] tracking-[-0.4px] md:text-xl">
          {title}
        </h2>
        <p className="mt-[7px] text-xs text-[#9c898f] md:text-sm">
          {description}
        </p>
      </div>
      {action}
    </div>
  )
}
