import { useState } from 'react'

import { CatalogButton } from '#/modules/catalog/components/catalog-button'
import { CatalogModal } from '#/modules/catalog/components/catalog-modal'
import {
  Field,
  SelectInput,
  TextInput,
} from '#/modules/catalog/forms/form-field'
import { parseBps, parseSignedPesos } from '#/modules/pricing/lib/money'
import { countAffected } from '#/modules/pricing/lib/price-table'
import type { PriceTableRow } from '#/modules/pricing/lib/price-table'
import type { Outcome } from '#/modules/pricing/hooks/use-pricing'
import type { BulkChangeInput } from '#/modules/pricing/services/bulk-prices'
import { hasWarehouseChoice } from '#/modules/warehouses/lib/warehouse-choice'

type BulkChangeDialogProps = {
  /** Warehouses the actor manages. */
  warehouses: Array<{ id: string; name: string }>
  currentWarehouse: { id: string; name: string } | undefined
  /** Loaded rows of the current warehouse, used for the preview count. */
  rows: Array<PriceTableRow>
  suppliers: Array<{ id: string; name: string }>
  categories: Array<string>
  products: Array<{ id: string; name: string; sku: string }>
  onSubmit: (input: BulkChangeInput) => Promise<Outcome>
  onClose: () => void
}

export function BulkChangeDialog({
  warehouses,
  currentWarehouse,
  rows,
  suppliers,
  categories,
  products,
  onSubmit,
  onClose,
}: BulkChangeDialogProps) {
  const [supplierId, setSupplierId] = useState('')
  const [category, setCategory] = useState('')
  const [productIds, setProductIds] = useState<Array<string>>([])
  const [kind, setKind] = useState<'percent' | 'fixed'>('percent')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [selected, setSelected] = useState<Array<string>>(
    currentWarehouse
      ? [currentWarehouse.id]
      : warehouses.length === 1
        ? [warehouses[0].id]
        : [],
  )
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const everyWarehouse = selected.length === warehouses.length
  const hasFilter = Boolean(supplierId || category || productIds.length)
  const affected = countAffected(rows, { supplierId, category, productIds })
  const toggle = (list: Array<string>, id: string) =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id]

  async function submit() {
    const parsed = (kind === 'percent' ? parseBps : parseSignedPesos)(amount)
    if (!parsed.ok) return setError(parsed.message)
    setBusy(true)
    const outcome = await onSubmit({
      warehouseIds: everyWarehouse ? 'all' : selected,
      supplierId: supplierId || undefined,
      category: category || undefined,
      productIds: productIds.length ? productIds : undefined,
      change:
        kind === 'percent'
          ? { kind, bps: parsed.value }
          : { kind, cents: parsed.value },
      reason,
    })
    setBusy(false)
    if (outcome.ok) onClose()
    else setError(outcome.message)
  }

  return (
    <CatalogModal
      title="Cambio masivo de precios"
      description="Cambia los precios propios por proveedor, categoría o productos. Es todo o nada."
      size="editor"
      onClose={onClose}
    >
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Proveedor">
          <SelectInput
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="">Cualquiera</option>
            {suppliers.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Categoría">
          <SelectInput
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Cualquiera</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Tipo de cambio">
          <SelectInput
            value={kind}
            onChange={(e) => setKind(e.target.value as 'percent' | 'fixed')}
          >
            <option value="percent">Porcentaje (%)</option>
            <option value="fixed">Monto fijo (pesos)</option>
          </SelectInput>
        </Field>
        <Field
          label={
            kind === 'percent'
              ? 'Porcentaje (ej. 5 o -10)'
              : 'Monto en pesos (ej. 2.50 o -1)'
          }
        >
          <TextInput
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
      </div>
      <fieldset className="grid gap-1.5 text-sm text-[#513f45]">
        <legend className="mb-1 text-[13px] font-medium">
          Productos (opcional)
        </legend>
        <div className="max-h-[130px] overflow-y-auto rounded-lg border border-[#e8e1e3] p-2">
          {products.map(({ id, name, sku }) => (
            <label key={id} className="flex items-center gap-2 py-0.5">
              <input
                type="checkbox"
                checked={productIds.includes(id)}
                onChange={() => setProductIds((list) => toggle(list, id))}
              />
              {name} <span className="text-xs text-[#a29096]">{sku}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {hasWarehouseChoice(warehouses) && (
        <fieldset className="grid gap-1.5 text-sm text-[#513f45]">
          <legend className="mb-1 text-[13px] font-medium">Almacenes</legend>
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              checked={everyWarehouse}
              onChange={() =>
                setSelected(
                  everyWarehouse ? [] : warehouses.map(({ id }) => id),
                )
              }
            />
            Todos
          </label>
          {warehouses.map(({ id, name }) => (
            <label key={id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(id)}
                onChange={() => setSelected((list) => toggle(list, id))}
              />
              {name}
            </label>
          ))}
        </fieldset>
      )}
      <Field label="Motivo (opcional)">
        <TextInput value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <p className="text-sm text-[#89747b]">
        {hasFilter
          ? `En ${currentWarehouse?.name ?? 'el almacén actual'}: ${affected} precios propios cambiarían. Los demás almacenes se calculan al aplicar.`
          : 'Elige un proveedor, una categoría o productos.'}
      </p>
      {error && (
        <p role="alert" className="text-sm font-medium text-[#b42318]">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2.5">
        <CatalogButton onClick={onClose}>Cancelar</CatalogButton>
        <CatalogButton
          tone="primary"
          disabled={busy || !hasFilter || !selected.length}
          onClick={() => void submit()}
        >
          Aplicar cambio
        </CatalogButton>
      </div>
    </CatalogModal>
  )
}
