import { ArrowDownLeftIcon, ArrowUpRightIcon } from 'lucide-react'

import { EmptyPanel } from '#/modules/inventory/components/empty-panel'
import {
  ListBody,
  ListCell,
  ListHead,
  ListPanel,
  ListRow,
  ListTable,
} from '#/modules/inventory/components/list-panel'
import { dateLabel, timeLabel } from '#/modules/inventory/lib/format'
import { movementLabel } from '#/modules/inventory/lib/pack-info'
import { formatQuantity } from '#/modules/inventory/lib/quantity'
import type { PackInfo } from '#/modules/inventory/lib/quantity'
import type { MovementEntry } from '#/modules/inventory/types/stock'
import { cn } from '#/lib/utils/cn'

/** What the tables need to show a movement's product. */
export type ProductLabel = { name: string; sku: string; pack: PackInfo }

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

type MovementTableProps = {
  rows: ReadonlyArray<MovementEntry>
  products: ReadonlyMap<string, ProductLabel>
  emptyTitle: string
  emptyDescription: string
}

export function MovementTable({
  rows,
  products,
  emptyTitle,
  emptyDescription,
}: MovementTableProps) {
  if (!rows.length) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} />
  }
  return (
    <ListPanel>
      <ListTable>
        <ListHead>
          {['Movimiento', 'Producto', 'Cantidad', 'Motivo', 'Fecha']}
        </ListHead>
        <ListBody>
          {rows.map((movement) => {
            const product = products.get(movement.productId)
            const created = new Date(movement.createdAt).toISOString()
            return (
              <ListRow key={movement.id}>
                <ListCell>
                  <span className="flex items-center gap-[11px]">
                    <MovementIcon qty={movement.quantity} />
                    <strong className="text-[#385571]">
                      {movementLabel(movement.type)}
                    </strong>
                  </span>
                </ListCell>
                <ListCell>
                  <strong>{product?.name ?? 'Producto'}</strong>
                  <small className="block text-[#788596]">
                    {product?.sku}
                    {movement.lotCode ? ` · lote ${movement.lotCode}` : ''}
                  </small>
                </ListCell>
                <ListCell>
                  <strong
                    className={
                      movement.quantity > 0
                        ? 'text-[#198567]'
                        : 'text-[#c35850]'
                    }
                  >
                    {movement.quantity > 0 ? '+' : ''}
                    {product
                      ? formatQuantity(movement.quantity, product.pack)
                      : movement.quantity}
                  </strong>
                </ListCell>
                <ListCell>
                  {movement.reason}
                  <small className="block text-[#788596]">
                    {movement.actorName}
                  </small>
                </ListCell>
                <ListCell>
                  {dateLabel(created)}
                  <small className="block text-[#788596]">
                    {timeLabel(created)}
                  </small>
                </ListCell>
              </ListRow>
            )
          })}
        </ListBody>
      </ListTable>
    </ListPanel>
  )
}
