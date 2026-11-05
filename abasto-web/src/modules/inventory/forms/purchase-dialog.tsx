import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

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
import { PurchaseLineFields } from '#/modules/inventory/forms/purchase-line-fields'
import { useInventoryActions } from '#/modules/inventory/hooks/use-inventory-actions'
import {
  emptyLine,
  purchaseInputFromDraft,
} from '#/modules/inventory/lib/purchase-draft'
import type { PurchaseDraft } from '#/modules/inventory/lib/purchase-draft'
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

let lineCounter = 0
const newLine = () => emptyLine(`line-${(lineCounter += 1)}`)

/** Purchase to a supplier: one lot per line, costs in pesos, quantities in presentations. */
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
    lines: [newLine()],
  }))
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const patchLine = (
    key: string,
    patch: Partial<PurchaseDraft['lines'][number]>,
  ) =>
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.key === key ? { ...line, ...patch } : line,
      ),
    }))

  async function submit() {
    const parsed = purchaseInputFromDraft(draft, products)
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
      description="Registra lo que te surtió el proveedor. Cada línea crea un lote con su costo y caducidad."
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
        {draft.lines.map((line, index) => (
          <PurchaseLineFields
            key={line.key}
            index={index}
            line={line}
            products={products}
            onChange={(patch) => patchLine(line.key, patch)}
            onRemove={
              draft.lines.length > 1
                ? () =>
                    setDraft({
                      ...draft,
                      lines: draft.lines.filter(({ key }) => key !== line.key),
                    })
                : undefined
            }
          />
        ))}
        <div>
          <ActionButton
            type="button"
            onClick={() =>
              setDraft({ ...draft, lines: [...draft.lines, newLine()] })
            }
          >
            <PlusIcon size={17} />
            Agregar producto
          </ActionButton>
        </div>
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
