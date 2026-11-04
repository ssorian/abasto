import { useState } from 'react'
import { ArrowRightIcon } from 'lucide-react'

import { ActionButton } from '#/modules/inventory/components/action-button'
import {
  FieldGroup,
  FieldInput,
  FieldTextarea,
} from '#/modules/inventory/components/form-controls'
import {
  FormError,
  InfoPairs,
  SectionHelp,
} from '#/modules/inventory/components/info-blocks'
import {
  DialogActions,
  InventoryDialog,
} from '#/modules/inventory/components/inventory-dialog'
import { Picker } from '#/modules/inventory/components/picker'
import { ProductThumb } from '#/modules/inventory/components/product-thumb'
import {
  findInventoryProduct,
  inventoryProducts,
} from '#/modules/inventory/lib/catalog'
import { money } from '#/modules/inventory/lib/format'
import { available, lotStatus, stockFor } from '#/modules/inventory/lib/stock'
import { warehouseNames } from '#/shared/demo/types'
import { cn } from '#/lib/utils/cn'

import type { WarehouseName } from '#/shared/demo/types'
import type {
  StockChange,
  StockChangeMode,
} from '#/modules/inventory/lib/operations'
import type { InventoryState } from '#/modules/inventory/types/inventory'

export type OperationRequest = {
  type: StockChangeMode
  productId: string
  /** Opens with the reason fixed to "Transferencia". */
  transfer?: boolean
  warehouse: WarehouseName
}

type OperationDialogProps = {
  operation: OperationRequest
  state: InventoryState
  onClose: () => void
  /** Returns true when the change was registered. */
  onConfirm: (change: StockChange) => boolean
}

const outReasons = [
  'Merma',
  'Producto dañado',
  'Caducidad',
  'Transferencia',
  'Pérdida',
  'Otro',
]
const adjustReasons = [
  'Diferencia de conteo',
  'Error de captura',
  'Producto encontrado',
  'Pérdida',
  'Otro',
]

const signed = (value: number) => `${value > 0 ? '+' : ''}${value}`

