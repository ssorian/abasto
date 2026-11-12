import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { ProductImage } from '#/components/product-image'
import { SearchBox } from '#/components/search-box'
import { SupplierSelect } from '#/components/supplier-select'
import { cn } from '#/lib/utils/cn'

import { ActionButton } from '#/modules/counter/components/action-button'
import { CounterDialog } from '#/modules/counter/components/counter-dialog'
import {
  CellNote,
  DataTable,
  TableWrap,
  Td,
  Th,
} from '#/modules/counter/components/data-table'
import {
  Field,
  FieldInput,
  FieldSelect,
  FieldTextarea,
} from '#/modules/counter/components/form-controls'
import { useOrderActions } from '#/modules/counter/hooks/use-order-actions'
import { useOrderQuote } from '#/modules/counter/hooks/use-order-quote'
import {
  draftToOrderInput,
  typeLineQuantity,
} from '#/modules/counter/lib/order-draft'
import { quoteRuleLabel } from '#/modules/counter/lib/order-format'
import {
  findStockShortages,
  stockShortageMessage,
} from '#/modules/counter/lib/order-stock'
import {
  availabilityLabel,
  filterSellable,
  sellableSuppliers,
} from '#/modules/counter/lib/sellable'
import { formatCents } from '#/modules/pricing/lib/money'
import type { DraftLine } from '#/modules/counter/lib/order-draft'
import type { CounterOverview } from '#/modules/counter/types/counter-view'

type NewOrderDialogProps = {
  warehouseId: string
  warehouseName: string
  customers: CounterOverview['customers']
  sellable: CounterOverview['sellable']
  reservationHours: number
  onClose: () => void
}

