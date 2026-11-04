import { useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

import { SidebarTrigger } from '#/components/ui/sidebar'
import { navItemForPath } from '#/config/navigation'
import { workspace } from '#/config/workspace'

export function AppTopbar() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const current = navItemForPath(pathname)

  return (
    <header className="flex h-[66px] shrink-0 items-center justify-between border-b border-topbar-border bg-white px-5 md:h-[77px] md:px-[26px] wide:px-[38px]">
      <div className="flex items-center gap-[7px] text-xs text-crumb md:gap-3">
        <SidebarTrigger className="-ml-1.5 text-crumb md:hidden" />
        <span className="hidden md:inline">{workspace.appName}</span>
        <ChevronRight size={14} className="text-[#9ba7b6]" />
        <strong className="font-[550] text-crumb-strong">
          {current?.label ?? ''}
        </strong>
      </div>

      <div className="flex items-center gap-2.5 tablet:gap-4">
        <span className="rounded-[5px] border border-pill-border bg-pill-bg px-[9px] py-[5px] text-xs text-pill">
          {workspace.demoVersion}
        </span>
        <span className="hidden h-7 w-px bg-[#e6eaf0] tablet:block" />
        <div className="hidden tablet:block">
          <strong className="block text-xs font-[650]">
            {workspace.user.name}
          </strong>
          <span className="mt-1 block text-xs text-[#8a96a5]">
            {workspace.user.role}
          </span>
        </div>
        <button
          type="button"
          aria-label="Cambiar perfil de demo"
          className="grid size-[31px] place-items-center rounded-full border-[3px] border-white bg-avatar-bg text-xs font-[750] text-avatar shadow-[0_0_0_1px_#dbe3ed] md:size-9"
        >
          {workspace.user.initials}
        </button>
      </div>
    </header>
  )
}
