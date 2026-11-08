import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from '@tanstack/react-router'

import { CatalogPage } from '#/modules/store/components/catalog-page'
import { WarehousePicker } from '#/modules/store/components/warehouse-picker'
import { useStoreCart } from '#/modules/store/hooks/use-store-cart'

const parent = getRouteApi('/tienda')

export const Route = createFileRoute('/tienda/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { q?: string; categoria?: string } => ({
    ...(typeof search.q === 'string' && search.q ? { q: search.q } : {}),
    ...(typeof search.categoria === 'string' && search.categoria
      ? { categoria: search.categoria }
      : {}),
  }),
  component: function StoreCatalog() {
    const { warehouses, warehouse, catalog } = parent.useLoaderData()
    const { q, categoria } = Route.useSearch()
    const navigate = useNavigate({ from: '/tienda/' })
    const cart = useStoreCart(warehouse?.id ?? '')

    if (!warehouse) {
      return (
        <p className="rounded-2xl border border-dashed border-input bg-white/60 p-8 text-center font-semibold text-ink-figure">
          La tienda aún no tiene almacenes disponibles.
        </p>
      )
    }
    return (
      <div className="grid gap-5">
        <h1 className="sr-only">Catálogo</h1>
        <WarehousePicker
          warehouses={warehouses}
          value={warehouse.id}
          onChange={(almacen) =>
            void navigate({
              search: { almacen, q: undefined, categoria: undefined },
            })
          }
        />
        <CatalogPage
          catalog={catalog}
          warehouseName={warehouse.name}
          query={q ?? ''}
          category={categoria}
          onQueryChange={(value) =>
            void navigate({
              search: (prev) => ({ ...prev, q: value || undefined }),
              replace: true,
            })
          }
          onCategoryChange={(value) =>
            void navigate({
              search: (prev) => ({ ...prev, categoria: value }),
              replace: true,
            })
          }
          onAdd={cart.add}
        />
      </div>
    )
  },
})
