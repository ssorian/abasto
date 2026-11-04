import {
  Boxes,
  ChartColumn,
  CircleQuestionMark,
  House,
  LayoutGrid,
  ScanLine,
  Settings2,
  Tags,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  icon: LucideIcon
  /** Route path. Sections without a route yet render as inert items. */
  to?: '/'
}

export const primaryNav: Array<NavItem> = [
  { label: 'Inicio', icon: House, to: '/' },
  { label: 'Mostrador', icon: ScanLine },
  { label: 'Clientes', icon: Users },
  { label: 'Cobros', icon: Wallet },
  { label: 'Catálogo', icon: LayoutGrid },
  { label: 'Promociones', icon: Tags },
  { label: 'Inventario', icon: Boxes },
  { label: 'Almacenes', icon: Warehouse },
  { label: 'Reportes', icon: ChartColumn },
]

export const secondaryNav: Array<NavItem> = [
  { label: 'Configuración', icon: Settings2 },
  { label: 'Guía rápida', icon: CircleQuestionMark },
]

export function navItemForPath(pathname: string) {
  return [...primaryNav, ...secondaryNav].find((item) => item.to === pathname)
}
