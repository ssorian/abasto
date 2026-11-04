import { useState } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'

import {
  ActionButton,
  IconButton,
  TextLink,
} from '#/modules/inventory/components/action-button'
import {
  Field,
  FieldInput,
  FieldSelect,
  FormGrid,
} from '#/modules/inventory/components/form-controls'
import {
  FormError,
  SectionHelp,
} from '#/modules/inventory/components/info-blocks'
import { InventoryDialog } from '#/modules/inventory/components/inventory-dialog'
import {
  inventoryProducts,
  requireProduct,
} from '#/modules/inventory/lib/catalog'
import {
  isValidMoney,
  localDateTime,
  money,
  newId,
} from '#/modules/inventory/lib/format'
import { stockFor } from '#/modules/inventory/lib/stock'
import { warehouseNames } from '#/shared/demo/types'

import type { WarehouseName } from '#/shared/demo/types'
import type { ReceiveLine } from '#/modules/inventory/lib/operations'
import type { InventoryState } from '#/modules/inventory/types/inventory'

type DraftLine = {
  key: string
  productId: string
  presentationId: string
  /** Presentations received. */
  qty: number
  /** MXN per presentation. */
  cost: number
  lot: string
  expiry: string
  salePrice?: number
}

type ReceiptDialogProps = {
  state: InventoryState
  warehouse: WarehouseName
  initialProductId: string | null
  onClose: () => void
  /** Returns true when the entry was registered. */
  onConfirm: (
    warehouse: WarehouseName,
    reference: string,
    date: string,
    lines: Array<ReceiveLine>,
  ) => boolean
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** "Recibir inventario": one or more product/lot lines, reviewed before registering. */
export function ReceiptDialog({
  state,
  warehouse,
  initialProductId,
  onClose,
  onConfirm,
}: ReceiptDialogProps) {
  const [scope, setScope] = useState<WarehouseName>(warehouse)
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(localDateTime)
  const [pickId, setPickId] = useState(
    initialProductId ?? inventoryProducts[0].id,
  )
  const [review, setReview] = useState(false)
  const [error, setError] = useState('')

  const makeLine = (productId: string, target: WarehouseName): DraftLine => {
    const product = requireProduct(productId)
    const presentation =
      product.presentations.find(
        (item) => item.factor === product.packFactor,
      ) ?? product.presentations[0]
    return {
      key: newId('ROW'),
      productId,
      presentationId: presentation.id,
      qty: 0,
      cost: round2(
        stockFor(state, productId, target).last * presentation.factor,
      ),
      lot: '',
      expiry: '',
    }
  }

  const [lines, setLines] = useState<Array<DraftLine>>(() =>
    initialProductId ? [makeLine(initialProductId, warehouse)] : [],
  )

  const edit = (key: string, patch: Partial<DraftLine>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    )
    setReview(false)
  }
  const factorOf = (line: DraftLine) =>
    requireProduct(line.productId).presentations.find(
      (item) => item.id === line.presentationId,
    )?.factor ?? 1
  const total = lines.reduce((sum, line) => sum + line.qty * line.cost, 0)

  const validate = () => {
    if (
      !date ||
      !Number.isFinite(Date.parse(date)) ||
      Date.parse(date) > Date.now() + 1000
    ) {
      return 'Revisa la fecha de recepción; no puede estar vacía ni ser futura.'
    }
    if (!lines.length) return 'Agrega un producto.'
    if (
      lines.some(
        (line) =>
          !Number.isSafeInteger(line.qty) ||
          line.qty <= 0 ||
          !isValidMoney(line.cost) ||
          line.cost <= 0,
      )
    ) {
      return 'Revisa cantidades y costos.'
    }
    if (lines.some((line) => !line.lot.trim()))
      return 'Indica el lote de cada producto.'
    return ''
  }

  const submit = () => {
    const problem = validate()
    setError(problem)
    if (problem) return
    if (!review) {
      setReview(true)
      return
    }
    onConfirm(
      scope,
      reference,
      new Date(date).toISOString(),
      lines.map((line) => {
        const factor = factorOf(line)
        return {
          productId: line.productId,
          qty: line.qty * factor,
          cost: line.cost / factor,
          lot: line.lot.trim(),
          expiry: line.expiry,
          salePrice: line.salePrice,
        }
      }),
    )
  }

  return (
    <InventoryDialog
      size="wide"
      title={review ? 'Revisar entrada' : 'Recibir inventario'}
      description="Registra presentaciones, cantidades, lotes y costo real de la mercancía recibida."
      onClose={onClose}
    >
      <FormGrid>
        <Field label="Almacén">
          <FieldSelect
            value={scope}
            disabled={review}
            onChange={(event) => setScope(event.target.value as WarehouseName)}
          >
            {warehouseNames.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </FieldSelect>
        </Field>
        <Field label="Referencia interna opcional">
          <FieldInput
            value={reference}
            disabled={review}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Folio o nota de recepción"
          />
        </Field>
        <Field label="Fecha de recepción">
          <FieldInput
            type="datetime-local"
            value={date}
            disabled={review}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
      </FormGrid>
      {!review && (
        <div className="my-[15px] flex gap-3 max-md:flex-col">
          <select
            aria-label="Producto a recibir"
            value={pickId}
            onChange={(event) => setPickId(event.target.value)}
            className="min-w-0 flex-1 rounded-[8px] border border-[#dee4dc] bg-white px-3 py-2.5 text-[13px] text-[#37473c]"
          >
            {inventoryProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <ActionButton
            onClick={() =>
              setLines((current) => [...current, makeLine(pickId, scope)])
            }
          >
            <PlusIcon size={16} />
            Agregar producto / lote
          </ActionButton>
        </div>
      )}
      {lines.map((line) => {
        const product = requireProduct(line.productId)
        const factor = factorOf(line)
        const presentation = product.presentations.find(
          (item) => item.id === line.presentationId,
        )
        return (
          <div
            key={line.key}
            className="rounded-[10px] border border-[#e2e7e0] bg-white p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm">{product.name}</strong>
              {!review && (
                <IconButton
                  aria-label="Quitar línea de entrada"
                  onClick={() =>
                    setLines((current) =>
                      current.filter((item) => item.key !== line.key),
                    )
                  }
                >
                  <Trash2Icon size={15} />
                </IconButton>
              )}
            </div>
            <FormGrid className="mt-[15px]">
              <Field label="Presentación recibida">
                <FieldSelect
                  disabled={review}
                  value={line.presentationId}
                  onChange={(event) => {
                    const next = product.presentations.find(
                      (item) => item.id === event.target.value,
                    )
                    edit(line.key, {
                      presentationId: event.target.value,
                      cost: round2(
                        stockFor(state, product.id, scope).last *
                          (next?.factor ?? 1),
                      ),
                    })
                  }}
                >
                  {product.presentations
                    .filter((item) => item.active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.factor} {product.unit}
                      </option>
                    ))}
                </FieldSelect>
              </Field>
              <Field label="Cantidad de presentaciones">
                <FieldInput
                  disabled={review}
                  type="number"
                  min="1"
                  step="1"
                  value={line.qty || ''}
                  onChange={(event) =>
                    edit(line.key, { qty: Number(event.target.value) })
                  }
                />
              </Field>
              <Field
                label={`Costo por ${presentation?.name ?? product.packName}`}
              >
                <FieldInput
                  disabled={review}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={line.cost || ''}
                  onChange={(event) =>
                    edit(line.key, { cost: Number(event.target.value) })
                  }
                />
              </Field>
              <Field label="Lote">
                <FieldInput
                  disabled={review}
                  value={line.lot}
                  onChange={(event) =>
                    edit(line.key, { lot: event.target.value })
                  }
                />
              </Field>
              <Field label="Caducidad opcional">
                <FieldInput
                  disabled={review}
                  type="date"
                  value={line.expiry}
                  onChange={(event) =>
                    edit(line.key, { expiry: event.target.value })
                  }
                />
              </Field>
              <Field
                label={`Precio de venta por ${product.packName} · opcional`}
              >
                <FieldInput
                  disabled={review}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={`General ${money(product.price)}`}
                  value={line.salePrice ?? ''}
                  onChange={(event) =>
                    edit(line.key, {
                      salePrice: event.target.value
                        ? Number(event.target.value)
                        : undefined,
                    })
                  }
                />
              </Field>
            </FormGrid>
            <SectionHelp>
              Ingresarán {line.qty * factor} {product.unit} al mismo inventario
              · Costo total {money(line.qty * line.cost)}.
            </SectionHelp>
          </div>
        )
      })}
      <div className="flex items-center justify-between gap-5 rounded-[13px] border border-[#153966] bg-[#153966] px-6 py-[22px]">
        <div>
          <span className="block text-xs text-[#bbcfe7]">
            Costo de esta entrada
          </span>
          <strong className="text-[30px] font-[650] tracking-[-0.7px] text-[#ffda58]">
            {money(total)}
          </strong>
        </div>
        <ActionButton tone="primary" className="min-h-[46px]" onClick={submit}>
          {review ? 'Confirmar entrada' : 'Revisar entrada'}
        </ActionButton>
      </div>
      {error && <FormError>{error}</FormError>}
      <div className="mt-3.5 mb-[15px] flex gap-[9px]">
        {review && (
          <ActionButton onClick={() => setReview(false)}>Corregir</ActionButton>
        )}
        <TextLink onClick={onClose}>Guardar borrador y cerrar</TextLink>
      </div>
    </InventoryDialog>
  )
}
