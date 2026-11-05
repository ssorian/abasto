import { useState } from 'react'
import { toast } from 'sonner'

import { CustomerButton } from '#/modules/customers/components/customer-button'
import { CustomerModal } from '#/modules/customers/components/customer-modal'
import { CommercialRulesFields } from '#/modules/customers/forms/commercial-rules-fields'
import {
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from '#/modules/customers/forms/form-field'
import {
  draftFromCustomer,
  draftToInput,
  emptyDraft,
} from '#/modules/customers/lib/customer-form'

import type { CustomerDraft } from '#/modules/customers/lib/customer-form'
import type { SaveCustomerInput } from '#/modules/customers/lib/customer-inputs'
import type {
  CustomerView,
  PresentationOption,
  RuleView,
} from '#/modules/customers/lib/customer-view'

type CustomerFormDialogProps = {
  /** Customer being edited; undefined creates a new one. */
  customer?: CustomerView
  rules: ReadonlyArray<RuleView>
  presentations: ReadonlyArray<PresentationOption>
  /** Resolves to true when saved, which closes the dialog. */
  onSubmit: (input: SaveCustomerInput) => Promise<boolean>
  onClose: () => void
}

export function CustomerFormDialog({
  customer,
  rules,
  presentations,
  onSubmit,
  onClose,
}: CustomerFormDialogProps) {
  const [draft, setDraft] = useState(() =>
    customer ? draftFromCustomer(customer, rules) : emptyDraft(),
  )
  const [saving, setSaving] = useState(false)
  const patch = (change: Partial<CustomerDraft>) =>
    setDraft((current) => ({ ...current, ...change }))

  async function save() {
    const parsed = draftToInput(draft)
    if (!parsed.ok) {
      toast.error(parsed.message)
      return
    }
    setSaving(true)
    const saved = await onSubmit(parsed.value)
    setSaving(false)
    if (saved) onClose()
  }

  return (
    <CustomerModal
      wide
      title={customer ? 'Editar cliente' : 'Nuevo cliente'}
      description="Las condiciones se aplican al crear pedidos nuevos. Los precios ya acordados en pedidos existentes se conservan."
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 metrics:grid-cols-3">
        <Field label="Nombre del negocio">
          <TextInput
            value={draft.name}
            onChange={(event) => patch({ name: event.target.value })}
          />
        </Field>
        <Field label="Contacto">
          <TextInput
            value={draft.contact}
            onChange={(event) => patch({ contact: event.target.value })}
          />
        </Field>
        <Field label="Teléfono">
          <TextInput
            value={draft.phone}
            onChange={(event) => patch({ phone: event.target.value })}
          />
        </Field>
        <Field label="Estado">
          <SelectInput
            value={draft.active ? 'Activo' : 'Inactivo'}
            onChange={(event) =>
              patch({ active: event.target.value === 'Activo' })
            }
          >
            <option>Activo</option>
            <option>Inactivo</option>
          </SelectInput>
        </Field>
      </div>
      <Field label="Domicilios · uno por línea">
        <TextArea
          rows={3}
          value={draft.addresses}
          onChange={(event) => patch({ addresses: event.target.value })}
        />
      </Field>
      <Field label="Notas">
        <TextInput
          value={draft.notes}
          onChange={(event) => patch({ notes: event.target.value })}
        />
      </Field>
      <label className="flex cursor-pointer items-center gap-[9px] text-[13px] leading-[1.6] text-[#3b4f41]">
        <input
          type="checkbox"
          className="size-[17px] flex-none accent-[#326447]"
          checked={draft.credit}
          onChange={(event) => patch({ credit: event.target.checked })}
        />
        Permitir ventas a crédito
      </label>
      {draft.credit && (
        <div className="grid grid-cols-1 gap-[15px] md:grid-cols-2">
          <Field label="Límite de crédito MXN">
            <TextInput
              type="number"
              min="0"
              step="0.01"
              value={draft.creditLimit}
              onChange={(event) => patch({ creditLimit: event.target.value })}
            />
          </Field>
          <Field label="Plazo en días desde el pedido">
            <TextInput
              type="number"
              min="0"
              step="1"
              value={draft.termsDays}
              onChange={(event) => patch({ termsDays: event.target.value })}
            />
          </Field>
        </div>
      )}
      <CommercialRulesFields
        rules={draft.rules}
        presentations={presentations}
        onChange={(next) => patch({ rules: next })}
      />
      <CustomerButton tone="primary" disabled={saving} onClick={save}>
        {saving ? 'Guardando…' : 'Guardar cliente'}
      </CustomerButton>
    </CustomerModal>
  )
}