/** Manual outflow, adjustment or transfer departure with a review step. */
export function OperationDialog({
  operation,
  state,
  onClose,
  onConfirm,
}: OperationDialogProps) {
  const [productId, setProductId] = useState(operation.productId)
  const [warehouse, setWarehouse] = useState<WarehouseName>(operation.warehouse)
  const [value, setValue] = useState('')
  const [reason, setReason] = useState(
    operation.transfer ? 'Transferencia' : '',
  )
  const [lotId, setLotId] = useState('auto')
  const [note, setNote] = useState('')
  const [destination, setDestination] = useState('')
  const [review, setReview] = useState(false)
  const [error, setError] = useState('')

  const product = findInventoryProduct(productId) ?? inventoryProducts[0]
  const stock = stockFor(state, productId, warehouse)
  const isOut = operation.type === 'out'
  const delta = isOut ? -Number(value) : Number(value) - stock.physical
  const isTransfer = reason === 'Transferencia'

  const validate = () => {
    const amount = Number(value)
    if (
      value === '' ||
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      (isOut && amount === 0)
    ) {
      return 'Ingresa una cantidad válida.'
    }
    if (!reason) return 'Selecciona un motivo.'
    if (stock.physical + delta < 0) {
      return `No hay suficiente inventario. Hay ${stock.physical} ${product.unit} físicamente.`
    }
    if (stock.physical + delta < stock.reserved) {
      return `Hay ${stock.reserved} ${product.unit} reservadas. Libera los pedidos afectados antes de continuar.`
    }
    if (!delta) return 'La cantidad coincide con el inventario del sistema.'
    if (isTransfer && (!destination || destination === warehouse)) {
      return 'Selecciona otro almacén de destino.'
    }
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
    onConfirm({
      productId,
      warehouse,
      mode: operation.type,
      value: Number(value),
      reason,
      note,
      destination: isTransfer ? (destination as WarehouseName) : undefined,
      lotId: lotId === 'auto' ? undefined : lotId,
    })
  }

  const deltaText = `${signed(delta)} ${product.unit}`

  return (
    <InventoryDialog
      eyebrow={isOut ? 'SALIÓ MERCANCÍA' : 'ENCONTRÉ UNA DIFERENCIA'}
      title={
        review
          ? 'Confirma el cambio'
          : isOut
            ? 'Salida manual'
            : 'Ajustar inventario'
      }
      description={
        isOut
          ? 'Para mercancía que sale por un motivo distinto de una venta.'
          : 'Toda diferencia genera un movimiento y conserva su motivo.'
      }
      onClose={onClose}
    >
      {!review ? (
        <>
          <div className="grid gap-[15px] md:grid-cols-2">
            <FieldGroup label="Producto">
              <Picker
                label="Producto de la operación"
                value={productId}
                onChange={(next) => {
                  setProductId(next)
                  setLotId('auto')
                }}
                options={inventoryProducts.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                className="w-full"
              />
            </FieldGroup>
            <FieldGroup label="Almacén">
              <Picker
                label="Almacén de la operación"
                value={warehouse}
                onChange={(next) => {
                  setWarehouse(next as WarehouseName)
                  setLotId('auto')
                }}
                options={warehouseNames}
                className="w-full"
              />
            </FieldGroup>
          </div>
          <div className="flex justify-around gap-2.5 rounded-[9px] bg-[#f0f4f9] p-[17px]">
            {[
              ['Físico', stock.physical],
              ['Reservado', stock.reserved],
              ['Disponible', available(stock)],
            ].map(([label, amount]) => (
              <span
                key={label}
                className="flex flex-col gap-[7px] text-center text-xs text-[#8b9baf]"
              >
                {label}
                <b className="text-2xl leading-[1.2] font-semibold text-[#466584]">
                  {amount}
                </b>
              </span>
            ))}
          </div>
          <FieldGroup
            label={`${isOut ? 'Cantidad a retirar' : 'Cantidad física encontrada'} · ${product.unit}`}
          >
            <FieldInput
              autoFocus
              type="number"
              min="0"
              step="1"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-label={
                isOut ? 'Cantidad a retirar' : 'Cantidad física encontrada'
              }
              placeholder="0"
            />
          </FieldGroup>
          <FieldGroup label="Motivo · obligatorio">
            <Picker
              label="Motivo del cambio"
              value={reason}
              onChange={setReason}
              options={isOut ? outReasons : adjustReasons}
              className="w-full"
            />
          </FieldGroup>
          {isTransfer && (
            <FieldGroup label="Almacén de destino">
              <Picker
                label="Destino de la transferencia"
                value={destination}
                onChange={setDestination}
                options={warehouseNames.filter((name) => name !== warehouse)}
                className="w-full"
              />
            </FieldGroup>
          )}
          <FieldGroup label="Lote de la operación">
            <Picker
              label="Lote de la operación"
              value={lotId}
              onChange={setLotId}
              options={[
                { value: 'auto', label: 'Automático · Priorizar caducidad' },
                ...stock.lots.map((lot) => ({
                  value: lot.id,
                  label: `${lot.code || 'Sin lote'} · ${lot.qty} ${product.unit} · ${lotStatus(lot)}`,
                })),
              ]}
              className="w-full"
            />
          </FieldGroup>
          <FieldGroup label="Nota · opcional">
            <FieldTextarea
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Agrega un detalle que ayude a entender el cambio."
              aria-label="Nota del movimiento"
            />
          </FieldGroup>
          {value !== '' && (
            <div className="flex items-center justify-between rounded-[8px] bg-[#f4f7fb] p-[17px] text-[13px] text-[#7b90a8]">
              <span>{isOut ? 'Salida' : 'Diferencia'}</span>
              <strong
                className={cn(
                  'text-xl font-semibold',
                  delta > 0 ? 'text-[#198567]' : 'text-[#c35850]',
                )}
              >
                {deltaText}
              </strong>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-col items-center gap-3.5 py-3">
            <div className="h-[100px] max-w-[140px]">
              <ProductThumb product={product} />
            </div>
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <strong
              className={cn(
                'text-[30px] font-[650]',
                delta > 0 ? 'text-[#198567]' : 'text-[#c35850]',
              )}
            >
              {deltaText}
            </strong>
            <p className="text-xs text-[#8b9bad]">
              Almacén {warehouse} · {reason}
              {isTransfer && destination && ` → ${destination}`}
            </p>
          </div>
          <InfoPairs
            rows={[
              ['Físico actual', String(stock.physical)],
              ['Físico después del cambio', String(stock.physical + delta)],
            ]}
          />
          {delta > 0 && (
            <SectionHelp>
              Las unidades encontradas quedarán bloqueadas para revisión de
              lote, al último costo conocido: {money(stock.last)} por unidad de
              manejo.
            </SectionHelp>
          )}
        </>
      )}
      {error && <FormError>{error}</FormError>}
      <DialogActions>
        <ActionButton onClick={() => (review ? setReview(false) : onClose())}>
          {review ? 'Corregir' : 'Cancelar'}
        </ActionButton>
        <ActionButton tone="primary" onClick={submit}>
          {review ? 'Confirmar' : isOut ? 'Revisar salida' : 'Revisar ajuste'}
          <ArrowRightIcon size={16} />
        </ActionButton>
      </DialogActions>
    </InventoryDialog>
  )
}
