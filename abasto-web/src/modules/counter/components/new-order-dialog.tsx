import { Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

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
  addLine,
  draftToOrderInput,
  removeLine,
  setLineQuantity,
} from '#/modules/counter/lib/order-draft'
import { quoteRuleLabel } from '#/modules/counter/lib/order-format'
import {
  findStockShortages,
  stockShortageMessage,
} from '#/modules/counter/lib/order-stock'
import { availabilityLabel } from '#/modules/counter/lib/sellable'
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
  const [pick, setPick] = useState('')
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
        <Field label="Agregar producto">
          <div className="flex gap-2">
            <FieldSelect
              value={pick}
              onChange={(event) => setPick(event.target.value)}
            >
              <option value="">Elige una presentación…</option>
              {sellable.map((option) => (
                <option
                  key={option.presentationId}
                  value={option.presentationId}
                >
                  {option.label} · {formatCents(option.priceCents)} · disp.{' '}
                  {option.available}
                </option>
              ))}
            </FieldSelect>
            <ActionButton
              disabled={!pick}
              onClick={() => {
                setLines((current) => addLine(current, pick))
                setPick('')
              }}
            >
              Agregar
            </ActionButton>
          </div>
        </Field>
      </div>
      {sellable.length === 0 && (
        <p className="text-sm text-[#9c898f]">
          Este almacén no tiene productos con precio. Defínelos en Precios.
        </p>
      )}
      {lines.length > 0 && (
        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <Th>Producto</Th>
                <Th>Cantidad</Th>
                <Th>Precio</Th>
                <Th>Importe</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const option = optionOf.get(line.presentationId)
                const priced = quoted.get(line.presentationId)
                const shortage = shortages.get(line.presentationId)
                return (
                  <tr key={line.presentationId}>
                    <Td>
                      {option?.label ?? 'Producto'}
                      <CellNote>
                        {option ? availabilityLabel(option) : 'Disponible: 0'}
                      </CellNote>
                      {shortage && (
                        <p role="alert" className="mt-1 text-xs text-[#a1372e]">
                          {stockShortageMessage(shortage)}
                        </p>
                      )}
                    </Td>
                    <Td>
                      <FieldInput
                        type="number"
                        min="1"
                        step="1"
                        aria-label={`Cantidad de ${option?.label ?? 'producto'}`}
                        className="w-24"
                        value={line.quantity}
                        onChange={(event) =>
                          setLines((current) =>
                            setLineQuantity(
                              current,
                              line.presentationId,
                              event.target.value,
                            ),
                          )
                        }
                      />
                    </Td>
                    <Td>
                      {priced?.unitPriceCents != null
                        ? formatCents(priced.unitPriceCents)
                        : option
                          ? formatCents(option.priceCents)
                          : '—'}
                      <CellNote>
                        {priced?.unitPriceCents != null
                          ? quoteRuleLabel(priced.rule)
                          : 'Precio de lista'}
                      </CellNote>
                    </Td>
                    <Td>
                      {priced?.lineTotalCents != null
                        ? formatCents(priced.lineTotalCents)
                        : '—'}
                    </Td>
                    <Td>
                      <button
                        type="button"
                        aria-label="Quitar producto"
                        className="inline-flex size-9 items-center justify-center rounded-[7px] text-[#826c73] hover:bg-[#f6f0e9]"
                        onClick={() =>
                          setLines((current) =>
                            removeLine(current, line.presentationId),
                          )
                        }
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
        </TableWrap>
      )}
      <Field label="Notas del pedido">
        <FieldTextarea
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </Field>
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
