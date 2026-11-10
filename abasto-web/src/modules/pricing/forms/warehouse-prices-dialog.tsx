import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ClientError, genericErrorMessage, unwrap } from '#/lib/boundary'
import { useCatalogActions } from '#/modules/catalog/hooks/use-catalog'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'
import { ProductPricesDialog } from '#/modules/pricing/forms/product-prices-dialog'
import { usePricingActions } from '#/modules/pricing/hooks/use-pricing'
import {
  joinProducts,
  pricesByProduct,
} from '#/modules/pricing/lib/price-table'
import type { ProductGroup } from '#/modules/pricing/lib/price-table'
import { pricingOverviewFn } from '#/modules/pricing/server/pricing'

type WarehousePricesDialogProps = {
  product: CatalogProduct
  warehouseId: string
  /** Owner or any warehouse manager (supplier cost is global). */
  canEditCost: boolean
  /** Called after the sale prices were saved, so the caller can reload what it shows. */
  onPricesSaved: () => void
  onClose: () => void
}

type Loaded = { group: ProductGroup; warehouseName: string; canEdit: boolean }

/**
 * Prices dialog for a product outside Catálogo (the supplier order row): it
 * loads the prices of the given warehouse itself, then behaves like the catalog one.
 */
export function WarehousePricesDialog({
  product,
  warehouseId,
  canEditCost,
  onPricesSaved,
  onClose,
}: WarehousePricesDialogProps) {
  const catalogActions = useCatalogActions()
  const pricingActions = usePricingActions(warehouseId)
  const [loaded, setLoaded] = useState<Loaded>()

  useEffect(() => {
    let current = true
    async function load() {
      try {
        const overview = unwrap(
          await pricingOverviewFn({ data: { warehouseId } }),
        )
        const warehouse = overview.warehouses.find(
          ({ id }) => id === warehouseId,
        )
        const group = pricesByProduct(
          joinProducts(overview.rows, [product]),
        ).get(product.id)
        if (!current) return
        if (!warehouse || !group) {
          toast.error('Este producto no tiene presentaciones activas.')
          return onClose()
        }
        setLoaded({
          group,
          warehouseName: warehouse.name,
          canEdit: warehouse.canManage,
        })
      } catch (failure) {
        if (!current) return
        toast.error(
          failure instanceof ClientError
            ? failure.message
            : genericErrorMessage,
        )
        onClose()
      }
    }
    void load()
    return () => {
      current = false
    }
  }, [warehouseId, product.id])

  if (!loaded) return null
  return (
    <ProductPricesDialog
      product={product}
      group={loaded.group}
      warehouseName={loaded.warehouseName}
      canEdit={loaded.canEdit}
      canEditCost={canEditCost}
      onSaveCost={(patch) => catalogActions.savePieceCost(product.id, patch)}
      onSavePrices={async (prices) => {
        const message = await pricingActions.savePrices(prices)
        if (message === null) onPricesSaved()
        return message
      }}
      onClose={onClose}
    />
  )
}
