import { z } from 'zod'

const id = z.string().min(1)

export const receivablesInput = z.object({ warehouseId: id.optional() })

export const customerIdInput = z.object({ customerId: id })

export const authorizationIdInput = z.object({ authorizationId: id })

export const abonoInput = z.object({
  warehouseId: id,
  customerId: id,
  amountCents: z.number().int(),
})
