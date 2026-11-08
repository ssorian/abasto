import { z } from 'zod'

const id = z.string().min(1)
const whole = z.number().int()
const boxesAndUnits = { boxes: whole.optional(), units: whole.optional() }

export const overviewInput = z.object({ warehouseId: id.optional() })

export const createRiderInput = z.object({
  warehouseId: id,
  name: z.string(),
})

export const renameRiderInput = z.object({ riderId: id, name: z.string() })

export const setActiveInput = z.object({ riderId: id, active: z.boolean() })

export const assignInput = z.object({
  riderId: id,
  lines: z.array(z.object({ productId: id, ...boxesAndUnits })),
})

export const settleInput = z.object({
  assignmentId: id,
  deliveredCents: whole,
  lines: z.array(z.object({ lineId: id, ...boxesAndUnits })),
})

export const cancelAssignmentInput = z.object({ assignmentId: id })
