import {
  createFileRoute,
  getRouteApi,
  useNavigate,
} from '@tanstack/react-router'

import { CatalogPage } from '#/modules/store/components/catalog-page'
import { WarehousePicker } from '#/modules/store/components/warehouse-picker'
import { useStoreCart } from '#/modules/store/hooks/use-store-cart'
import { quantityIn } from '#/modules/store/lib/pick-list'

const parent = getRouteApi('/tienda')

export const Route = createFileRoute('/tienda/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { q?: string; marca?: string; categoria?: string } => ({
    ...(typeof search.q === 'string' && search.q ? { q: search.q } : {}),
    ...(typeof search.marca === 'string' && search.marca
      ? { marca: search.marca }
      : {}),
    ...(typeof search.categoria === 'string' && search.categoria
      ? { categoria: search.categoria }
      : {}),
  }),
  component: function StoreCatalog() {
    const { warehouses, warehouse, catalog } = parent.useLoaderData()
    const { q, marca, categoria } = Route.useSearch()
    const navigate = useNavigate({ from: '/tienda/' })
    const cart = useStoreCart(warehouse?.id ?? '')

    if (!warehouse) {
      return (
        <p className="st-stencil rounded-2xl border border-dashed border-st-line-strong bg-st-card p-8 text-center text-lg">
          La tienda aún no tiene almacenes disponibles
        </p>
      )
    }
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <h1 className="sr-only">Catálogo</h1>
        <WarehousePicker
          warehouses={warehouses}
          value={warehouse.id}
          onChange={(almacen) =>
            void navigate({
              search: {
                almacen,
                q: undefined,
                marca: undefined,
                categoria: undefined,
              },
            })
          }
        />
        <CatalogPage
          catalog={catalog}
          warehouseName={warehouse.name}
          query={q ?? ''}
          brand={marca}
          category={categoria}
          lines={cart.lines}
          onQueryChange={(value) =>
            void navigate({
              search: (prev) => ({ ...prev, q: value || undefined }),
              replace: true,
            })
          }
          onBrandChange={(value) =>
            void navigate({
              search: (prev) => ({ ...prev, marca: value }),
              replace: true,
            })
          }
          onCategoryChange={(value) =>
            void navigate({
              search: (prev) => ({ ...prev, categoria: value }),
              replace: true,
            })
          }
          onSet={(presentationId, quantity) =>
            quantityIn(cart.lines, presentationId) === 0
              ? cart.add(presentationId, quantity)
              : cart.setQuantity(presentationId, quantity)
          }
        />
      </div>
    )
  },
})
