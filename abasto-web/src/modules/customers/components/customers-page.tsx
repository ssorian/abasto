import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { PageHeading } from '#/components/page-heading'
import { CustomerButton } from '#/modules/customers/components/customer-button'
import { CustomerDetailDialog } from '#/modules/customers/components/customer-detail-dialog'
import { CustomersTable } from '#/modules/customers/components/customers-table'
import { CustomerFormDialog } from '#/modules/customers/forms/customer-form-dialog'
import { SensitiveOperationDialog } from '#/modules/customers/forms/sensitive-operation-dialog'
import { useCustomers } from '#/modules/customers/hooks/use-customers'
import {
  hasChanges,
  reviewCustomerChange,
} from '#/modules/customers/lib/customer-review'
import { filterCustomers } from '#/modules/customers/lib/customer-search'
import { validateCustomerDraft } from '#/modules/customers/schemas/customer-schema'

import type {
  CustomerDraft,
  CustomerRecord,
} from '#/modules/customers/lib/customer-types'

/** Signed-in demo user who files the sensitive operations. */
const REQUESTER = 'Mariana Ruiz'

type Editor = { customerId?: string } | undefined

export function CustomersPage() {
  const { customers, orders, upsertCustomer } = useCustomers()
  const [query, setQuery] = useState('')
  const [detailId, setDetailId] = useState<string>()
  const [editor, setEditor] = useState<Editor>()
  const [pending, setPending] = useState<CustomerRecord>()

  const detail = customers.find(({ id }) => id === detailId)
  const editing = customers.find(({ id }) => id === editor?.customerId)
  const orderCounts = new Map<string, number>()
  for (const order of orders)
    orderCounts.set(
      order.customerId,
      (orderCounts.get(order.customerId) ?? 0) + 1,
    )

  const commit = (customer: CustomerRecord) => {
    upsertCustomer(customer)
    toast.success('Cliente guardado.')
    setPending(undefined)
    setEditor(undefined)
  }

  const submit = (draft: CustomerDraft) => {
    const result = validateCustomerDraft(
      draft,
      editing,
      () => `CLI-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    )
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    if (!hasChanges(editing, result.customer)) {
      toast.error('No hay cambios que registrar.')
      return
    }
    if (reviewCustomerChange(editing, result.customer).sensitive) {
      setPending(result.customer)
      return
    }
    commit(result.customer)
  }

  return (
    <>
      <PageHeading
        eyebrow="ABARROTEROS · ALMACÉN"
        title="Clientes"
        description="Conoce a quién le vendes y bajo qué condiciones."
      />
      <div className="mb-[23px] flex items-start justify-between gap-[15px] md:items-center">
        <div>
          <h2 className="text-[19px] font-[650] tracking-[-0.4px] md:text-xl">
            Cartera de clientes
          </h2>
          <p className="mt-[7px] text-xs text-[#8390a2] md:text-sm">
            Contactos, historial y condiciones para vender por cualquier canal.
          </p>
        </div>
        <CustomerButton
          tone="primary"
          className="min-h-[38px] px-2.5 py-2 text-xs md:min-h-[44px] md:px-[17px] md:py-2.5 md:text-sm"
          onClick={() => setEditor({})}
        >
          <PlusIcon className="size-4" />
          Nuevo cliente
        </CustomerButton>
      </div>
      <div className="my-5 flex flex-wrap gap-3">
        <input
          aria-label="Buscar cliente"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, contacto o teléfono…"
          className="min-w-0 flex-[1_1_100%] rounded-lg border border-[#dee4dc] bg-white px-3 py-2.5 text-[13px] text-[#37473c] md:flex-1"
        />
      </div>
      <CustomersTable
        customers={filterCustomers(customers, query)}
        orderCounts={orderCounts}
        onView={setDetailId}
      />
      {detail && (
        <CustomerDetailDialog
          customer={detail}
          orders={orders.filter(({ customerId }) => customerId === detail.id)}
          onClose={() => setDetailId(undefined)}
          onEdit={() => {
            setEditor({ customerId: detail.id })
            setDetailId(undefined)
          }}
        />
      )}
      {editor && (
        <CustomerFormDialog
          key={editor.customerId ?? 'new'}
          customer={editing}
          onSubmit={submit}
          onClose={() => setEditor(undefined)}
        />
      )}
      {pending && (
        <SensitiveOperationDialog
          requester={REQUESTER}
          customerName={pending.name}
          review={reviewCustomerChange(editing, pending)}
          onCancel={() => setPending(undefined)}
          onConfirm={() => commit(pending)}
        />
      )}
    </>
  )
}
