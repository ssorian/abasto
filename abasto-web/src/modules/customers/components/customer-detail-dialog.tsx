import { CustomerButton } from '#/modules/customers/components/customer-button'
import { CustomerModal } from '#/modules/customers/components/customer-modal'
import { CustomerOrderHistory } from '#/modules/customers/components/customer-order-history'
import {
  contactLine,
  creditSummary,
} from '#/modules/customers/lib/customer-format'

import type {
  CustomerOrderSummary,
  CustomerRecord,
} from '#/modules/customers/lib/customer-types'

type CustomerDetailDialogProps = {
  customer: CustomerRecord
  orders: ReadonlyArray<CustomerOrderSummary>
  onEdit: () => void
  onClose: () => void
}

export function CustomerDetailDialog({
  customer,
  orders,
  onEdit,
  onClose,
}: CustomerDetailDialogProps) {
  return (
    <CustomerModal
      wide
      title={customer.name}
      description={contactLine(customer)}
      onClose={onClose}
    >
      <div className="rounded-[10px] bg-[#f5f8fc] px-[18px] py-4 text-[13px] leading-[1.8] whitespace-pre-line text-[#637c99]">
        <p>{customer.addresses.join(' · ') || 'Sin domicilios registrados'}</p>
        <p>{customer.notes}</p>
        <p>{creditSummary(customer)}</p>
      </div>
      <CustomerButton onClick={onEdit}>
        Editar cliente y condiciones
      </CustomerButton>
      <h3 className="mt-6 mb-3.5 text-[17px] font-[650]">
        Historial de pedidos
      </h3>
      <CustomerOrderHistory orders={orders} />
    </CustomerModal>
  )
}
