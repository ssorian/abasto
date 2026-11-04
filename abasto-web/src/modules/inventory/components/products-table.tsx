import { ArrowRightIcon } from 'lucide-react'

import {
  IconButton,
  TextLink,
} from '#/modules/inventory/components/action-button'
import { money } from '#/modules/inventory/lib/format'
import { available, blockedQuantity } from '#/modules/inventory/lib/stock'
import {
  DataTable,
  TableWrap,
  Td,
  Th,
} from '#/modules/inventory/components/data-table'

import type { InventoryProduct } from '#/modules/inventory/types/inventory'
import type { ProductRow } from '#/modules/inventory/lib/filters'

type ProductsTableProps = {
  rows: ReadonlyArray<ProductRow>
  onSelect: (product: InventoryProduct) => void
}

/** Compact table flavour of the Productos tab. */
export function ProductsTable({ rows, onSelect }: ProductsTableProps) {
  return (
    <TableWrap className="rounded-[12px] border border-[#e3e9f0] bg-white">
      <DataTable>
        <thead>
          <tr>
            {[
              'Producto',
              'Disponible',
              'Reservado',
              'Bloqueado',
              'Físico',
              'Último costo',
            ].map((head) => (
              <Th key={head}>{head}</Th>
            ))}
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ product, stock }) => (
            <tr key={product.id} className="hover:bg-[#fafcff]">
              <Td>
                <TextLink onClick={() => onSelect(product)}>
                  {product.name}
                </TextLink>
                <small className="mt-1 block text-[11px] text-[#7d8b9b]">
                  {product.sku} · {product.unit}
                </small>
              </Td>
              <Td>
                <b>{available(stock)}</b>
              </Td>
              <Td>{stock.reserved}</Td>
              <Td className={blockedQuantity(stock) ? 'text-[#c35850]' : ''}>
                {blockedQuantity(stock)}
              </Td>
              <Td>{stock.physical}</Td>
              <Td>{stock.received ? money(stock.last) : '—'}</Td>
              <Td>
                <IconButton
                  aria-label={`Abrir ${product.name}`}
                  onClick={() => onSelect(product)}
                >
                  <ArrowRightIcon size={16} />
                </IconButton>
              </Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </TableWrap>
  )
}
