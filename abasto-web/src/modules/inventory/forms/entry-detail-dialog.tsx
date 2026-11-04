import { CircleCheckIcon } from 'lucide-react'

import {
  InfoPairs,
  SuccessNote,
} from '#/modules/inventory/components/info-blocks'
import { InventoryDialog } from '#/modules/inventory/components/inventory-dialog'
import { ProductThumb } from '#/modules/inventory/components/product-thumb'
import { requireProduct } from '#/modules/inventory/lib/catalog'
import { dateLabel, money } from '#/modules/inventory/lib/format'

import type { Entry } from '#/modules/inventory/types/inventory'

export function EntryDetailDialog({
  entry,
  onClose,
}: {
  entry: Entry
  onClose: () => void
}) {
  return (
    <InventoryDialog
      title="Detalle de entrada"
      description={`${entry.id} · ${dateLabel(entry.date)}`}
      onClose={onClose}
    >
      <InfoPairs
        rows={[
          ['Almacén', entry.warehouse],
          ['Referencia', entry.reference || 'Sin referencia'],
        ]}
      />
      <div>
        {entry.lines.map((line, index) => {
          const product = requireProduct(line.productId)
          return (
            <div
              key={index}
              className="flex items-center gap-[17px] border-b border-[#eaf0f5] py-3.5"
            >
              <div className="h-16 w-[45px] shrink-0">
                <ProductThumb product={product} />
              </div>
              <div>
                <strong className="text-sm">{product.name}</strong>
                <p className="mt-[5px] text-xs text-[#607e9d]">
                  +{line.qty} {product.unit} × {money(line.cost)}
                </p>
                <small className="mt-[5px] block text-xs text-[#9aa8b8]">
                  {line.lot || 'Sin lote'}{' '}
                  {line.expiry && ` · Cad. ${dateLabel(line.expiry)}`}
                </small>
              </div>
            </div>
          )
        })}
      </div>
      <SuccessNote>
        <CircleCheckIcon size={18} />
        Inventario actualizado al registrar esta entrada.
      </SuccessNote>
    </InventoryDialog>
  )
}
