import { createServerFn } from '@tanstack/react-start'
import { runWithActor } from '#/lib/server-actor'
import { getOverview } from '#/modules/overview/services/overview'

export const overviewFn = createServerFn({ method: 'GET' }).handler(() =>
  runWithActor((actor) => getOverview(actor)),
)
