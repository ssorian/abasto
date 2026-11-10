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
import {
  ListBody,
  ListCell,
  ListHead,
  ListPanel,
  ListRow,
  ListTable,
} from '#/modules/inventory/components/list-panel'
import { SearchBox } from '#/modules/inventory/components/search-box'
import { OrderTable } from '#/modules/inventory/forms/order-table'
import { useInventoryActions } from '#/modules/inventory/hooks/use-inventory-actions'
import { formatCents } from '#/modules/inventory/lib/cents'
import {
  discountIssue,
  discountsInput,
  discountTotalCents,
  orderTotalsText,
  toggleDiscount,
} from '#/modules/inventory/lib/order-discounts'
import {
  onlyWithBoxes,
  sortBelowMinimumFirst,
} from '#/modules/inventory/lib/order-rows'
import type { OrderStock } from '#/modules/inventory/lib/order-rows'
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
import type { PendingBalance } from '#/modules/inventory/services/supplier-pendings'
import type { WarehouseOption } from '#/modules/inventory/types/stock'
import { WarehousePricesDialog } from '#/modules/pricing/forms/warehouse-prices-dialog'
import { hasWarehouseChoice } from '#/modules/warehouses/lib/warehouse-choice'

type OrderDialogProps = {
  /** Warehouses the actor manages. */
  warehouses: ReadonlyArray<WarehouseOption>
  initialWarehouseId: string
  suppliers: ReadonlyArray<CatalogSupplier>
  products: ReadonlyArray<CatalogProduct>
  /** Whether the actor may edit catalog products (owner). */
  canEditProducts: boolean
  /** Open "Por reponer" balances of every supplier; the dialog keeps the chosen supplier's. */
  restock: ReadonlyArray<PendingBalance>
  onClose: () => void
}

