import type { ReactNode } from 'react'

type PageHeadingProps = {
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeading({ title, description, actions }: PageHeadingProps) {
  return (
    <div className="mb-[22px] block items-center justify-between gap-5 md:mb-7 md:flex">
      <div>
        <h1 className="mb-1 text-[31px] leading-[1.3] font-bold tracking-[-1.2px] md:mb-[7px] wide:text-[34px]">
          {title}
        </h1>
        <p className="mt-[7px] text-[13px] leading-[1.6] text-ink-muted md:mt-0 md:text-sm">
          {description}
        </p>
      </div>
      {/* Rendered even when empty: the reference keeps its mobile spacing. */}
      <div className="mt-5 flex gap-2.5 md:mt-0">{actions}</div>
    </div>
  )
}
