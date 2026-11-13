import { CustomerButton } from '#/modules/customers/components/customer-button'
import { CustomerModal } from '#/modules/customers/components/customer-modal'
import { CustomerOrderHistory } from '#/modules/customers/components/customer-order-history'
import { StatusBadge } from '#/modules/customers/components/status-badge'
import { StoreAccessPanel } from '#/modules/customers/components/store-access-panel'
import {
  contactLine,
  ruleLabel,
  statusLabel,
} from '#/modules/customers/lib/customer-labels'

import type {
  CustomerView,
  PresentationOption,
  RuleView,
} from '#/modules/customers/lib/customer-view'

type CustomerDetailDialogProps = {
  customer: CustomerView
  rules: ReadonlyArray<RuleView>
  presentations: ReadonlyArray<PresentationOption>
  /** Only the owner edits. */
  canManage: boolean
  onEdit: () => void
  onClose: () => void
}

export function CustomerDetailDialog({
  customer,
  rules,
  presentations,
  canManage,
  onEdit,
  onClose,
}: CustomerDetailDialogProps) {
  const names = new Map(presentations.map(({ id, label }) => [id, label]))
  return (
    <CustomerModal
      wide
      title={customer.name}
      description={contactLine(customer)}
      onClose={onClose}
      headerAction={
        canManage ? (
          <CustomerButton className="min-h-[38px] px-3.5" onClick={onEdit}>
            Editar
          </CustomerButton>
        ) : undefined
      }
    >
      <div className="rounded-[10px] bg-[#fbf9f6] px-[18px] py-4 text-[13px] leading-[1.8] whitespace-pre-line text-[#8d6f79]">
        <p>{customer.addresses.join(' · ') || 'Sin domicilios registrados'}</p>
        {customer.notes && <p>{customer.notes}</p>}
        <StatusBadge active={customer.active}>
          {statusLabel(customer)}
        </StatusBadge>
      </div>
      <h3 className="text-[17px] font-[650]">Condiciones comerciales</h3>
      {rules.length === 0 ? (
        <p className="text-[13px] text-[#91757e]">
          Sin condiciones: compra a precio de lista.
        </p>
      ) : (
        <ul className="list-disc pl-5 text-[13px] leading-[1.9] text-[#503f45]">
          {rules.map((rule) => (
            <li key={`${rule.presentationId}:${rule.minQuantity}`}>
              {ruleLabel(rule, names)}
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <>
          <h3 className="mt-2 text-[17px] font-[650]">Acceso a la tienda</h3>
          <StoreAccessPanel customerId={customer.id} />
        </>
      )}
      <h3 className="mt-2 text-[17px] font-[650]">Historial de pedidos</h3>
      <CustomerOrderHistory customerId={customer.id} />
    </CustomerModal>
  )
}
