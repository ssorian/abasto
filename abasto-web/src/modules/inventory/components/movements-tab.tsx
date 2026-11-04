import { ArrowDownLeftIcon, ArrowUpRightIcon, XIcon } from 'lucide-react'

import { IconButton } from '#/modules/inventory/components/action-button'
import { EmptyPanel } from '#/modules/inventory/components/empty-panel'
import {
  ListBody,
  ListCell,
  ListHead,
  ListPanel,
  ListRow,
  ListTable,
} from '#/modules/inventory/components/list-panel'
import { Picker } from '#/modules/inventory/components/picker'
import { SectionRow } from '#/modules/inventory/components/section-row'
import { SignedQuantity } from '#/modules/inventory/components/info-blocks'
import { SearchBox } from '#/modules/inventory/components/product-toolbar'
import { findInventoryProduct } from '#/modules/inventory/lib/catalog'
import { dateLabel, timeLabel } from '#/modules/inventory/lib/format'
import { movementTypes } from '#/modules/inventory/types/inventory'
import { cn } from '#/lib/utils/cn'

import type { Movement } from '#/modules/inventory/types/inventory'

/** Round arrow badge: green for entries, orange for outflows. */
export function MovementIcon({ qty }: { qty: number }) {
  const Icon = qty > 0 ? ArrowDownLeftIcon : ArrowUpRightIcon
  return (
    <span
      className={cn(
        'flex size-[34px] shrink-0 items-center justify-center rounded-[9px]',
        qty > 0 ? 'bg-[#edf7f2] text-[#408d76]' : 'bg-[#fbf0eb] text-[#c08169]',
      )}
    >
      <Icon size={18} />
    </span>
  )
}

const typeOptions = [
  { value: 'Todos', label: 'Todos los movimientos' },
  ...movementTypes,
]

type MovementsTabProps = {
  rows: ReadonlyArray<Movement>
  query: string
  onQueryChange: (value: string) => void
  type: string
  onTypeChange: (value: string) => void
  day: string
  onDayChange: (value: string) => void
  onSelect: (movement: Movement) => void
}

export function MovementsTab({
  rows,
  query,
  onQueryChange,
  type,
  onTypeChange,
  day,
  onDayChange,
  onSelect,
}: MovementsTabProps) {
  return (
    <>
      <SectionRow
        title="El recorrido de tu inventario"
        description="Consulta cada entrada, salida y ajuste."
      />
      <div className="mb-[15px] flex flex-wrap items-center gap-2.5 md:mb-[18px] md:flex-nowrap md:gap-3">
        <SearchBox
          label="Buscar producto en movimientos"
          placeholder="Buscar producto..."
          value={query}
          onChange={onQueryChange}
        />
        <Picker
          label="Tipo de movimiento"
          value={type}
          onChange={onTypeChange}
          options={typeOptions}
          className="data-[size=default]:h-9 text-xs md:data-[size=default]:h-[43px] md:text-sm"
        />
        <input
          type="date"
          aria-label="Fecha de movimiento"
          value={day}
          onChange={(event) => onDayChange(event.target.value)}
          className="min-h-[43px] rounded-[8px] border border-[#e0e6ee] bg-white px-3 py-[9px] text-xs text-[#60718a]"
        />
        {day && (
          <IconButton
            aria-label="Quitar filtro de fecha"
            onClick={() => onDayChange('')}
          >
            <XIcon size={17} />
          </IconButton>
        )}
      </div>
      <ListPanel>
        {rows.length ? (
          <ListTable>
            <ListHead>
              {['Movimiento', 'Producto', 'Cantidad', 'Almacén', 'Fecha', '']}
            </ListHead>
            <ListBody>
              {rows.map((movement) => {
                const product = findInventoryProduct(movement.productId)
                return (
                  <ListRow key={movement.id}>
                    <ListCell>
                      <button
                        type="button"
                        onClick={() => onSelect(movement)}
                        className="flex items-center gap-[11px] text-left"
                      >
                        <MovementIcon qty={movement.qty} />
                        <span>
                          <strong className="block text-[#385571]">
                            {movement.type}
                          </strong>
                          <small className="block text-[#a1acb9]">
                            {movement.ref}
                          </small>
                        </span>
                      </button>
                    </ListCell>
                    <ListCell>
                      <strong>{product?.name}</strong>
                      <small className="block text-[#788596]">
                        {product?.sku}
                      </small>
                    </ListCell>
                    <ListCell>
                      <strong>
                        <SignedQuantity qty={movement.qty} />
                      </strong>
                      <small className="block text-[#788596]">
                        {product?.unit}
                      </small>
                    </ListCell>
                    <ListCell>{movement.warehouse}</ListCell>
                    <ListCell>
                      {dateLabel(movement.date)}
                      <small className="block text-[#788596]">
                        {timeLabel(movement.date)}
                      </small>
                    </ListCell>
                    <ListCell>
                      <IconButton
                        aria-label={`Ver movimiento ${movement.id}`}
                        onClick={() => onSelect(movement)}
                      >
                        <ArrowUpRightIcon size={18} />
                      </IconButton>
                    </ListCell>
                  </ListRow>
                )
              })}
            </ListBody>
          </ListTable>
        ) : (
          <EmptyPanel
            title="Sin movimientos para esta búsqueda"
            description="Cambia los filtros o registra una entrada."
          />
        )}
      </ListPanel>
    </>
  )
}
