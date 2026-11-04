import { PlusIcon, Trash2Icon } from 'lucide-react'

import { demoProducts } from '#/shared/demo/products'
import { CustomerButton } from '#/modules/customers/components/customer-button'
import {
  Field,
  SelectInput,
  TextInput,
} from '#/modules/customers/forms/form-field'

import type { CommercialRuleDraft } from '#/modules/customers/lib/customer-types'

type CommercialRulesFieldsProps = {
  rules: Array<CommercialRuleDraft>
  onChange: (rules: Array<CommercialRuleDraft>) => void
}

const newRule = (): CommercialRuleDraft => ({
  productId: demoProducts[0].id,
  minQuantity: '10',
  discountPercent: '0',
  price: '',
})

/** Product label includes its pricing unit, e.g. "Coca-Cola Original · cajas". */
const productLabel = (product: (typeof demoProducts)[number]) =>
  `${product.name} · ${
    product.presentations.find(
      (presentation) => presentation.id === product.defaultPresentationId,
    )?.name ?? product.baseUnit
  }`

export function CommercialRulesFields({
  rules,
  onChange,
}: CommercialRulesFieldsProps) {
  const patch = (index: number, change: Partial<CommercialRuleDraft>) =>
    onChange(
      rules.map((rule, i) => (i === index ? { ...rule, ...change } : rule)),
    )

  return (
    <>
      <div className="mb-[23px] flex items-start justify-between gap-[15px] md:items-center">
        <h3 className="text-base">Condiciones comerciales</h3>
        <CustomerButton
          className="min-h-[38px] px-2.5 py-2 text-xs md:min-h-[44px] md:px-[17px] md:py-2.5 md:text-sm"
          onClick={() => onChange([...rules, newRule()])}
        >
          <PlusIcon className="size-[15px]" />
          Agregar condición
        </CustomerButton>
      </div>
      <p className="mt-3 mb-5 text-xs leading-[1.8] text-[#8b99aa] md:text-sm">
        Se usa la condición del producto con mayor cantidad mínima alcanzada. Un
        precio pactado sustituye el precio del lote; el descuento se aplica sólo
        cuando no hay precio pactado.
      </p>
      {rules.map((rule, index) => (
        <div
          key={index}
          className="flex flex-wrap items-start gap-3 border-b border-[#e3e8f0] py-4 metrics:flex-nowrap metrics:items-end"
        >
          <Field label="Producto" className="min-w-[130px] flex-[2]">
            <SelectInput
              value={rule.productId}
              onChange={(event) =>
                patch(index, { productId: event.target.value })
              }
            >
              {demoProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {productLabel(product)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Desde cantidad" className="min-w-[130px] flex-1">
            <TextInput
              type="number"
              min="1"
              step="1"
              value={rule.minQuantity}
              onChange={(event) =>
                patch(index, { minQuantity: event.target.value })
              }
            />
          </Field>
          <Field label="Descuento %" className="min-w-[130px] flex-1">
            <TextInput
              type="number"
              min="0"
              max="100"
              step="0.01"
              disabled={rule.price.trim() !== ''}
              value={rule.discountPercent}
              onChange={(event) =>
                patch(index, { discountPercent: event.target.value })
              }
            />
          </Field>
          <Field
            label="Precio pactado opcional"
            className="min-w-[130px] flex-1"
          >
            <TextInput
              type="number"
              min="0.01"
              step="0.01"
              value={rule.price}
              onChange={(event) => patch(index, { price: event.target.value })}
            />
          </Field>
          <button
            type="button"
            aria-label="Quitar condición"
            className="mb-2 inline-flex size-9 items-center justify-center rounded-[7px] text-[#64758a] hover:bg-[#e9eff6]"
            onClick={() => onChange(rules.filter((_, i) => i !== index))}
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      ))}
    </>
  )
}
