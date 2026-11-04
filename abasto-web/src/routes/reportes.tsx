import { createFileRoute } from '@tanstack/react-router'

import { ReportsPage } from '#/modules/reports/components/reports-page'

export const Route = createFileRoute('/reportes')({ component: ReportsPage })
