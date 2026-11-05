import { z } from 'zod'

const id = z.string().min(1)

export const createOrderInput = z.object({
  warehouseId: id,
  customerId: id,
  notes: z.string().optional(),
  lines: z.array(z.object({ presentationId: id, quantity: z.number().int() })),
})

export const orderIdInput = z.object({ orderId: id })

export const reservationHoursInput = z.object({ hours: z.number().int() })

/** Same lines as an order, without notes: a read-only price quote. */
export const quoteOrderInput = createOrderInput.omit({ notes: true })
