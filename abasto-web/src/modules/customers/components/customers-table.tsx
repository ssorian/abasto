import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { CustomerButton } from '#/modules/customers/components/customer-button'
import {
  statusLabel,
  termsLabel,
} from '#/modules/customers/lib/customer-labels'

import type {
  CustomerView,
  RuleView,
} from '#/modules/customers/lib/customer-view'

type CustomersTableProps = {
  customers: ReadonlyArray<CustomerView>
  rules: Readonly<Partial<Record<string, ReadonlyArray<RuleView>>>>
  onView: (customerId: string) => void
}

const head =
  'h-auto bg-[#f8fafc] px-[11px] py-[13px] text-[11px] font-semibold tracking-[0.35px] text-[#78879b] md:px-3.5 md:py-[15px]'
const cell =
  'border-t border-row-border px-[11px] py-[13px] text-[13px] md:px-3.5 md:py-4'
const note = 'mt-1 block text-[11px] leading-normal text-[#7d8b9b]'

export function CustomersTable({
  customers,
  rules,
  onView,
}: CustomersTableProps) {
  if (customers.length === 0) {
    return (
      <p className="rounded-[14px] border border-dashed border-[#dbe5ef] bg-white px-[25px] py-[60px] text-center text-sm text-[#6b819b]">
        No hay clientes que coincidan.
      </p>
    )
  }
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#e3e9f0] bg-white">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className={head}>Cliente</TableHead>
            <TableHead className={head}>Contacto</TableHead>
            <TableHead className={head}>Condiciones</TableHead>
            <TableHead className={head} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const count = rules[customer.id]?.length ?? 0
            return (
              <TableRow
                key={customer.id}
                className="border-0 hover:bg-[#fafcff]"
              >
                <TableCell
                  className={`${cell} min-w-[170px] whitespace-normal`}
                >
                  <strong>{customer.name}</strong>
                  <small className={note}>{statusLabel(customer)}</small>
                </TableCell>
                <TableCell className={cell}>
                  {customer.contact || '—'}
                  <small className={note}>{customer.phone}</small>
                </TableCell>
                <TableCell className={cell}>
                  {termsLabel(customer)}
                  {count > 0 && (
                    <small className={note}>
                      {count} condiciones comerciales
                    </small>
                  )}
                </TableCell>
                <TableCell className={cell}>
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
