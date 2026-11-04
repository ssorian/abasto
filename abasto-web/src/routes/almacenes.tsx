import { createFileRoute } from '@tanstack/react-router'

import { WarehousesPage } from '#/modules/warehouses/components/warehouses-page'

export const Route = createFileRoute('/almacenes')({
  component: WarehousesPage,
})
