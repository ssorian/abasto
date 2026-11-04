import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatCents } from '#/modules/customers/lib/customer-format'

import type { CustomerOrderSummary } from '#/modules/customers/lib/customer-types'

const head =
  'h-auto bg-[#f8fafc] px-[11px] py-[13px] text-[11px] font-semibold tracking-[0.35px] text-[#78879b] md:px-3.5 md:py-[15px]'
const cell =
  'border-t border-row-border px-[11px] py-[13px] text-[13px] md:px-3.5 md:py-4'

/** Orders registered without prior payment terms have nothing to reconcile yet. */
const isUnreconciled = (order: CustomerOrderSummary) =>
  order.channel === 'Sin registrar'

export function CustomerOrderHistory({
  orders,
}: {
  orders: ReadonlyArray<CustomerOrderSummary>
}) {
  return (
    <div className="w-full overflow-x-auto">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className={head}>Pedido</TableHead>
            <TableHead className={head}>Canal / estado</TableHead>
            <TableHead className={head}>Venta neta</TableHead>
            <TableHead className={head}>Cobrado neto</TableHead>
            <TableHead className={head}>Saldo del pedido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="border-0 hover:bg-[#fafcff]">
              <TableCell className={`${cell} min-w-[170px] whitespace-normal`}>
                {order.id}
                <small className="mt-1 block text-[11px] text-[#7d8b9b]">
                  {order.date}
                </small>
              </TableCell>
              <TableCell className={cell}>
                {order.channel}
                <small className="mt-1 block text-[11px] text-[#7d8b9b]">
                  {order.status}
                </small>
              </TableCell>
              <TableCell className={cell}>
                {formatCents(order.soldCents)}
              </TableCell>
              <TableCell className={cell}>
                {isUnreconciled(order)
                  ? 'Sin registro previo'
                  : formatCents(order.paidCents)}
              </TableCell>
              <TableCell className={cell}>
                {isUnreconciled(order)
                  ? 'Por conciliar'
                  : formatCents(order.soldCents - order.paidCents)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {orders.length === 0 && (
        <p className="flex flex-col items-center gap-[15px] rounded-[14px] border border-dashed border-[#dbe5ef] bg-white px-[25px] py-[60px] text-center text-sm text-[#6b819b]">
          Aún no hay pedidos de este cliente.
        </p>
      )}
    </div>
  )
}
