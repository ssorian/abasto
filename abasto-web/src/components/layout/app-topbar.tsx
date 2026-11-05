import { useLocation, useRouter } from '@tanstack/react-router'
import { ChevronRight, LogOut } from 'lucide-react'

import { SidebarTrigger } from '#/components/ui/sidebar'
import { navItemForPath } from '#/config/navigation'
import { workspace } from '#/config/workspace'
import { authClient } from '#/lib/auth-client'
import type { SessionUser } from '#/modules/access/lib/session-user'

export function AppTopbar({ user }: { user: SessionUser }) {
  const router = useRouter()
  const pathname = useLocation({ select: (location) => location.pathname })
  const current = navItemForPath(pathname)

  return (
    <header className="flex h-[66px] shrink-0 items-center justify-between border-b border-topbar-border bg-white px-5 md:h-[77px] md:px-[26px] wide:px-[38px]">
      <div className="flex items-center gap-[7px] text-xs text-crumb md:gap-3">
        <SidebarTrigger className="-ml-1.5 text-crumb md:hidden" />
        <span className="hidden md:inline">{workspace.appName}</span>
        <ChevronRight size={14} className="text-[#b1a0a6]" />
        <strong className="font-[550] text-crumb-strong">
          {current?.label ?? ''}
        </strong>
      </div>

      <div className="flex items-center gap-2.5 tablet:gap-4">
        <div className="hidden tablet:block">
          <strong className="block text-xs font-[650]">{user.name}</strong>
          <span className="mt-1 block text-xs text-[#a08f95]">
            {user.roleLabel}
          </span>
        </div>
        <span
          aria-hidden
          className="grid size-[31px] place-items-center rounded-full border-[3px] border-white bg-avatar-bg text-xs font-[750] text-avatar shadow-[0_0_0_1px_#e7e1e3] md:size-9"
        >
          {user.initials}
        </span>
        <button
          type="button"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          onClick={() => {
            void authClient.signOut().then(() => router.invalidate())
          }}
          className="grid size-9 place-items-center rounded-full text-crumb hover:bg-[#faf6f1]"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  )
}