/** Order to a supplier: its products and the boxes of each; price, discount and promotion come from the catalog. */
export function OrderDialog({
  warehouses,
  initialWarehouseId,
  suppliers,
  products,
  canEditProducts,
  restock,
  onClose,
}: OrderDialogProps) {
  const actions = useInventoryActions()
  const [draft, setDraft] = useState<OrderDraft>(() => ({
    supplierId: '',
    warehouseId: initialWarehouseId,
    expectedOn: '',
    reference: '',
    boxes: {},
  }))
  const [editingId, setEditingId] = useState<string>()
  const [query, setQuery] = useState('')
  const [onlyBoxes, setOnlyBoxes] = useState(false)
  // Undefined while loading, so rows neither warn nor show stock until they arrive.
  const [standard, setStandard] = useState<Record<string, number>>()
  const [stock, setStock] = useState<Record<string, OrderStock>>()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [reloadStandard, setReloadStandard] = useState(0)
  // Pending ids of the balances to discount; chosen only until the order is registered.
  const [discounted, setDiscounted] = useState<ReadonlyArray<string>>([])

  // Standard prices are shown read-only; reload them for the receiving warehouse.
  useEffect(() => {
    let current = true
    setStandard(undefined)
    void actions.loadStandardPrices(draft.warehouseId).then((prices) => {
      if (current) setStandard(prices)
    })
    return () => {
      current = false
    }
  }, [draft.warehouseId, reloadStandard])

  // Stock and minimums of the receiving warehouse; reloaded when it changes.
  useEffect(() => {
    let current = true
    setStock(undefined)
    void actions.loadWarehouseStock(draft.warehouseId).then((loaded) => {
      if (current) setStock(loaded)
    })
    return () => {
      current = false
    }
  }, [draft.warehouseId])

  const own = useMemo(
    () => supplierProducts(products, draft.supplierId, ''),
    [products, draft.supplierId],
  )
  const visible = useMemo(() => {
    const matching = supplierProducts(products, draft.supplierId, query)
    const shown = onlyBoxes ? onlyWithBoxes(matching, draft.boxes) : matching
    return sortBelowMinimumFirst(shown, stock)
  }, [products, draft.supplierId, draft.boxes, query, onlyBoxes, stock])
  const total = orderTotalCents(own, draft)
  const owedHere = useMemo(
    () => restock.filter((row) => row.supplierId === draft.supplierId),
    [restock, draft.supplierId],
  )
  const discountCents = discountTotalCents(owedHere, discounted)
  const tooMuch = discountIssue(total, discountCents)

  async function submit() {
    const parsed = orderInputFromDraft(draft, own)
    if (!parsed.ok) return setError(parsed.message)
    if (tooMuch) return setError(tooMuch)
    setError(null)
    setPending(true)
    const chosen = discountsInput(discounted)
    const saved = await actions.createOrder(
      chosen ? { ...parsed.value, discounts: chosen } : parsed.value,
      setError,
    )
    setPending(false)
    if (saved) onClose()
  }

  const editing = products.find(({ id }) => id === editingId)

  return (
    <>
      <InventoryDialog
        title="Nuevo pedido al proveedor"
        eyebrow="POR RECIBIR"
        description="Elige el proveedor y escribe las cajas de cada producto. El costo por pieza, el descuento y la promoción vienen del catálogo y definen el costo neto. El pedido no mueve existencias: espera en «Por recibir» hasta que llegue y lo verifiques."
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
                  setDiscounted([])
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
              {owedHere.length > 0 && (
                <section className="grid gap-2.5">
                  <h3 className="text-sm font-[650] text-[#5f4a51]">
                    Faltantes por reponer
                  </h3>
                  <p className="text-xs text-[#9c898f]">
                    Descontar cierra el faltante: su valor se resta del pago de
                    este pedido y las cajas ya no se esperan. Se aplica al
                    registrar el pedido.
                  </p>
                  <ListPanel>
                    <ListTable>
                      <ListHead>
                        {['Producto', 'Pedido', 'Debe', 'Valor', '']}
                      </ListHead>
                      <ListBody>
                        {owedHere.map((row) => {
                          const chosen = discounted.includes(row.pendingId)
                          return (
                            <ListRow key={row.pendingId}>
                              <ListCell>
                                <strong>{row.productName}</strong>
                              </ListCell>
                              <ListCell>{row.originCode}</ListCell>
                              <ListCell>
                                {row.owedBoxes}{' '}
                                {row.owedBoxes === 1 ? 'caja' : 'cajas'}
                              </ListCell>
                              <ListCell>
                                {formatCents(row.owedValueCents)}
                              </ListCell>
                              <ListCell>
                                <span className="flex justify-end">
                                  <ActionButton
                                    type="button"
                                    aria-pressed={chosen}
                                    className="min-h-9 px-3"
                                    tone={chosen ? 'primary' : 'secondary'}
                                    onClick={() =>
                                      setDiscounted((current) =>
                                        toggleDiscount(current, row.pendingId),
                                      )
                                    }
                                  >
                                    {chosen
                                      ? 'Descontado · Deshacer'
                                      : 'Descontar'}
                                  </ActionButton>
                                </span>
                              </ListCell>
                            </ListRow>
                          )
                        })}
                      </ListBody>
                    </ListTable>
                  </ListPanel>
                </section>
              )}
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[240px] flex-1">
                  <SearchBox
                    label="Buscar producto"
                    placeholder="Buscar por nombre o SKU"
                    value={query}
                    onChange={setQuery}
                  />
                </div>
                <button
                  type="button"
                  aria-pressed={onlyBoxes}
                  className={`min-h-[42px] rounded-[10px] border px-3.5 text-sm ${
                    onlyBoxes
                      ? 'border-[#785e67] bg-[#785e67] text-white'
                      : 'border-[#eee7e0] bg-white text-[#785e67] hover:bg-[#f4eef0]'
                  }`}
                  onClick={() => setOnlyBoxes((current) => !current)}
                >
                  Solo con cajas
                </button>
              </div>
              {own.length ? (
                <OrderTable
                  products={visible}
                  boxes={draft.boxes}
                  standardByProductId={standard}
                  stockByProductId={stock}
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
          {(error ?? tooMuch) && (
            <FormError>{error ?? tooMuch ?? ''}</FormError>
          )}
          <DialogActions>
            <strong className="text-base text-[#5f4a51]">
              {orderTotalsText(total, discountCents)}
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
        // Saving reloads the products, so the rows recalculate with the new amounts and typed boxes stay.
        <WarehousePricesDialog
          key={`${draft.warehouseId}:${editing.id}`}
          product={editing}
          warehouseId={draft.warehouseId}
          canEditCost={canEditProducts}
          onPricesSaved={() => setReloadStandard((count) => count + 1)}
          onClose={() => setEditingId(undefined)}
        />
      )}
    </>
  )
}
