import { Link } from '@tanstack/react-router'

import { useSidebar } from '#/components/ui/sidebar'
import { cn } from '#/lib/utils/cn'
import type { NavItem } from '#/config/navigation'

const itemClass =
  'flex w-full items-center gap-[13px] rounded-lg px-[15px] py-2.5 text-left text-sm text-sidebar-text hover:bg-sidebar-hover hover:text-white data-[status=active]:bg-primary data-[status=active]:font-bold data-[status=active]:text-sidebar-active data-[status=active]:hover:bg-primary data-[status=active]:hover:text-sidebar-active'

type SidebarNavItemProps = {
  item: NavItem
  iconSize?: number
  className?: string
}

export function SidebarNavItem({
  item,
  iconSize = 20,
  className,
}: SidebarNavItemProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const Icon = item.icon

  if (!item.to) {
    return (
      <button type="button" className={cn(itemClass, className)}>
        <Icon size={iconSize} />
        <span>{item.label}</span>
      </button>
    )
  }

  return (
    <Link
      to={item.to}
      className={cn(itemClass, className)}
      activeProps={{ 'aria-current': 'page' }}
      onClick={() => isMobile && setOpenMobile(false)}
    >
      <Icon size={iconSize} />
      <span>{item.label}</span>
    </Link>
  )
}
