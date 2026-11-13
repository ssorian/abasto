import { Link } from '@tanstack/react-router'
import { Store } from 'lucide-react'

import { BrandWordmark } from '#/components/brand-wordmark'
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
      <Link to="/">
        <BrandWordmark className="text-white" />
      </Link>
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
        <nav
          aria-label="Navegación principal"
          className="flex flex-col gap-[3px]"
        >
          {primaryNav.filter(visible).map((item) => (
            <SidebarNavItem key={item.label} item={item} />
          ))}
        </nav>
      </SidebarContent>

      <SidebarFooter className="px-4 pt-5 pb-5">
        {secondaryNav.filter(visible).map((item) => (
          <SidebarNavItem
            key={item.label}
            item={item}
            iconSize={19}
            className="mb-1.5 min-h-[46px] py-[13px] text-[13px]"
          />
        ))}
      </SidebarFooter>
    </Sidebar>
  )
}
