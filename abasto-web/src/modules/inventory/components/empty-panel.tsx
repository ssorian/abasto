import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { PackageIcon } from 'lucide-react'

type EmptyPanelProps = {
  title: string
  description: string
  icon?: LucideIcon
  children?: ReactNode
}

/** Empty list placeholder: dashed card with an icon, title, copy and an optional action. */
export function EmptyPanel({
  title,
  description,
  icon: Icon = PackageIcon,
  children,
}: EmptyPanelProps) {
  return (
    <div className="flex flex-col items-center gap-[15px] rounded-[14px] border border-dashed border-[#dbe5ef] bg-white px-[25px] py-[60px] text-center text-[#6b819b]">
      <Icon size={32} />
      <h3 className="text-[19px] text-[#294b73]">{title}</h3>
      <p className="text-sm">{description}</p>
      {children}
    </div>
  )
}
