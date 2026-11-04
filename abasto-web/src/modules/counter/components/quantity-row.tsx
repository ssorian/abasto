import type { ReactNode } from 'react'

/** Product line with its quantity inputs inside a stage form (`.ops-quantity-row`). */
export function QuantityRow({
  title,
  notes,
  children,
}: {
  title: string
  notes: Array<string>
  children: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-[10px] border-b border-[#e2e9df] py-[13px] md:flex-nowrap md:gap-5 [&>label]:md:max-w-[150px]">
      <span className="text-[13px] font-semibold max-md:basis-full md:flex-1">
        {title}
        {notes.map((note) => (
          <small
            key={note}
            className="mt-[5px] block text-[11px] font-normal text-[#81907f]"
          >
            {note}
          </small>
        ))}
      </span>
      {children}
    </div>
  )
}
