import { StatusBadge } from '#/components/status-badge'
import { SupplierSelect } from '#/components/supplier-select'
import { ProductImage } from '#/components/product-image'
import { ActionButton } from '#/modules/inventory/components/action-button'
import { EmptyPanel } from '#/modules/inventory/components/empty-panel'
import { HeldBreakdown } from '#/modules/inventory/components/held-breakdown'
import {
  ListBody,
  ListCell,
  ListHead,
  ListPanel,
  ListRow,
  ListTable,
} from '#/modules/inventory/components/list-panel'
import { ProductCards } from '#/modules/inventory/components/product-cards'
import { Picker } from '#/modules/inventory/components/picker'
import { SearchBox } from '#/components/search-box'
import { StockBadge } from '#/modules/inventory/components/stock-badge'
import { dateLabel } from '#/modules/inventory/lib/format'
import { formatQuantity } from '#/modules/inventory/lib/quantity'
import type { PackInfo } from '#/modules/inventory/lib/quantity'
import {
  expiryState,
  productStatus,
  statusFilters,
} from '#/modules/inventory/lib/stock-metrics'
import type { StatusFilter } from '#/modules/inventory/lib/stock-metrics'
import type { ProductStock } from '#/modules/inventory/services/stock-reads'

type ProductsTabProps = {
  rows: ReadonlyArray<ProductStock>
  total: number
  packs: ReadonlyMap<string, PackInfo>
  today: string
  canManage: boolean
  query: string
  onQueryChange: (value: string) => void
  filter: StatusFilter
  onFilterChange: (value: StatusFilter) => void
  suppliers: ReadonlyArray<{ id: string; name: string; active: boolean }>
  supplierId: string
  onSupplierChange: (id: string) => void
  onLots: (row: ProductStock) => void
  onMinimum: (productId: string) => void
}

/** Stock per product in the selected warehouse. */
export function ProductsTab({
  rows,
  total,
  packs,
  today,
  canManage,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  suppliers,
  supplierId,
  onSupplierChange,
  onLots,
  onMinimum,
}: ProductsTabProps) {
  return (
    <>
      <div className="mb-[15px] flex flex-wrap items-center gap-2.5 md:mb-[18px] md:flex-nowrap md:gap-3">
        <SearchBox
          label="Buscar producto"
          placeholder="Buscar por nombre o SKU..."
          value={query}
          onChange={onQueryChange}
        />
        <Picker
          label="Estado"
          value={filter}
          onChange={(value) => onFilterChange(value as StatusFilter)}
          options={statusFilters}
          className="data-[size=default]:h-9 text-xs md:data-[size=default]:h-[43px] md:text-sm"
        />
        <SupplierSelect
          suppliers={suppliers}
          value={supplierId}
          onChange={onSupplierChange}
        />
      </div>
      {rows.length ? (
        <>
          <ProductCards
            rows={rows}
            packs={packs}
            today={today}
            canManage={canManage}
            onLots={onLots}
            onMinimum={onMinimum}
          />
          <ListPanel className="max-md:hidden">
            <ListTable>
              <ListHead>
                {[
                  'Producto',
                  'Existencias',
                  'Mínimo',
                  'Estado',
                  'Caducidad',
                  '',
                ]}
              </ListHead>
              <ListBody>
                {rows.map((row) => {
                  const pack = packs.get(row.productId) ?? {
                    packName: row.unit,
                    factor: 1,
                    unit: row.unit,
                  }
                  const nextExpiry = row.lots.find((lot) => lot.expiresOn)
                  const state = expiryState(
                    nextExpiry?.expiresOn ?? null,
                    today,
                  )
                  return (
                    <ListRow key={row.productId}>
                      <ListCell>
                        <span className="flex items-center gap-3">
                          <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#faf9f7]">
                            <ProductImage
                              src={row.imageUrl}
                              name={row.name}
                              className="size-full object-contain p-1 mix-blend-multiply"
                              placeholderClassName="size-5"
                            />
                          </span>
                          <span>
                            <strong>{row.name}</strong>
                            <small className="block text-[#907e84]">
                              {row.sku}
                            </small>
                          </span>
                        </span>
                      </ListCell>
                      <ListCell>
                        <strong>{formatQuantity(row.onHand, pack)}</strong>
                        {pack.factor > 1 && row.onHand >= pack.factor && (
                          <small className="block text-[#907e84]">
                            {formatQuantity(row.onHand, {
                              packName: row.unit,
                              factor: 1,
                              unit: row.unit,
                            })}
                          </small>
                        )}
                        <HeldBreakdown row={row} pack={pack} />
                      </ListCell>
                      <ListCell>
                        {row.minimum > 0
                          ? formatQuantity(row.minimum, pack)
                          : '—'}
                      </ListCell>
                      <ListCell>
                        <StockBadge value={productStatus(row)} dot />
                      </ListCell>
                      <ListCell>
                        {nextExpiry?.expiresOn ? (
                          <>
                            {dateLabel(nextExpiry.expiresOn)}
                            {state === 'expired' && (
                              <StatusBadge tone="red" className="ml-2">
                                Vencido
                              </StatusBadge>
                            )}
                            {state === 'soon' && (
                              <StatusBadge tone="amber" className="ml-2">
                                Por vencer
                              </StatusBadge>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </ListCell>
                      <ListCell className="flex justify-end gap-2">
                        <ActionButton
                          className="min-h-9 px-3"
                          onClick={() => onLots(row)}
                        >
                          Lotes
                        </ActionButton>
                        {canManage && (
                          <ActionButton
                            className="min-h-9 px-3"
                            onClick={() => onMinimum(row.productId)}
                          >
                            Mínimo
                          </ActionButton>
                        )}
                      </ListCell>
                    </ListRow>
                  )
                })}
              </ListBody>
            </ListTable>
          </ListPanel>
        </>
      ) : (
        <EmptyPanel
          title={total ? 'Sin resultados' : 'Aún no hay existencias'}
          description={
            total
              ? 'Prueba con otra búsqueda, estado o proveedor.'
              : canManage
                ? 'Recibe un pedido en «Por recibir» para dar de alta productos en este almacén.'
                : 'Cuando el encargado registre compras, verás aquí las existencias.'
          }
        />
      )}
    </>
  )
}
