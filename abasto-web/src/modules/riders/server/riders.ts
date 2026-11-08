import { createServerFn } from '@tanstack/react-start'
import { parseInput } from '#/lib/boundary'
import { runWithActor } from '#/lib/server-actor'
import {
  assignInput,
  cancelAssignmentInput,
  createRiderInput,
  overviewInput,
  renameRiderInput,
  setActiveInput,
  settleInput,
} from '#/modules/riders/lib/rider-inputs'
import { getRidersOverview } from '#/modules/riders/server/riders-overview'
import {
  assignRider,
  cancelAssignment,
  settleAssignment,
} from '#/modules/riders/services/assignments'
import {
  createRider,
  renameRider,
  setRiderActive,
} from '#/modules/riders/services/riders'

export const ridersOverviewFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      getRidersOverview(actor, parseInput(overviewInput, data).warehouseId),
    ),
  )

export const createRiderFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      createRider(actor, parseInput(createRiderInput, data)),
    ),
  )

export const renameRiderFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      renameRider(actor, parseInput(renameRiderInput, data)),
    ),
  )

export const setRiderActiveFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      setRiderActive(actor, parseInput(setActiveInput, data)),
    ),
  )

export const assignRiderFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) => assignRider(actor, parseInput(assignInput, data))),
  )

export const settleAssignmentFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      settleAssignment(actor, parseInput(settleInput, data)),
    ),
  )

export const cancelAssignmentFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data)
  .handler(({ data }) =>
    runWithActor((actor) =>
      cancelAssignment(actor, parseInput(cancelAssignmentInput, data)),
    ),
  )
