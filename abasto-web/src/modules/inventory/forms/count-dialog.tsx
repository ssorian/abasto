import { useState } from 'react'
import {
  ArrowRightIcon,
  CheckIcon,
  CircleCheckIcon,
  ClipboardCheckIcon,
  EyeIcon,
  RotateCcwIcon,
  SearchIcon,
  TriangleAlertIcon,
} from 'lucide-react'

import {
  ActionButton,
  TextLink,
} from '#/modules/inventory/components/action-button'
import { FieldGroup } from '#/modules/inventory/components/form-controls'
import {
  FormError,
  InfoBanner,
  SuccessNote,
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
import { matchesProduct } from '#/modules/inventory/lib/filters'
import { newId } from '#/modules/inventory/lib/format'
import { stockFor } from '#/modules/inventory/lib/stock'
import { warehouseNames } from '#/shared/demo/types'
import { cn } from '#/lib/utils/cn'

import type { WarehouseName } from '#/shared/demo/types'
import type { Count, InventoryState } from '#/modules/inventory/types/inventory'

type CountDialogProps = {
  warehouse: WarehouseName
  state: InventoryState
  /** Existing count to review; `null` starts a new one. */
  initialCount: Count | null
  onClose: () => void
  onSave: (count: Count) => void
  onApply: (count: Count, productIds: Array<string>) => void
}

const countInput =
  'mt-1.5 w-full rounded-[6px] border border-[#dce5ef] p-[9px] text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none'

/** Blind count: pick warehouse, count products, compare, then confirm adjustments. */
export function CountDialog({
  warehouse,
  state,
  initialCount,
  onClose,
  onSave,
  onApply,
}: CountDialogProps) {
  const [scope, setScope] = useState<WarehouseName>(
    initialCount?.warehouse ?? warehouse,
  )
  const [step, setStep] = useState(initialCount ? 2 : 0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [count, setCount] = useState<Count | null>(initialCount)
  const [error, setError] = useState('')

  // The stored count carries the applied flags once adjustments are confirmed.
  const current = state.counts.find((item) => item.id === count?.id) ?? count
  const pending =
    current?.rows.filter((row) => row.system !== row.count && !row.applied) ??
    []
  const counted = Object.values(values).filter((value) => value !== '').length

  const compare = () => {
    const rows = inventoryProducts
      .filter((product) => values[product.id] !== '' && !!values[product.id])
      .map((product) => ({
        productId: product.id,
        system: stockFor(state, product.id, scope).physical,
        count: Number(values[product.id]),
        applied: false,
      }))
    if (
      !rows.length ||
      rows.some((row) => !Number.isSafeInteger(row.count) || row.count < 0)
    ) {
      setError('Cuenta al menos un producto con una cantidad entera válida.')
      return
    }
    const next: Count = {
      id: newId('CNT'),
      warehouse: scope,
      date: new Date().toISOString(),
      rows,
    }
    onSave(next)
    setCount(next)
    setStep(2)
    setError('')
  }

  return (
    <InventoryDialog
      size="count"
      eyebrow="CONTÉ MERCANCÍA"
      title={
        step === 0
          ? 'Nuevo conteo físico'
          : step === 1
            ? 'Cuenta lo que tienes'
            : 'Resultado del conteo'
      }
      description={
        step === 0
          ? 'Elige dónde vas a contar la mercancía.'
          : step === 1
            ? `Almacén ${scope} · Captura solo los productos que hayas contado.`
            : `${current?.id} · Almacén ${scope}`
      }
      onClose={onClose}
    >
      {step === 0 && (
        <>
          <div className="mx-auto my-3 grid size-[76px] place-items-center rounded-[20px] bg-[#eff3fa] text-[#476d9a]">
            <ClipboardCheckIcon size={36} />
          </div>
          <FieldGroup label="Almacén">
            <Picker
              label="Almacén del conteo"
              value={scope}
              onChange={(next) => setScope(next as WarehouseName)}
              options={warehouseNames}
              className="w-full"
            />
          </FieldGroup>
          <InfoBanner icon={<EyeIcon size={18} />}>
            Las cantidades del sistema estarán ocultas. Así puedes contar sin
            sesgos y comparar al terminar.
          </InfoBanner>
          <ActionButton tone="primary" full onClick={() => setStep(1)}>
            Comenzar conteo
            <ArrowRightIcon size={17} />
          </ActionButton>
        </>
      )}
      {step === 1 && (
        <>
          <div className="flex h-11 items-center gap-2.5 rounded-[9px] border border-[#e0e6ee] bg-white px-[13px] text-[#8190a2]">
            <SearchIcon size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar producto para contar..."
              aria-label="Buscar producto en conteo"
              className="h-full w-full bg-transparent text-sm text-[#344e6e] outline-none"
            />
          </div>
          <div className="grid max-h-[49dvh] gap-[15px] overflow-auto p-0.5 md:grid-cols-2">
            {inventoryProducts
              .filter((product) => matchesProduct(product, query))
              .map((product) => (
                <div
                  key={product.id}
                  className="flex gap-3.5 rounded-[9px] border border-[#e0e8f1] p-[18px]"
                >
                  <div className="h-[72px] w-[42px] shrink-0 self-center">
                    <ProductThumb product={product} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-[13px]">
                      {product.name}
                    </strong>
                    <small className="mt-[5px] block text-xs text-[#8f9eb2]">
                      {product.description}
                    </small>
                    <label
                      htmlFor={`count-${product.id}`}
                      className="mt-[15px] block text-xs text-[#7e93ac]"
                    >
                      Cantidad física · {product.unit}
                    </label>
                    <input
                      id={`count-${product.id}`}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Sin contar"
                      value={values[product.id] ?? ''}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          [product.id]: event.target.value,
                        }))
                      }
                      className={countInput}
                    />
                  </div>
                </div>
              ))}
          </div>
          <DialogActions>
            <span className="text-[#788596] max-md:text-xs">
              {counted} de {inventoryProducts.length} contados
            </span>
            <ActionButton tone="primary" onClick={compare}>
              Comparar inventario
              <ArrowRightIcon size={17} />
            </ActionButton>
          </DialogActions>
        </>
      )}
      {step === 2 && current && (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:gap-[15px]">
            <div className="flex flex-wrap items-center gap-[9px] rounded-[9px] bg-[#edf6f2] px-3 py-[15px] text-[#6c9986] md:flex-nowrap md:gap-[13px] md:p-[18px]">
              <CircleCheckIcon size={21} />
              <strong className="text-[25px] leading-[1.3] font-semibold md:text-[26px]">
                {current.rows.filter((row) => row.system === row.count).length}
              </strong>
              <span className="max-md:basis-full text-xs">Sin diferencias</span>
            </div>
            <div className="flex flex-wrap items-center gap-[9px] rounded-[9px] bg-[#fff7e5] px-3 py-[15px] text-[#b39755] md:flex-nowrap md:gap-[13px] md:p-[18px]">
              <TriangleAlertIcon size={21} />
              <strong className="text-[25px] leading-[1.3] font-semibold md:text-[26px]">
                {current.rows.filter((row) => row.system !== row.count).length}
              </strong>
              <span className="max-md:basis-full text-xs">Con diferencias</span>
            </div>
          </div>
          <div className="max-h-[39dvh] overflow-auto rounded-[10px] border border-[#e4ebf2]">
            {current.rows.map((row) => {
              const product = findInventoryProduct(row.productId)
              const diff = row.count - row.system
              return (
                <div
                  key={row.productId}
                  className="flex flex-wrap items-center gap-3.5 border-b border-[#e8eef5] px-3.5 py-[17px] last:border-0 md:flex-nowrap md:gap-5 md:p-[18px]"
                >
                  <div className="max-md:basis-full md:flex-1">
                    <strong className="block text-[13px]">
                      {product?.name}
                    </strong>
                    <small className="mt-[5px] block text-xs text-[#93a3b6]">
                      {product?.unit}
                    </small>
                  </div>
                  {[
                    ['Sistema', row.system, ''],
                    ['Conteo', row.count, ''],
                    [
                      'Diferencia',
                      `${diff > 0 ? '+' : ''}${diff}`,
                      diff < 0 ? 'text-[#c35850]' : 'text-[#198567]',
                    ],
                  ].map(([label, value, tone]) => (
                    <div key={label} className="max-md:flex-1">
                      <span className="block text-xs text-[#95a7bd]">
                        {label}
                      </span>
                      <b
                        className={cn(
                          'mt-1.5 block text-center text-[17px] font-[550] max-md:text-left md:text-base',
                          tone,
                        )}
                      >
                        {value}
                      </b>
                    </div>
                  ))}
                  {row.applied ? (
                    <span className="flex items-center gap-1 rounded bg-[#eff8f2] p-[5px] text-xs text-[#639780]">
                      <CheckIcon size={13} />
                      Ajustado
                    </span>
                  ) : diff !== 0 ? (
                    <TextLink
                      className="max-w-[70px] text-xs leading-[1.7] md:max-w-[75px]"
                      onClick={() => onApply(current, [row.productId])}
                    >
                      Confirmar ajuste
                    </TextLink>
                  ) : (
                    <CircleCheckIcon size={19} className="text-[#198567]" />
                  )}
                </div>
              )
            })}
          </div>
          {pending.length > 0 ? (
            <InfoBanner icon={<RotateCcwIcon size={18} />}>
              Al confirmar se actualizarán las existencias con el motivo
              «Diferencia de conteo». Hasta entonces, tu inventario no cambia.
            </InfoBanner>
          ) : (
            <SuccessNote>
              <CircleCheckIcon size={19} />
              No quedan diferencias pendientes.
            </SuccessNote>
          )}
          <DialogActions>
            <ActionButton onClick={onClose}>
              {pending.length ? 'Revisar después' : 'Cerrar conteo'}
            </ActionButton>
            {pending.length > 0 && (
              <ActionButton
                tone="primary"
                onClick={() =>
                  onApply(
                    current,
                    pending.map((row) => row.productId),
                  )
                }
              >
                Confirmar {pending.length}{' '}
                {pending.length === 1 ? 'ajuste' : 'ajustes'}
                <CheckIcon size={17} />
              </ActionButton>
            )}
          </DialogActions>
        </>
      )}
      {error && <FormError>{error}</FormError>}
    </InventoryDialog>
  )
}
