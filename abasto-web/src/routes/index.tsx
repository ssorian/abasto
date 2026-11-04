import { createFileRoute } from '@tanstack/react-router'

import { OverviewPage } from '#/modules/overview/components/overview-page'

export const Route = createFileRoute('/')({ component: OverviewPage })
