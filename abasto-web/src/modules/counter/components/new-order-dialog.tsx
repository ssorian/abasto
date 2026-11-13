import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { ProductPicker } from '#/components/product-picker'
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
  countLabel,
  filterSellable,
  groupSellable,
  productAvailabilityLabel,
  sellableSuppliers,
} from '#/modules/counter/lib/sellable'
import { formatCents } from '#/modules/pricing/lib/money'
import type { DraftLine } from '#/modules/counter/lib/order-draft'
import type { SellableOption } from '#/modules/counter/lib/sellable'
import type { CounterOverview } from '#/modules/counter/types/counter-view'

type NewOrderDialogProps = {
  warehouseId: string
  warehouseName: string
  customers: CounterOverview['customers']
  sellable: CounterOverview['sellable']
  reservationHours: number
  onClose: () => void
  /** Called with the new order's id once it is reserved, after closing. */
  onCreated: (orderId: string) => void
}

export function NewOrderDialog({
  warehouseId,
  warehouseName,
  customers,
  sellable,
  reservationHours,
  onClose,
  onCreated,
}: NewOrderDialogProps) {
  const actions = useOrderActions()
  const [customerId, setCustomerId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Array<DraftLine>>([])
  const [query, setQuery] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [onlyAdded, setOnlyAdded] = useState(false)
  // The shared searchable picker filters by name and SKU; customers have no SKU.
  const customerItems = useMemo(
    () => customers.map(({ id, name }) => ({ id, name, sku: '' })),
    [customers],
  )
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
  const products = useMemo(() => groupSellable(sellable), [sellable])
  const addedProducts = new Set(
    lines.flatMap((line) => optionOf.get(line.presentationId)?.productId ?? []),
  )
  // "Solo agregados" turns itself off once the order is empty again.
  const showOnlyAdded = onlyAdded && lines.length > 0
  const visible = filterSellable(products, {
    query,
    supplierId,
    onlyIds: showOnlyAdded ? addedProducts : undefined,
  })

  /** Box or piece input of a product row; blocked without stock or without that presentation. */
  function quantityInput(
    option: SellableOption | null,
    label: string,
    blocked: boolean,
    productName: string,
  ) {
    const line = option ? lineOf.get(option.presentationId) : undefined
    return (
      <label className="grid gap-1 text-xs text-[#907e84]">
        {label}
        <FieldInput
          inputMode="numeric"
          aria-label={`${label} de ${productName}`}
          placeholder="0"
          className="w-20"
          disabled={!option || blocked}
          value={line?.quantity ?? ''}
          onChange={(event) =>
            option &&
            setLines((current) =>
              typeLineQuantity(
                current,
                option.presentationId,
                event.target.value,
              ),
            )
          }
        />
      </label>
    )
  }

  async function submit() {
    const parsed = draftToOrderInput({ warehouseId, customerId, notes, lines })
    if (!parsed.ok) {
      toast.error(parsed.message)
      return
    }
    const result = await actions.createOrder(parsed.value)
    if (result) {
      onClose()
      onCreated(result.data.id)
    }
  }

  return (
    <CounterDialog
      full
      title="Nuevo pedido"
      description={`${warehouseName}. Reserva el producto por ${reservationHours} h y fija el precio al reservar.`}
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Cliente">
          <ProductPicker
            label="Cliente"
            placeholder="Busca por nombre del cliente"
            products={customerItems}
            value={customerId}
            onChange={setCustomerId}
          />
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
              Solo agregados ({addedProducts.size})
            </button>
          </div>
          <TableWrap className="h-full min-h-[14rem] overflow-y-auto rounded-xl border border-[#f1ebe5]">
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
                {visible.map((product) => {
                  const options = [product.box, product.piece].flatMap(
                    (option) => (option ? [option] : []),
                  )
                  const inOrder = addedProducts.has(product.productId)
                  const shortage = options
                    .map((option) => shortages.get(option.presentationId))
                    .find(Boolean)
                  const totals = options.flatMap((option) => {
                    const priced = quoted.get(option.presentationId)
                    return lineOf.has(option.presentationId) &&
                      priced?.lineTotalCents != null
                      ? [priced.lineTotalCents]
                      : []
                  })
                  const outOfStock = product.availableBase === 0
                  return (
                    <tr
                      key={product.productId}
                      className={inOrder ? 'bg-[#fbf7f3]' : undefined}
                    >
                      <Td>
                        <span className="flex items-stretch gap-3">
                          <span className="flex w-[72px] shrink-0 items-center justify-center self-stretch overflow-hidden rounded-lg bg-[#faf9f7] min-h-[72px]">
                            <ProductImage
                              src={product.imageUrl}
                              name={product.productName}
                              className="size-full max-h-[96px] object-contain p-1 mix-blend-multiply"
                              placeholderClassName="size-7"
                            />
                          </span>
                          <span>
                            <strong className="font-semibold">
                              {product.productName}
                            </strong>
                            <CellNote>
                              {product.sku}
                              {product.box &&
                                ` · ${countLabel(product.box.factor, product.unit)} por ${product.box.presentationName.toLowerCase()}`}
                              {product.supplierName &&
                                ` · ${product.supplierName}`}
                            </CellNote>
                            <CellNote>
                              {productAvailabilityLabel(product)}
                            </CellNote>
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
                        {options.map((option) => {
                          const priced = quoted.get(option.presentationId)
                          return (
                            <span key={option.presentationId} className="block">
                              {formatCents(
                                priced?.unitPriceCents ?? option.priceCents,
                              )}{' '}
                              <span className="text-xs text-[#907e84]">
                                / {option.presentationName.toLowerCase()}
                              </span>
                              <CellNote>
                                {priced?.unitPriceCents != null
                                  ? quoteRuleLabel(priced.rule)
                                  : 'Precio de lista'}
                              </CellNote>
                            </span>
                          )
                        })}
                      </Td>
                      <Td>
                        <span className="flex gap-2">
                          {quantityInput(
                            product.box,
                            'Cajas',
                            outOfStock,
                            product.productName,
                          )}
                          {quantityInput(
                            product.piece,
                            'Piezas',
                            outOfStock,
                            product.productName,
                          )}
                        </span>
                      </Td>
                      <Td>
                        {totals.length
                          ? formatCents(totals.reduce((a, b) => a + b, 0))
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
