import { createFileRoute } from '@tanstack/react-router'

import { unwrap } from '#/lib/boundary'
import { OverviewPage } from '#/modules/overview/components/overview-page'
import { overviewFn } from '#/modules/overview/server/overview'

export const Route = createFileRoute('/')({
  loader: async () => unwrap(await overviewFn()),
  component: function Overview() {
    return <OverviewPage overview={Route.useLoaderData()} />
  },
})
