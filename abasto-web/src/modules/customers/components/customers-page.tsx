import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

import { PageHeading } from '#/components/page-heading'
import { CustomerButton } from '#/modules/customers/components/customer-button'
import { CustomerDetailDialog } from '#/modules/customers/components/customer-detail-dialog'
import { CustomersTable } from '#/modules/customers/components/customers-table'
import { CustomerFormDialog } from '#/modules/customers/forms/customer-form-dialog'
import { useSaveCustomer } from '#/modules/customers/hooks/use-customers'
import { filterCustomers } from '#/modules/customers/lib/customer-search'
import { activeFirst } from '#/modules/customers/lib/customer-sort'
import { selectableOptions } from '#/modules/customers/lib/customer-labels'

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
        title="Clientes"
        description="Conoce a quién le vendes y bajo qué condiciones."
        actions={
          <>
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
          </>
        }
      />
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
        customers={activeFirst(filterCustomers(customers, query))}
        canManage={canManage}
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
          presentations={selectableOptions(
            presentations,
            (editing ? (rules[editing.id] ?? []) : []).map(
              (rule) => rule.presentationId,
            ),
          )}
          onSubmit={save}
          onClose={() => setEditor(undefined)}
        />
      )}
    </>
  )
}
