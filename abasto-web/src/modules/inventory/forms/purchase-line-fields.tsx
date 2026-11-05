import { Trash2Icon } from 'lucide-react'

import { IconButton } from '#/modules/inventory/components/action-button'
import {
  Field,
  FieldInput,
  FieldSelect,
} from '#/modules/inventory/components/form-controls'
import { QuantityFields } from '#/modules/inventory/forms/quantity-fields'
import { quantityPresentations } from '#/modules/inventory/lib/pack-info'
import type { PurchaseLineDraft } from '#/modules/inventory/lib/purchase-draft'
import type { CatalogProduct } from '#/modules/catalog/lib/catalog-types'

type PurchaseLineFieldsProps = {
  index: number
  line: PurchaseLineDraft
  products: ReadonlyArray<CatalogProduct>
  onChange: (patch: Partial<PurchaseLineDraft>) => void
  /** Absent when it is the only line. */
  onRemove?: () => void
}

/** One product line of the purchase form. */
export function PurchaseLineFields({
  index,
  line,
  products,
  onChange,
  onRemove,
}: PurchaseLineFieldsProps) {
  const product = products.find(({ id }) => id === line.productId)
  const presentations = product ? quantityPresentations(product) : []

  return (
    <fieldset className="grid gap-3 rounded-[10px] border border-[#e3e8ef] p-4">
      <legend className="px-1 text-xs font-[650] text-[#64798f]">
        Línea {index + 1}
      </legend>
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto]">
        <Field label="Producto">
          <FieldSelect
            value={line.productId}
            onChange={(event) => {
              const next = products.find(({ id }) => id === event.target.value)
              onChange({
                productId: event.target.value,
                presentationId: next
                  ? (quantityPresentations(next).at(0)?.id ?? '')
                  : '',
              })
            }}
          >
            <option value="">Selecciona un producto</option>
            {products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </FieldSelect>
        </Field>
        <Field
          label="Costo total de la línea ($)"
          hint="Lo que pagaste por toda la línea."
        >
          <FieldInput
            inputMode="decimal"
            placeholder="0.00"
            value={line.cost}
            onChange={(event) => onChange({ cost: event.target.value })}
          />
        </Field>
        {onRemove && (
          <IconButton
            aria-label={`Quitar línea ${index + 1}`}
            className="self-end"
            onClick={onRemove}
          >
            <Trash2Icon size={17} />
          </IconButton>
        )}
      </div>
      {product && (
        <QuantityFields
          presentations={presentations}
          unit={product.unit}
          presentationId={line.presentationId}
          packs={line.packs}
          loose={line.loose}
          onChange={onChange}
        />
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Código de lote (opcional)">
          <FieldInput
            value={line.lotCode}
            onChange={(event) => onChange({ lotCode: event.target.value })}
          />
        </Field>
        <Field label="Caducidad (opcional)">
          <FieldInput
            type="date"
            value={line.expiresOn}
            onChange={(event) => onChange({ expiresOn: event.target.value })}
          />
        </Field>
      </div>
    </fieldset>
  )
}
