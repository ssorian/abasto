import { useEffect, useMemo, useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  Field,
  FieldInput,
  FieldSelect,
  FormGrid,
} from '#/modules/inventory/components/form-controls'
import { FormError } from '#/modules/inventory/components/info-blocks'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { SearchBox } from '#/modules/inventory/components/search-box'
import { PurchaseEntryTable } from '#/modules/inventory/forms/purchase-entry-table'
import { useInventoryActions } from '#/modules/inventory/hooks/use-inventory-actions'
import { quantityPresentations } from '#/modules/inventory/lib/pack-info'
import {
  emptyRow,
  purchaseInputFromDraft,
} from '#/modules/inventory/lib/purchase-draft'
import type {
  PurchaseDraft,
  PurchaseEntryRow,
} from '#/modules/inventory/lib/purchase-draft'
import type {
  CatalogProduct,
  CatalogSupplier,
} from '#/modules/catalog/lib/catalog-types'
import type { WarehouseOption } from '#/modules/inventory/types/stock'

/** What the page needs after a purchase is saved. */
export type SavedPurchase = {
  purchaseId: string
  warehouseId: string
  lots: Array<{ productId: string; onHand: number; code: string }>
}

type PurchaseDialogProps = {
  /** Warehouses the actor manages. */
  warehouses: ReadonlyArray<WarehouseOption>
  initialWarehouseId: string
  suppliers: ReadonlyArray<CatalogSupplier>
  products: ReadonlyArray<CatalogProduct>
  today: string
  onClose: () => void
  onSaved: (purchase: SavedPurchase) => void
}

/** Purchase to a supplier: one list of every product; rows with boxes become one lot each. */
export function PurchaseDialog({
  warehouses,
  initialWarehouseId,
  suppliers,
  products,
  today,
  onClose,
  onSaved,
}: PurchaseDialogProps) {
  const actions = useInventoryActions()
  const [draft, setDraft] = useState<PurchaseDraft>(() => ({
    supplierId: '',
    warehouseId: initialWarehouseId,
    reference: '',
    purchasedOn: today,
    rows: {},
  }))
  const [query, setQuery] = useState('')
  const [standard, setStandard] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Standard prices prefill the sale price; reload them for the receiving warehouse.
  useEffect(() => {
    let current = true
    void actions.loadStandardPrices(draft.warehouseId).then((prices) => {
      if (current) setStandard(prices)
    })
    return () => {
      current = false
    }
  }, [draft.warehouseId])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle
      ? products.filter(
          (product) =>
            product.name.toLowerCase().includes(needle) ||
            product.sku.toLowerCase().includes(needle),
        )
      : products
  }, [products, query])

  const patchRow = (productId: string, patch: Partial<PurchaseEntryRow>) =>
    setDraft((current) => ({
      ...current,
      rows: {
        ...current.rows,
        [productId]: { ...(current.rows[productId] ?? emptyRow()), ...patch },
      },
    }))

  async function submit() {
    const parsed = purchaseInputFromDraft(
      draft,
      products.map((product) => ({
        ...product,
        presentations: quantityPresentations(product),
      })),
      standard,
    )
    if (!parsed.ok) return setError(parsed.message)
    setError(null)
    setPending(true)
    const saved = await actions.createPurchase(parsed.value)
    setPending(false)
    if (!saved) return
    onSaved({
      purchaseId: saved.data.id,
      warehouseId: draft.warehouseId,
      lots: saved.data.lots.map((lot) => ({
        productId: lot.productId,
        onHand: lot.onHand,
        code: lot.code,
      })),
    })
  }

  return (
    <InventoryDialog
      title="Nueva compra"
      eyebrow="ENTRADA DE MERCANCÍA"
      description="Escribe las cajas que llegaron de cada producto; los que dejes vacíos no se registran. El costo es el de todo el lote. El precio de salida empieza en el precio estándar y puedes subirlo, nunca bajarlo del costo por caja."
      size="wide"
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <FormGrid>
          <Field label="Proveedor">
            <FieldSelect
              value={draft.supplierId}
              onChange={(event) =>
                setDraft({ ...draft, supplierId: event.target.value })
              }
            >
              <option value="">Selecciona un proveedor</option>
              {suppliers
                .filter((supplier) => supplier.active)
                .map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
            </FieldSelect>
          </Field>
          <Field label="Almacén que recibe">
            <FieldSelect
              value={draft.warehouseId}
              onChange={(event) =>
                setDraft({ ...draft, warehouseId: event.target.value })
              }
            >
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </FieldSelect>
          </Field>
          <Field label="Fecha de la compra">
            <FieldInput
              type="date"
              value={draft.purchasedOn}
              onChange={(event) =>
                setDraft({ ...draft, purchasedOn: event.target.value })
              }
            />
          </Field>
        </FormGrid>
        <Field label="Folio o referencia (opcional)">
          <FieldInput
            value={draft.reference}
            onChange={(event) =>
              setDraft({ ...draft, reference: event.target.value })
            }
          />
        </Field>
        <SearchBox
          label="Buscar producto"
          placeholder="Buscar por nombre o SKU"
          value={query}
          onChange={setQuery}
        />
        <PurchaseEntryTable
          products={visible}
          rows={draft.rows}
          standardByProductId={standard}
          onChange={patchRow}
        />
        {error && <FormError>{error}</FormError>}
        <DialogActions>
          <ActionButton type="button" onClick={onClose}>
            Cancelar
          </ActionButton>
          <ActionButton tone="primary" type="submit" disabled={pending}>
            {pending ? 'Guardando…' : 'Registrar compra'}
          </ActionButton>
        </DialogActions>
      </form>
    </InventoryDialog>
  )
}
