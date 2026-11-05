import { z } from 'zod'

/** Shape of a presentation set arriving at the server; the service owns the rules. */
export const presentationSetInput = z.object({
  presentations: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      factor: z.number(),
      barcode: z.string().nullish(),
      active: z.boolean().optional(),
    }),
  ),
  defaultIndex: z.number(),
})
