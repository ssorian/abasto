import { PlusIcon, Trash2Icon } from 'lucide-react'

import { ProductPicker } from '#/components/product-picker'
import { CustomerButton } from '#/modules/customers/components/customer-button'
import { Field, TextInput } from '#/modules/customers/forms/form-field'
import {
  pickerItems,
  rulesSummary,
} from '#/modules/customers/lib/customer-labels'
import { emptyRule } from '#/modules/customers/lib/customer-form'

import type { RuleDraft } from '#/modules/customers/lib/customer-form'
import type { PresentationOption } from '#/modules/customers/lib/customer-view'

type CommercialRulesFieldsProps = {
  rules: Array<RuleDraft>
  presentations: ReadonlyArray<PresentationOption>
  onChange: (rules: Array<RuleDraft>) => void
}

export function CommercialRulesFields({
  rules,
  presentations,
  onChange,
}: CommercialRulesFieldsProps) {
  const patch = (index: number, change: Partial<RuleDraft>) =>
    onChange(
      rules.map((rule, i) => (i === index ? { ...rule, ...change } : rule)),
    )

  const items = pickerItems(presentations)

  return (
    <>
      <div className="flex items-start justify-between gap-[15px] md:items-center">
        <div>
          <h3 className="text-base">Condiciones comerciales</h3>
          <p className="mt-2 text-xs leading-[1.8] text-[#a49197] md:text-sm">
            {rulesSummary(rules.length) ??
              'Se usa la condición de la presentación con mayor cantidad mínima alcanzada. Un precio pactado sustituye el precio de lista del almacén; el descuento se aplica sólo cuando no hay precio pactado.'}
          </p>
        </div>
        <CustomerButton
          className="min-h-[38px] px-2.5 py-2 text-xs md:min-h-[44px] md:px-[17px] md:py-2.5 md:text-sm"
          disabled={presentations.length === 0}
          onClick={() => onChange([...rules, emptyRule(presentations[0]?.id)])}
        >
          <PlusIcon className="size-[15px]" />
          Agregar condición
        </CustomerButton>
      </div>
      {rules.map((rule, index) => (
        <div
          key={index}
          className="flex flex-wrap items-start gap-3 border-b border-[#f0eae3] py-4 metrics:flex-nowrap metrics:items-end"
        >
          <Field label="Presentación" className="min-w-[130px] flex-[2]">
            <ProductPicker
              label="Presentación"
              products={items}
              value={rule.presentationId}
              onChange={(presentationId) => patch(index, { presentationId })}
            />
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
            className="mb-2 inline-flex size-9 items-center justify-center rounded-[7px] text-[#826c73] hover:bg-[#f6f0e9]"
            onClick={() => onChange(rules.filter((_, i) => i !== index))}
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      ))}
    </>
  )
}
