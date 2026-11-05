import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import {
  createWarehouse,
  listWarehouses,
} from '#/modules/warehouses/services/warehouses'

const createInput = z.object({ name: z.string() })

export const listWarehousesFn = createServerFn({ method: 'GET' }).handler(() =>
  runWithActor((actor) => listWarehouses(actor)),
)

export const createWarehouseFn = createServerFn({ method: 'POST' })
  .validator((data: { name: string }) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      createWarehouse(actor, parseInput(createInput, data)),
    ),
  )
