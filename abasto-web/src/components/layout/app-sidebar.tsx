import { Link } from '@tanstack/react-router'
import { CircleDashed, Store } from 'lucide-react'

import { SidebarNavItem } from '#/components/layout/sidebar-nav-item'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '#/components/ui/sidebar'
import { primaryNav, secondaryNav } from '#/config/navigation'
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
      <span className="flex h-[33px] w-[29px] shrink-0 items-center justify-center text-[#d1dfed]">
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

function DemoCallout() {
  return (
    <div className="mb-[22px] rounded-[9px] border border-sidebar-callout-border bg-sidebar-callout px-[15px] py-[18px]">
      <span className="flex items-center gap-1.5 text-xs font-[650] tracking-[1.3px] text-sidebar-tag">
        <CircleDashed size={14} />
        ESPACIO DE PRUEBA
      </span>
      <p className="mt-[11px] text-[13px] font-semibold text-[#e5eef8]">
        Explora sin preocuparte.
      </p>
      <small className="mt-1 block text-xs leading-[1.7] text-[#94aac3]">
        Tus operaciones se guardan en este navegador.
      </small>
    </div>
  )
}

export function AppSidebar() {
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
          {primaryNav.map((item) => (
            <SidebarNavItem key={item.label} item={item} />
          ))}
        </nav>
      </SidebarContent>

      <SidebarFooter className="px-4 pt-5 pb-0">
        <DemoCallout />
        {secondaryNav.map((item) => (
          <SidebarNavItem
            key={item.label}
            item={item}
            iconSize={19}
            className="mb-1.5 min-h-[46px] py-[13px] text-[13px]"
          />
        ))}
        <div className="mx-2 mt-[15px] flex justify-between border-t border-sidebar-divider py-[19px] text-xs text-[#8299b2]">
          <span>Hecho para tu negocio.</span>
          <span>v. demo</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
