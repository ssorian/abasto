import { z } from 'zod'

const customerId = z.string().min(1)

export const storeAccessInput = z.object({ customerId })

export const grantStoreAccessInput = z.object({
  customerId,
  email: z.string(),
  password: z.string(),
})

export const storeAccessPasswordInput = z.object({
  customerId,
  password: z.string(),
})

export type GrantStoreAccessInput = z.infer<typeof grantStoreAccessInput>
