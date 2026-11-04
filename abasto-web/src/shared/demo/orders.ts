import type { OrderLine, PendingOrder } from './types'

type OrderSeed = Omit<PendingOrder, 'totalCents' | 'status'>

const orderSeeds: Array<OrderSeed> = [
  {
    id: 'ABR-4821',
    customerId: 'cli-0',
    warehouse: 'Centro',
    lines: [
      { productId: 'coca', quantity: 240, unitPriceCents: 1825 },
      { productId: 'nutrioli', quantity: 4, unitPriceCents: 3800 },
    ],
  },
  {
    id: 'ABR-4822',
    customerId: 'cli-1',
    warehouse: 'Centro',
    lines: [
      { productId: 'sabritas', quantity: 180, unitPriceCents: 1620 },
      { productId: 'lala', quantity: 96, unitPriceCents: 2700 },
    ],
  },
  {
    id: 'ABR-4823',
    customerId: 'cli-2',
    warehouse: 'Centro',
    lines: [{ productId: 'moderna', quantity: 480, unitPriceCents: 600 }],
  },
]

export const lineTotalCents = (line: OrderLine) =>
  line.quantity * line.unitPriceCents

export const demoPendingOrders: ReadonlyArray<PendingOrder> = orderSeeds.map(
  (order) => ({
    ...order,
    status: 'Reservado',
    totalCents: order.lines.reduce(
      (sum, line) => sum + lineTotalCents(line),
      0,
    ),
  }),
)
