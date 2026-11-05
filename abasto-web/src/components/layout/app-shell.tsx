import type { CSSProperties, ReactNode } from 'react'

import type { SessionUser } from '#/modules/access/lib/session-user'
import { AppFooter } from '#/components/layout/app-footer'
import { AppSidebar } from '#/components/layout/app-sidebar'
import { AppTopbar } from '#/components/layout/app-topbar'
import { SidebarInset, SidebarProvider } from '#/components/ui/sidebar'

const sidebarWidth = { '--sidebar-width': '15.125rem' } as CSSProperties

function SaveIndicator() {
  return (
    <p
      role="status"
      className="mb-3 flex items-center justify-end gap-[7px] text-[11px] text-[#627189] md:mb-[17px] md:text-xs"
    >
      <span className="size-1.5 rounded-full bg-saved" />
      Guardado en este navegador
    </p>
  )
}

export function AppShell({
  user,
  children,
}: {
  user: SessionUser
  children: ReactNode
}) {
  return (
    <SidebarProvider style={sidebarWidth}>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-background">
        <AppTopbar user={user} />
        <div className="mx-auto w-full max-w-[1640px] flex-1 px-3.5 py-[23px] phone:px-5 phone:pt-[25px] phone:pb-5 md:px-[26px] md:pt-[29px] wide:px-[38px] wide:pt-9 wide:pb-[22px]">
          <SaveIndicator />
          {children}
        </div>
        <AppFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}
