import { z } from 'zod'

const id = z.string().min(1)

const cartLine = z.object({
  presentationId: id,
  quantity: z.number(),
})

export const storeWarehouseInput = z.object({ warehouseId: id })

export const storeCartInput = z.object({
  warehouseId: id,
  lines: z.array(cartLine).max(200),
})

export const placeStoreOrderInput = storeCartInput.extend({
  notes: z.string().max(500).optional(),
})

export const cancelMyOrderInput = z.object({ orderId: id })

export type StoreCartLineInput = z.infer<typeof cartLine>