export function NewOrderDialog({
  warehouseId,
  warehouseName,
  customers,
  sellable,
  reservationHours,
  onClose,
}: NewOrderDialogProps) {
  const actions = useOrderActions()
  const [customerId, setCustomerId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Array<DraftLine>>([])
  const [query, setQuery] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [onlyAdded, setOnlyAdded] = useState(false)
  const quote = useOrderQuote(warehouseId, customerId, lines)
  const optionOf = new Map(
    sellable.map((option) => [option.presentationId, option]),
  )
  const quoted = new Map(
    quote.status === 'ready'
      ? quote.quote.lines.map((line) => [line.presentationId, line])
      : [],
  )

  const shortages = findStockShortages(lines, optionOf)
  const lineOf = new Map(lines.map((line) => [line.presentationId, line]))
  const suppliers = useMemo(() => sellableSuppliers(sellable), [sellable])
  // "Solo agregados" turns itself off once the order is empty again.
  const showOnlyAdded = onlyAdded && lines.length > 0
  const visible = filterSellable(sellable, {
    query,
    supplierId,
    onlyIds: showOnlyAdded ? new Set(lineOf.keys()) : undefined,
  })

  async function submit() {
    const parsed = draftToOrderInput({ warehouseId, customerId, notes, lines })
    if (!parsed.ok) {
      toast.error(parsed.message)
      return
    }
    const result = await actions.createOrder(parsed.value)
    if (result) onClose()
  }

  return (
    <CounterDialog
      wide
      title="Nuevo pedido"
      description={`${warehouseName}. Reserva el producto por ${reservationHours} h y fija el precio al reservar.`}
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Cliente">
          <FieldSelect
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          >
            <option value="">Elige un cliente…</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </FieldSelect>
        </Field>
        <Field label="Notas del pedido">
          <FieldTextarea
            rows={1}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
      </div>
      {sellable.length === 0 ? (
        <p className="text-sm text-[#9c898f]">
          Este almacén no tiene productos con precio. Defínelos en Precios.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[240px] flex-1">
              <SearchBox
                label="Buscar producto"
                placeholder="Buscar por nombre o SKU"
                value={query}
                onChange={setQuery}
              />
            </div>
            {suppliers.length > 0 && (
              <SupplierSelect
                suppliers={suppliers}
                value={supplierId}
                onChange={setSupplierId}
              />
            )}
            <button
              type="button"
              aria-pressed={showOnlyAdded}
              disabled={lines.length === 0}
              className={cn(
                'min-h-[42px] rounded-[10px] border px-3.5 text-sm disabled:opacity-50',
                showOnlyAdded
                  ? 'border-[#785e67] bg-[#785e67] text-white'
                  : 'border-[#eee7e0] bg-white text-[#785e67] hover:bg-[#f4eef0]',
              )}
              onClick={() => setOnlyAdded((current) => !current)}
            >
              Solo agregados ({lines.length})
            </button>
          </div>
          <TableWrap className="max-h-[min(460px,52dvh)] overflow-y-auto rounded-xl border border-[#f1ebe5]">
            <DataTable>
              <thead className="sticky top-0 z-10">
                <tr>
                  <Th>Producto</Th>
                  <Th>Precio</Th>
                  <Th>Cantidad</Th>
                  <Th>Importe</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((option) => {
                  const line = lineOf.get(option.presentationId)
                  const priced = quoted.get(option.presentationId)
                  const shortage = shortages.get(option.presentationId)
                  return (
                    <tr
                      key={option.presentationId}
                      className={line ? 'bg-[#fbf7f3]' : undefined}
                    >
                      <Td>
                        <span className="flex items-center gap-3">
                          <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#faf9f7]">
                            <ProductImage
                              src={option.imageUrl}
                              name={option.productName}
                              className="size-full object-contain p-1 mix-blend-multiply"
                              placeholderClassName="size-5"
                            />
                          </span>
                          <span>
                            <strong className="font-semibold">
                              {option.productName}
                            </strong>
                            <CellNote>
                              {option.sku} · {option.presentationName}
                              {option.supplierName &&
                                ` · ${option.supplierName}`}
                            </CellNote>
                            <CellNote>{availabilityLabel(option)}</CellNote>
                            {shortage && (
                              <p
                                role="alert"
                                className="mt-1 text-xs text-[#a1372e]"
                              >
                                {stockShortageMessage(shortage)}
                              </p>
                            )}
                          </span>
                        </span>
                      </Td>
                      <Td>
                        {formatCents(
                          priced?.unitPriceCents ?? option.priceCents,
                        )}
                        <CellNote>
                          {priced?.unitPriceCents != null
                            ? quoteRuleLabel(priced.rule)
                            : 'Precio de lista'}
                        </CellNote>
                      </Td>
                      <Td>
                        <FieldInput
                          inputMode="numeric"
                          aria-label={`Cantidad de ${option.label}`}
                          placeholder="0"
                          className="w-20"
                          value={line?.quantity ?? ''}
                          onChange={(event) =>
                            setLines((current) =>
                              typeLineQuantity(
                                current,
                                option.presentationId,
                                event.target.value,
                              ),
                            )
                          }
                        />
                      </Td>
                      <Td>
                        {line && priced?.lineTotalCents != null
                          ? formatCents(priced.lineTotalCents)
                          : '—'}
                      </Td>
                    </tr>
                  )
                })}
                {visible.length === 0 && (
                  <tr>
                    <Td colSpan={4} className="text-center text-[#907e84]">
                      Sin productos que coincidan
                    </Td>
                  </tr>
                )}
              </tbody>
            </DataTable>
          </TableWrap>
        </>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f4eee8] pt-4">
        <div className="text-sm">
          {quote.status === 'error' ? (
            <span className="text-[#a1372e]">{quote.message}</span>
          ) : (
            <>
              <strong>
                Total estimado:{' '}
                {quote.status === 'ready'
                  ? formatCents(quote.quote.totalCents)
                  : '—'}
              </strong>
              <small className="block text-xs text-[#9c898f]">
                Cotización con el precio actual del almacén y las condiciones
                del cliente. El pedido guarda el precio al reservar.
              </small>
            </>
          )}
        </div>
        <ActionButton
          tone="primary"
          disabled={actions.pending || shortages.size > 0}
          onClick={submit}
        >
          {actions.pending ? 'Reservando…' : 'Reservar pedido'}
        </ActionButton>
      </div>
    </CounterDialog>
  )
}
