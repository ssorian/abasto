import { z } from 'zod'

const id = z.string().min(1)
const cents = z.number().int()

export const warehouseInput = z.object({ warehouseId: id })

export const openCashInput = warehouseInput.extend({ openingCents: cents })

export const closeCashInput = warehouseInput.extend({ countedCents: cents })

/** Entry or withdrawal: the service validates the amount and the reason. */
export const cashMovementInput = warehouseInput.extend({
  amountCents: cents,
  reason: z.string(),
})
