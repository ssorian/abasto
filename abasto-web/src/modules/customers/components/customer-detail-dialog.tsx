import { CustomerButton } from '#/modules/customers/components/customer-button'
import { CustomerModal } from '#/modules/customers/components/customer-modal'
import { CustomerOrderHistory } from '#/modules/customers/components/customer-order-history'
import {
  contactLine,
  creditSummary,
  ruleLabel,
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
    >
      <div className="rounded-[10px] bg-[#f5f8fc] px-[18px] py-4 text-[13px] leading-[1.8] whitespace-pre-line text-[#637c99]">
        <p>{customer.addresses.join(' · ') || 'Sin domicilios registrados'}</p>
        {customer.notes && <p>{customer.notes}</p>}
        <p>{creditSummary(customer)}</p>
      </div>
      <h3 className="text-[17px] font-[650]">Condiciones comerciales</h3>
      {rules.length === 0 ? (
        <p className="text-[13px] text-[#6b819b]">
          Sin condiciones: compra a precio de lista.
        </p>
      ) : (
        <ul className="list-disc pl-5 text-[13px] leading-[1.9] text-[#31465e]">
          {rules.map((rule) => (
            <li key={`${rule.presentationId}:${rule.minQuantity}`}>
              {ruleLabel(rule, names)}
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <CustomerButton onClick={onEdit}>
          Editar cliente y condiciones
        </CustomerButton>
      )}
      <h3 className="mt-2 text-[17px] font-[650]">Historial de pedidos</h3>
      <CustomerOrderHistory customerId={customer.id} />
    </CustomerModal>
  )
}
