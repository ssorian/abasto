import { useEffect, useMemo, useState } from 'react'

import { ProductFormDialog } from '#/modules/catalog/forms/product-form-dialog'
import { useCatalogActions } from '#/modules/catalog/hooks/use-catalog'
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
import { OrderTable } from '#/modules/inventory/forms/order-table'
import { useInventoryActions } from '#/modules/inventory/hooks/use-inventory-actions'
import { formatCents } from '#/modules/inventory/lib/cents'
import {
  orderInputFromDraft,
  orderTotalCents,
  supplierProducts,
} from '#/modules/inventory/lib/supplier-order-draft'
import type { OrderDraft } from '#/modules/inventory/lib/supplier-order-draft'
import type {
  CatalogProduct,
  CatalogSupplier,
} from '#/modules/catalog/lib/catalog-types'
import type { WarehouseOption } from '#/modules/inventory/types/stock'
import { hasWarehouseChoice } from '#/modules/warehouses/lib/warehouse-choice'

type OrderDialogProps = {
  /** Warehouses the actor manages. */
  warehouses: ReadonlyArray<WarehouseOption>
  initialWarehouseId: string
  suppliers: ReadonlyArray<CatalogSupplier>
  products: ReadonlyArray<CatalogProduct>
  /** Whether the actor may edit catalog products (owner). */
  canEditProducts: boolean
  onClose: () => void
}

/** Order to a supplier: its products and the boxes of each; price, discount and promotion come from the catalog. */
export function OrderDialog({
  warehouses,
  initialWarehouseId,
  suppliers,
  products,
  canEditProducts,
  onClose,
}: OrderDialogProps) {
  const actions = useInventoryActions()
  const catalogActions = useCatalogActions()
  const [draft, setDraft] = useState<OrderDraft>(() => ({
    supplierId: '',
    warehouseId: initialWarehouseId,
    expectedOn: '',
    reference: '',
    boxes: {},
  }))
  const [editingId, setEditingId] = useState<string>()
  const [query, setQuery] = useState('')
  const [standard, setStandard] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Standard prices are shown read-only; reload them for the receiving warehouse.
  useEffect(() => {
    let current = true
    void actions.loadStandardPrices(draft.warehouseId).then((prices) => {
      if (current) setStandard(prices)
    })
    return () => {
      current = false
    }
  }, [draft.warehouseId])

  const own = useMemo(
    () => supplierProducts(products, draft.supplierId, ''),
    [products, draft.supplierId],
  )
  const visible = useMemo(
    () => supplierProducts(products, draft.supplierId, query),
    [products, draft.supplierId, query],
  )
  const total = orderTotalCents(own, draft)

  async function submit() {
    const parsed = orderInputFromDraft(draft, own)
    if (!parsed.ok) return setError(parsed.message)
    setError(null)
    setPending(true)
    const saved = await actions.createOrder(parsed.value)
    setPending(false)
    if (saved) onClose()
  }

  const editing = products.find(({ id }) => id === editingId)

  return (
    <>
      <InventoryDialog
        title="Nuevo pedido al proveedor"
        eyebrow="POR RECIBIR"
        description="Elige el proveedor y escribe las cajas de cada producto. El precio por pieza, el descuento y la promoción vienen del catálogo y definen el costo neto. El pedido no mueve existencias: espera en «Por recibir» hasta que llegue y lo verifiques."
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
                onChange={(event) => {
                  setQuery('')
                  setDraft({
                    ...draft,
                    supplierId: event.target.value,
                    boxes: {},
                  })
                }}
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
            {hasWarehouseChoice(warehouses) && (
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
            )}
            <Field label="Fecha esperada de entrega (opcional)">
              <FieldInput
                type="date"
                value={draft.expectedOn}
                onChange={(event) =>
                  setDraft({ ...draft, expectedOn: event.target.value })
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
          {draft.supplierId ? (
            <>
              <SearchBox
                label="Buscar producto"
                placeholder="Buscar por nombre o SKU"
                value={query}
                onChange={setQuery}
              />
              {own.length ? (
                <OrderTable
                  products={visible}
                  boxes={draft.boxes}
                  standardByProductId={standard}
                  onBoxes={(productId, boxes) =>
                    setDraft((current) => ({
                      ...current,
                      boxes: { ...current.boxes, [productId]: boxes },
                    }))
                  }
                  onEdit={canEditProducts ? setEditingId : undefined}
                />
              ) : (
                <p className="py-6 text-center text-sm text-[#907e84]">
                  Este proveedor aún no tiene productos en el catálogo.
                </p>
              )}
            </>
          ) : (
            <p className="py-6 text-center text-sm text-[#907e84]">
              Selecciona un proveedor para ver sus productos.
            </p>
          )}
          {error && <FormError>{error}</FormError>}
          <DialogActions>
            <strong className="text-base text-[#5f4a51]">
              Total del pedido (neto): {formatCents(total)}
            </strong>
            <span className="flex gap-3">
              <ActionButton type="button" onClick={onClose}>
                Cancelar
              </ActionButton>
              <ActionButton tone="primary" type="submit" disabled={pending}>
                {pending ? 'Guardando…' : 'Registrar pedido'}
              </ActionButton>
            </span>
          </DialogActions>
        </form>
      </InventoryDialog>
      {canEditProducts && editing && (
        // Saving reloads the products, so the rows recalculate with the new discount and promotion.
        <ProductFormDialog
          key={editing.id}
          product={editing}
          suppliers={suppliers}
          onSubmit={(edited) => catalogActions.saveProduct(editing.id, edited)}
          onClose={() => setEditingId(undefined)}
        />
      )}
    </>
  )
}
