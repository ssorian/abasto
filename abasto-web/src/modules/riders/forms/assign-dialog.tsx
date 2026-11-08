import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  Field,
  FieldInput,
  FieldSelect,
} from '#/modules/inventory/components/form-controls'
import {
  FormError,
  SectionHelp,
} from '#/modules/inventory/components/info-blocks'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { useRiderActions } from '#/modules/riders/hooks/use-rider-actions'
import { assignInputFromDraft } from '#/modules/riders/lib/assign-draft'
import type {
  AssignableProduct,
  AssignDraftLine,
} from '#/modules/riders/lib/assign-draft'
import { describeQuantity } from '#/modules/riders/lib/box-quantities'
import type { Rider } from '#/modules/riders/services/riders'

type AssignDialogProps = {
  /** Active riders without an assignment on the road. */
  riders: ReadonlyArray<Rider>
  products: ReadonlyArray<AssignableProduct>
  onClose: () => void
}

const emptyLine = (): AssignDraftLine => ({
  productId: '',
  boxes: '',
  units: '',
})

/** Hands product to a rider: pick the rider, then boxes and/or units per product. */
export function AssignDialog({ riders, products, onClose }: AssignDialogProps) {
  const actions = useRiderActions()
  const [riderId, setRiderId] = useState(riders.at(0)?.id ?? '')
  const [lines, setLines] = useState<Array<AssignDraftLine>>([emptyLine()])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const patch = (index: number, change: Partial<AssignDraftLine>) =>
    setLines(
      lines.map((line, i) => (i === index ? { ...line, ...change } : line)),
    )

  async function submit() {
    const parsed = assignInputFromDraft(riderId, lines, products)
    if (!parsed.ok) return setError(parsed.message)
    setError(null)
    setPending(true)
    const result = await actions.assign(parsed.value)
    setPending(false)
    if (result) onClose()
  }

  return (
    <InventoryDialog
      title="Nuevo reparto"
      description="El producto se aparta del almacén y queda en ruta. No se vende ni se cobra hasta liquidar."
      onClose={onClose}
      size="count"
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Field label="Repartidor">
          <FieldSelect
            value={riderId}
            onChange={(event) => setRiderId(event.target.value)}
          >
            <option value="">Elige al repartidor</option>
            {riders.map((rider) => (
              <option key={rider.id} value={rider.id}>
                {rider.name}
              </option>
            ))}
          </FieldSelect>
        </Field>
        <SectionHelp className="my-0">
          Escribe cajas, unidades o ambas, por ejemplo 40 cajas y 20 unidades.
        </SectionHelp>
        {lines.map((line, index) => {
          const product = products.find((p) => p.productId === line.productId)
          const taken = new Set(
            lines.filter((_, i) => i !== index).map((l) => l.productId),
          )
          return (
            <div
              key={index}
              className="grid items-end gap-3 rounded-[10px] border border-[#efe9e3] p-4 md:grid-cols-[minmax(0,1fr)_110px_110px_auto]"
            >
              <Field
                label="Producto"
                hint={
                  product
                    ? `Caja = ${product.boxFactor} unidades · disponibles: ${describeQuantity(product.available, product.boxFactor)}`
                    : undefined
                }
              >
                <FieldSelect
                  value={line.productId}
                  onChange={(event) =>
                    patch(index, { productId: event.target.value })
                  }
                >
                  <option value="">Elige el producto</option>
                  {products
                    .filter((p) => !taken.has(p.productId))
                    .map((p) => (
                      <option key={p.productId} value={p.productId}>
                        {p.name}
                      </option>
                    ))}
                </FieldSelect>
              </Field>
              <Field label="Cajas">
                <FieldInput
                  inputMode="numeric"
                  placeholder="0"
                  value={line.boxes}
                  onChange={(event) =>
                    patch(index, { boxes: event.target.value })
                  }
                />
              </Field>
              <Field label="Unidades">
                <FieldInput
                  inputMode="numeric"
                  placeholder="0"
                  value={line.units}
                  onChange={(event) =>
                    patch(index, { units: event.target.value })
                  }
                />
              </Field>
              {lines.length > 1 && (
                <ActionButton
                  type="button"
                  aria-label="Quitar producto"
                  className="px-3"
                  onClick={() => setLines(lines.filter((_, i) => i !== index))}
                >
                  <Trash2Icon size={17} />
                </ActionButton>
              )}
            </div>
          )
        })}
        <div>
          <ActionButton
            type="button"
            disabled={lines.length >= products.length}
            onClick={() => setLines([...lines, emptyLine()])}
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
            Asignar reparto
          </ActionButton>
        </DialogActions>
      </form>
    </InventoryDialog>
  )
}
