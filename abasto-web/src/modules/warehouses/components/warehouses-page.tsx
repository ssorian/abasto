import { PageHeading } from '#/components/page-heading'
import { WarehouseCard } from '#/modules/warehouses/components/warehouse-card'
import { warehouseSummaries } from '#/modules/warehouses/lib/warehouse-summary'

export function WarehousesPage() {
  return (
    <>
      <PageHeading
        eyebrow="ABARROTEROS · ALMACÉN"
        title="Almacenes"
        description="Cada existencia tiene un lugar."
      />
      <div className="grid grid-cols-1 gap-[15px] tablet:grid-cols-3 wide:gap-[22px]">
        {warehouseSummaries().map((warehouse) => (
          <WarehouseCard key={warehouse.name} warehouse={warehouse} />
        ))}
      </div>
    </>
  )
}
