import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import { getCounterOverview } from '#/modules/counter/server/counter-overview'
import { previewQuote } from '#/modules/counter/server/quote-preview'
import { quoteOrderInput } from '#/modules/orders/server/order-inputs'
import { z } from 'zod'

const overviewInput = z.object({ warehouseId: z.string().min(1).optional() })

export const counterOverviewFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      getCounterOverview(actor, parseInput(overviewInput, data).warehouseId),
    ),
  )

export const quoteOrderFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      previewQuote(actor, parseInput(quoteOrderInput, data)),
    ),
  )
