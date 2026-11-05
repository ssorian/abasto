import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { useCustomerOrders } from '#/modules/customers/hooks/use-customers'
import { formatOrderDate } from '#/modules/customers/lib/customer-labels'
import { formatCents } from '#/modules/pricing/lib/money'

const head =
  'h-auto bg-[#fcfaf8] px-[11px] py-[13px] text-[11px] font-semibold tracking-[0.35px] text-[#947f86] md:px-3.5 md:py-[15px]'
const cell =
  'border-t border-row-border px-[11px] py-[13px] text-[13px] md:px-3.5 md:py-4'
const message =
  'flex flex-col items-center gap-[15px] rounded-[14px] border border-dashed border-[#e6dfeb] bg-white px-[25px] py-[60px] text-center text-sm text-[#91757e]'

/** Orders the customer placed in the warehouses the signed-in user operates. */
export function CustomerOrderHistory({ customerId }: { customerId: string }) {
  const { state, reload } = useCustomerOrders(customerId)

  if (state.status === 'loading') {
    return <p className={message}>Cargando pedidos…</p>
  }
  if (state.status === 'error') {
    return (
      <p className={message}>
        {state.message}
        <button
          type="button"
          className="font-[650] text-ink-link hover:underline"
          onClick={() => void reload()}
        >
          Reintentar
        </button>
      </p>
    )
  }
  if (state.orders.length === 0) {
    return <p className={message}>Aún no hay pedidos de este cliente.</p>
  }
  return (
    <div className="w-full overflow-x-auto">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className={head}>Fecha</TableHead>
            <TableHead className={head}>Almacén</TableHead>
            <TableHead className={head}>Estado</TableHead>
            <TableHead className={head}>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {state.orders.map((order) => (
            <TableRow key={order.id} className="border-0 hover:bg-[#fefdfb]">
              <TableCell className={cell}>
                {formatOrderDate(order.createdAt)}
              </TableCell>
              <TableCell className={cell}>{order.warehouseName}</TableCell>
              <TableCell className={cell}>{order.status}</TableCell>
              <TableCell className={cell}>
                {formatCents(order.totalCents)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
