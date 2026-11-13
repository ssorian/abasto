import {
  Boxes,
  ChartColumn,
  CircleQuestionMark,
  House,
  LayoutGrid,
  ScanLine,
  Settings2,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  /** Hide for staff; the route enforces the permission regardless. */
  ownerOnly?: boolean
  icon: LucideIcon
  /** Route path. Sections without a route yet render as inert items. */
  to?:
    | '/'
    | '/mostrador'
    | '/clientes'
    | '/catalogo'
    | '/inventario'
    | '/repartos'
    | '/almacenes'
    | '/configuracion'
    | '/reportes'
}

export const primaryNav: Array<NavItem> = [
  { label: 'Inicio', icon: House, to: '/' },
  { label: 'Ventas', icon: ScanLine, to: '/mostrador' },
  { label: 'Clientes', icon: Users, to: '/clientes' },
  { label: 'Catálogo', icon: LayoutGrid, to: '/catalogo' },
  { label: 'Inventario', icon: Boxes, to: '/inventario' },
  { label: 'Repartos', icon: Truck, to: '/repartos' },
  // A manager only sees their own warehouse there, which Inventario already shows.
  { label: 'Almacenes', icon: Warehouse, to: '/almacenes', ownerOnly: true },
  { label: 'Reportes', icon: ChartColumn, to: '/reportes' },
]

export const secondaryNav: Array<NavItem> = [
  {
    label: 'Configuración',
    icon: Settings2,
    to: '/configuracion',
    ownerOnly: true,
  },
  { label: 'Guía rápida', icon: CircleQuestionMark },
]

export function navItemForPath(pathname: string) {
  return [...primaryNav, ...secondaryNav].find((item) => item.to === pathname)
}
