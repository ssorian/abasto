import { createFileRoute } from '@tanstack/react-router'

import { InventoryPage } from '#/modules/inventory/components/inventory-page'

type InventorySearch = {
  /** Optional product query, e.g. from Catálogo "Consultar inventario". */
  q?: string
}

export const Route = createFileRoute('/inventario')({
  validateSearch: (search: Record<string, unknown>): InventorySearch =>
    typeof search.q === 'string' && search.q.trim() !== ''
      ? { q: search.q }
      : {},
  component: InventoryRoute,
})

function InventoryRoute() {
  const { q } = Route.useSearch()
  return <InventoryPage initialQuery={q ?? ''} />
}
