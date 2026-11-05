import { z } from 'zod'

const id = z.string().min(1)
const whole = z.number().int()

export const transfersOverviewInput = z.object({ warehouseId: id })

export const dispatchInput = z.object({
  fromWarehouseId: id,
  toWarehouseId: id,
  notes: z.string().optional(),
  items: z.array(z.object({ productId: id, quantity: whole })),
})

export const receiveInput = z.object({
  transferId: id,
  lines: z.array(z.object({ lineId: id, receivedQuantity: whole })),
})

export const cancelInput = z.object({ transferId: id })
