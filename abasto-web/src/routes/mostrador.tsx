import { createFileRoute } from '@tanstack/react-router'

import { CounterPage } from '#/modules/counter/components/counter-page'

export const Route = createFileRoute('/mostrador')({ component: CounterPage })
