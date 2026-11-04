import { createFileRoute } from '@tanstack/react-router'

import { CustomersPage } from '#/modules/customers/components/customers-page'

export const Route = createFileRoute('/clientes')({ component: CustomersPage })
