import type { ReactNode } from 'react'

const shell =
  'flex flex-col items-center gap-[15px] rounded-[14px] border border-dashed border-[#e6dfeb] bg-white px-[25px] py-[60px] text-center text-[#91757e]'

/** Dashed empty state. With an icon the message is a 14px paragraph; without, plain text. */
export function EmptyState({
  icon,
  children,
}: {
  icon?: ReactNode
  children: ReactNode
}) {
  if (!icon) return <p className={shell}>{children}</p>

  return (
    <div className={shell}>
      {icon}
      <p className="text-sm">{children}</p>
    </div>
  )
}
