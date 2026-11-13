import { Link } from '@tanstack/react-router'
import {
  ArchiveRestoreIcon,
  ChevronDownIcon,
  PackageSearchIcon,
  PencilIcon,
  TagIcon,
} from 'lucide-react'
import { DropdownMenu } from 'radix-ui'

import { CatalogButton } from '#/modules/catalog/components/catalog-button'

import type { ReactNode } from 'react'

type CatalogRowActionsProps = {
  productName: string
  /** Each action shows only when its handler is given. */
  onPrices?: () => void
  onEdit?: () => void
  onRestore?: () => void
}

const item =
  'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-[#3b2251] outline-none select-none data-[highlighted]:bg-[#f8f2ec]'

function Action({
  icon,
  children,
  onSelect,
}: {
  icon: ReactNode
  children: ReactNode
  onSelect: () => void
}) {
  return (
    <DropdownMenu.Item className={item} onSelect={onSelect}>
      {icon}
      {children}
    </DropdownMenu.Item>
  )
}

/** One "Acciones" button per catalog row that opens its actions. */
export function CatalogRowActions({
  productName,
  onPrices,
  onEdit,
  onRestore,
}: CatalogRowActionsProps) {
  const icon = 'size-4 text-[#927981]'
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <CatalogButton
          className="min-h-9 px-3"
          aria-label={`Acciones de ${productName}`}
        >
          Acciones
          <ChevronDownIcon className="size-4" />
        </CatalogButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-48 rounded-[10px] border border-[#efe8e0] bg-white p-1 shadow-[0_8px_24px_rgba(59,34,81,0.12)]"
        >
          {onRestore && (
            <Action
              icon={<ArchiveRestoreIcon className={icon} />}
              onSelect={onRestore}
            >
              Restaurar
            </Action>
          )}
          {onPrices && (
            <Action icon={<TagIcon className={icon} />} onSelect={onPrices}>
              Precios
            </Action>
          )}
          {onEdit && (
            <Action icon={<PencilIcon className={icon} />} onSelect={onEdit}>
              Editar
            </Action>
          )}
          <DropdownMenu.Item asChild className={item}>
            <Link to="/inventario" search={{ q: productName }}>
              <PackageSearchIcon className={icon} />
              Consultar inventario
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
