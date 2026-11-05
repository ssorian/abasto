import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { emailSchema, parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import { warehouseRoles } from '#/modules/access/db/schema'
import {
  assignWarehouse,
  createStaffUser,
  listUsers,
  unassignWarehouse,
} from '#/modules/access/services/access'

const newUserInput = z.object({
  name: z.string(),
  email: emailSchema,
  password: z.string(),
})
const assignmentKey = { userId: z.string(), warehouseId: z.string() }
const assignInput = z.object({
  ...assignmentKey,
  role: z.enum(warehouseRoles, { message: 'Elige un rol válido.' }),
})
const unassignInput = z.object(assignmentKey)

export const listUsersFn = createServerFn({ method: 'GET' }).handler(() =>
  runWithActor((actor) => listUsers(actor)),
)

export const createStaffUserFn = createServerFn({ method: 'POST' })
  .validator((data: z.input<typeof newUserInput>) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      createStaffUser(actor, parseInput(newUserInput, data)),
    ),
  )

export const assignWarehouseFn = createServerFn({ method: 'POST' })
  .validator((data: z.input<typeof assignInput>) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      assignWarehouse(actor, parseInput(assignInput, data)),
    ),
  )

export const unassignWarehouseFn = createServerFn({ method: 'POST' })
  .validator((data: z.input<typeof unassignInput>) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      unassignWarehouse(actor, parseInput(unassignInput, data)),
    ),
  )
