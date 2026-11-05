import { Link } from '@tanstack/react-router'
import { Store } from 'lucide-react'

import { SidebarNavItem } from '#/components/layout/sidebar-nav-item'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '#/components/ui/sidebar'
import { primaryNav, secondaryNav } from '#/config/navigation'
import type { NavItem } from '#/config/navigation'
import type { SessionUser } from '#/modules/access/lib/session-user'
import { workspace } from '#/config/workspace'

function Brand() {
  return (
    <SidebarHeader className="pt-[31px] pr-4 pb-7 pl-[19px]">
      <Link
        to="/"
        className="flex items-center gap-[7px] text-[22px] font-[750] tracking-[-1.1px] whitespace-nowrap text-white"
      >
        <span className="relative flex w-[26px] items-center text-[35px] leading-[35px] font-black tracking-[-3px] text-primary">
          a<span className="absolute right-0 -bottom-[3px] text-[30px]">•</span>
        </span>
        <span>
          abarroteros<span className="text-primary">.</span>
        </span>
      </Link>
      <span className="mt-1.5 pl-[33px] text-xs tracking-[1px] text-sidebar-caption max-md:tracking-[0.5px]">
        {workspace.appName.toUpperCase()}
      </span>
    </SidebarHeader>
  )
}

function BusinessCard() {
  return (
    <div className="mb-[34px] flex items-center gap-2.5 rounded-[10px] border border-sidebar-surface-border bg-sidebar-surface px-2.5 py-[13px]">
      <span className="flex h-[33px] w-[29px] shrink-0 items-center justify-center text-[#e0d7e7]">
        <Store size={21} />
      </span>
      <div>
        <strong className="block text-xs font-semibold text-sidebar-strong">
          {workspace.business.name}
        </strong>
        <small className="mt-1 block text-xs text-sidebar-muted">
          {workspace.business.location}
        </small>
      </div>
    </div>
  )
}

export function AppSidebar({ user }: { user: SessionUser }) {
  const visible = (item: NavItem) => !item.ownerOnly || user.role === 'owner'
  return (
    <Sidebar>
      <Brand />

      <SidebarContent className="gap-0 px-4">
        <BusinessCard />
        <p className="mx-3 mb-[15px] text-xs font-semibold tracking-[1.8px] text-sidebar-label">
          OPERACIÓN
        </p>
        <nav
          aria-label="Navegación principal"
          className="flex flex-col gap-[3px]"
        >
          {primaryNav.filter(visible).map((item) => (
            <SidebarNavItem key={item.label} item={item} />
          ))}
        </nav>
      </SidebarContent>

      <SidebarFooter className="px-4 pt-5 pb-0">
        {secondaryNav.filter(visible).map((item) => (
          <SidebarNavItem
            key={item.label}
            item={item}
            iconSize={19}
            className="mb-1.5 min-h-[46px] py-[13px] text-[13px]"
          />
        ))}
        <div className="mx-2 mt-[15px] border-t border-sidebar-divider py-[19px] text-xs text-sidebar-label">
          <span>Hecho para tu negocio.</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
