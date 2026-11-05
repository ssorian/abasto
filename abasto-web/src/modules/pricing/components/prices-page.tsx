import { useMemo, useState } from 'react'

import { PageHeading } from '#/components/page-heading'
import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import type {
  CatalogProduct,
  CatalogSupplier,
} from '#/modules/catalog/lib/catalog-types'
import { PriceHistorySheet } from '#/modules/pricing/components/price-history-sheet'
import { PriceTable } from '#/modules/pricing/components/price-table'
import { PriceToolbar } from '#/modules/pricing/components/price-toolbar'
import { BulkChangeDialog } from '#/modules/pricing/forms/bulk-change-dialog'
import { usePricingActions } from '#/modules/pricing/hooks/use-pricing'
import {
  filterPriceRows,
  groupByProduct,
  joinProducts,
  pendingPrices,
} from '#/modules/pricing/lib/price-table'
import type {
  PriceFilters,
  PriceTableRow,
} from '#/modules/pricing/lib/price-table'
import type { PriceRow } from '#/modules/pricing/services/price-reads'

type PricesPageProps = {
  overview: {
    warehouses: Array<{ id: string; name: string; canManage: boolean }>
    selectedId: string | null
    rows: Array<PriceRow>
    margins: Record<string, number> | null
  }
  products: Array<CatalogProduct>
  suppliers: Array<CatalogSupplier>
  onSelectWarehouse: (id: string) => void
}

type HistoryTarget = {
  warehouseId: string
  presentationId: string
  title: string
}

export function PricesPage({
  overview,
  products,
  suppliers,
  onSelectWarehouse,
}: PricesPageProps) {
  const { warehouses, selectedId, margins } = overview
  const actions = usePricingActions(selectedId)
  const [filters, setFilters] = useState<PriceFilters>({
    query: '',
    supplierId: '',
    category: '',
  })
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<HistoryTarget>()
  const [bulkOpen, setBulkOpen] = useState(false)

  const selected = warehouses.find(({ id }) => id === selectedId)
  const managed = warehouses.filter(({ canManage }) => canManage)
  const rows = useMemo(
    () => joinProducts(overview.rows, products),
    [overview.rows, products],
  )
  const groups = groupByProduct(filterPriceRows(rows, filters))
  const categories = [...new Set(products.map(({ category }) => category))]
    .filter(Boolean)
    .sort()
  const pending = Object.values(edits).filter((text) => text.trim()).length

  function changeWarehouse(id: string) {
    setEdits({})
    setErrors({})
    onSelectWarehouse(id)
  }

  async function save() {
    const result = pendingPrices(rows, edits)
    setErrors(result.errors)
    if (Object.keys(result.errors).length || !result.prices.length) return
    if (await actions.savePrices(result.prices)) setEdits({})
  }

  function openHistory(row: PriceTableRow) {
    if (!selectedId) return
    setHistory({
      warehouseId: selectedId,
      presentationId: row.presentationId,
      title: `${row.productName} · ${row.presentationName}`,
    })
  }

  if (!selected) {
    return (
      <>
        <PageHeading
          eyebrow="ABARROTEROS · PRECIOS"
          title="Precios"
          description="Lista de precios por almacén."
        />
        <p className="text-sm text-ink-muted">
          Aún no tienes almacenes asignados.
        </p>
      </>
    )
  }

  return (
    <>
      <PageHeading
        eyebrow="ABARROTEROS · PRECIOS"
        title="Precios"
        description="Lista de precios vigente de cada almacén."
        actions={
          <>
            {selected.canManage && (
              <CatalogButton
                tone="primary"
                disabled={!pending}
                onClick={() => void save()}
              >
                {pending ? `Guardar ${pending} cambios` : 'Guardar cambios'}
              </CatalogButton>
            )}
            {managed.length > 0 && (
              <CatalogButton onClick={() => setBulkOpen(true)}>
                Cambio masivo
              </CatalogButton>
            )}
          </>
        }
      />
      <PriceToolbar
        warehouses={warehouses}
        warehouseId={selected.id}
        onWarehouseChange={changeWarehouse}
        filters={filters}
        onFiltersChange={setFilters}
        suppliers={suppliers}
        categories={categories}
      />
      {!selected.canManage && (
        <p className="mb-3 text-sm text-ink-muted">
          Solo lectura: los precios de este almacén los cambia su encargado.
        </p>
      )}
      {groups.length ? (
        <PriceTable
          groups={groups}
          canEdit={selected.canManage}
          edits={edits}
          errors={errors}
          onEdit={(id, text) =>
            setEdits((current) => ({ ...current, [id]: text }))
          }
          onHistory={openHistory}
          margins={margins}
          onSaveMargin={actions.saveMargin}
        />
      ) : (
        <p className="text-sm text-ink-muted">
          No hay productos que coincidan.
        </p>
      )}
      {history && (
        <PriceHistorySheet
          target={history}
          onClose={() => setHistory(undefined)}
        />
      )}
      {bulkOpen && (
        <BulkChangeDialog
          warehouses={managed}
          currentWarehouse={selected.canManage ? selected : undefined}
          rows={rows}
          suppliers={suppliers}
          categories={categories}
          products={products}
          onSubmit={actions.bulkChange}
          onClose={() => setBulkOpen(false)}
        />
      )}
    </>
  )
}
