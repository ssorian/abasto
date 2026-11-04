import { useState } from 'react'

import { publicCustomerId } from '#/shared/demo/customers'
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
  emptyDraft,
} from '#/modules/customers/lib/customer-draft'

import type {
  CustomerDraft,
  CustomerRecord,
} from '#/modules/customers/lib/customer-types'

type CustomerFormDialogProps = {
  /** Customer being edited; undefined creates a new one. */
  customer?: CustomerRecord
  onSubmit: (draft: CustomerDraft) => void
  onClose: () => void
}

export function CustomerFormDialog({
  customer,
  onSubmit,
  onClose,
}: CustomerFormDialogProps) {
  const [draft, setDraft] = useState(() =>
    customer ? draftFromCustomer(customer) : emptyDraft(),
  )
  const patch = (change: Partial<CustomerDraft>) =>
    setDraft((current) => ({ ...current, ...change }))
  const isPublic = draft.id === publicCustomerId

  return (
    <CustomerModal
      wide
      title={customer ? 'Editar cliente' : 'Nuevo cliente'}
      description="Las condiciones se aplican al crear pedidos nuevos. Los precios ya acordados se conservan."
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 metrics:grid-cols-3">
        <Field label="Nombre del negocio">
          <TextInput
            value={draft.name}
            disabled={isPublic}
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
            disabled={isPublic}
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
          disabled={isPublic}
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
        onChange={(rules) => patch({ rules })}
      />
      <CustomerButton tone="primary" onClick={() => onSubmit(draft)}>
        Guardar cliente
      </CustomerButton>
    </CustomerModal>
  )
}
