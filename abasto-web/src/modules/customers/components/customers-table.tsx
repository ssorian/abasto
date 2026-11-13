import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { CustomerButton } from '#/modules/customers/components/customer-button'
import { statusLabel } from '#/modules/customers/lib/customer-labels'

import { StatusBadge } from '#/modules/customers/components/status-badge'

import type {
  CustomerView,
  RuleView,
} from '#/modules/customers/lib/customer-view'

type CustomersTableProps = {
  customers: ReadonlyArray<CustomerView>
  rules: Readonly<Partial<Record<string, ReadonlyArray<RuleView>>>>
  /** The owner sees whether each customer has store access. */
  canManage: boolean
  onView: (customerId: string) => void
}

const head =
  'h-auto bg-[#fcfaf8] px-[11px] py-[13px] text-[11px] font-semibold tracking-[0.35px] text-[#947f86] md:px-3.5 md:py-[15px]'
const cell =
  'border-t border-row-border px-[11px] py-[13px] text-[13px] md:px-3.5 md:py-4'
const note = 'mt-1 block text-[11px] leading-normal text-[#958389]'

export function CustomersTable({
  customers,
  rules,
  canManage,
  onView,
}: CustomersTableProps) {
  if (customers.length === 0) {
    return (
      <p className="rounded-[14px] border border-dashed border-[#e6dfeb] bg-white px-[25px] py-[60px] text-center text-sm text-[#91757e]">
        No hay clientes que coincidan.
      </p>
    )
  }
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#f0eae3] bg-white">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className={head}>Cliente</TableHead>
            <TableHead className={head}>Contacto</TableHead>
            <TableHead className={head}>Condiciones</TableHead>
            {canManage && <TableHead className={head}>Tienda</TableHead>}
            <TableHead className={head}>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const count = rules[customer.id]?.length ?? 0
            return (
              <TableRow
                key={customer.id}
                className="border-0 hover:bg-[#fefdfb]"
              >
                <TableCell
                  className={`${cell} min-w-[170px] whitespace-normal`}
                >
                  <strong>{customer.name}</strong>
                  <StatusBadge active={customer.active}>
                    {statusLabel(customer)}
                  </StatusBadge>
                </TableCell>
                <TableCell className={cell}>
                  {customer.contact || '—'}
                  <small className={note}>{customer.phone}</small>
                </TableCell>
                <TableCell className={cell}>
                  {count > 0
                    ? count === 1
                      ? '1 condición comercial'
                      : `${count} condiciones comerciales`
                    : 'Precio de lista'}
                </TableCell>
                {canManage && (
                  <TableCell className={cell}>
                    {customer.hasStoreAccess ? 'Con acceso' : 'Sin acceso'}
                  </TableCell>
                )}
                <TableCell className={`${cell} text-right`}>
                  <CustomerButton onClick={() => onView(customer.id)}>
                    Ver cliente
                  </CustomerButton>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
