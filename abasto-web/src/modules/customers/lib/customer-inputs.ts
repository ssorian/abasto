import { z } from 'zod'

const id = z.string().min(1)
const whole = z.number().int()

const ruleInput = z.object({
  presentationId: id,
  minQuantity: whole,
  discountBps: whole.optional(),
  priceCents: whole.optional(),
})

/** Create (no id) or edit a customer with its commercial rules. */
export const saveCustomerInput = z.object({
  id: id.optional(),
  name: z.string(),
  contact: z.string(),
  phone: z.string(),
  notes: z.string(),
  addresses: z.array(z.string()),
  active: z.boolean(),
  rules: z.array(ruleInput),
})

export const customerOrdersInput = z.object({ customerId: id })

export type SaveCustomerInput = z.infer<typeof saveCustomerInput>
export type RuleInput = z.infer<typeof ruleInput>

/** Shared by the form and the server so both name the same range. */
export const DISCOUNT_RANGE_MESSAGE = 'El descuento debe estar entre 0 y 100 %.'
