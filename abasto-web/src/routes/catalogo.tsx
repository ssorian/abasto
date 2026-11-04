import { createFileRoute } from '@tanstack/react-router'

import { CatalogPage } from '#/modules/catalog/components/catalog-page'

export const Route = createFileRoute('/catalogo')({ component: CatalogPage })
