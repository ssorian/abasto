import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

import { PageHeading } from '#/components/page-heading'
import { CustomerButton } from '#/modules/customers/components/customer-button'
import { CustomerDetailDialog } from '#/modules/customers/components/customer-detail-dialog'
import { CustomersTable } from '#/modules/customers/components/customers-table'
import { CustomerFormDialog } from '#/modules/customers/forms/customer-form-dialog'
import { useSaveCustomer } from '#/modules/customers/hooks/use-customers'
import { filterCustomers } from '#/modules/customers/lib/customer-search'

import type { PresentationOption } from '#/modules/customers/lib/customer-view'
import type { CustomersOverview } from '#/modules/customers/server/customers'

type Editor = { customerId?: string } | undefined

type CustomersPageProps = {
  overview: CustomersOverview
  presentations: ReadonlyArray<PresentationOption>
}

export function CustomersPage({ overview, presentations }: CustomersPageProps) {
  const { canManage, customers, rules } = overview
  const save = useSaveCustomer()
  const [query, setQuery] = useState('')
  const [detailId, setDetailId] = useState<string>()
  const [editor, setEditor] = useState<Editor>()

  const detail = customers.find(({ id }) => id === detailId)
  const editing = customers.find(({ id }) => id === editor?.customerId)

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
            Distribuidores autorizados, sus condiciones y su historial de
            pedidos.
          </p>
        </div>
        {canManage && (
          <CustomerButton
            tone="primary"
            className="min-h-[38px] px-2.5 py-2 text-xs md:min-h-[44px] md:px-[17px] md:py-2.5 md:text-sm"
            onClick={() => setEditor({})}
          >
            <PlusIcon className="size-4" />
            Nuevo cliente
          </CustomerButton>
        )}
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
        rules={rules}
        onView={setDetailId}
      />
      {detail && (
        <CustomerDetailDialog
          customer={detail}
          rules={rules[detail.id] ?? []}
          presentations={presentations}
          canManage={canManage}
          onClose={() => setDetailId(undefined)}
          onEdit={() => {
            setEditor({ customerId: detail.id })
            setDetailId(undefined)
          }}
        />
      )}
      {canManage && editor && (
        <CustomerFormDialog
          key={editor.customerId ?? 'new'}
          customer={editing}
          rules={editing ? (rules[editing.id] ?? []) : []}
          presentations={presentations}
          onSubmit={save}
          onClose={() => setEditor(undefined)}
        />
      )}
    </>
  )
}
