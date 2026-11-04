import type { ReactNode } from 'react'

type SectionRowProps = {
  title: string
  description: string
  children?: ReactNode
}

/** Section title with its help line and an optional control on the right. */
export function SectionRow({ title, description, children }: SectionRowProps) {
  return (
    <div className="mb-[23px] flex flex-col items-start gap-[13px] md:flex-row md:items-center md:justify-between md:gap-[15px]">
      <div>
        <h2 className="text-xl font-[650] tracking-[-0.4px]">{title}</h2>
        <p className="mt-[7px] text-xs text-[#8390a2]">{description}</p>
      </div>
      {children}
    </div>
  )
}
