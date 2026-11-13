import { PageHeading } from '#/components/page-heading'
import { CreateWarehouseDialog } from '#/modules/warehouses/components/create-warehouse-dialog'
import { WarehouseCard } from '#/modules/warehouses/components/warehouse-card'
import type { WarehouseWithMetrics } from '#/modules/warehouses/server/warehouses'

type WarehousesPageProps = {
  warehouses: Array<WarehouseWithMetrics>
  canCreate: boolean
}

export function WarehousesPage({ warehouses, canCreate }: WarehousesPageProps) {
  return (
    <>
      <PageHeading
        title="Almacenes"
        description="Cada existencia tiene un lugar."
        actions={canCreate ? <CreateWarehouseDialog /> : undefined}
      />
      {warehouses.length ? (
        <div className="grid grid-cols-1 gap-[15px] tablet:grid-cols-3 wide:gap-[22px]">
          {warehouses.map((warehouse) => (
            <WarehouseCard key={warehouse.id} warehouse={warehouse} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-muted">
          {canCreate
            ? 'Aún no hay almacenes. Crea el primero.'
            : 'Aún no tienes almacenes asignados.'}
        </p>
      )}
    </>
  )
}
