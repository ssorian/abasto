import { Printer, ScanLine } from 'lucide-react'

import { allocationMargin, committedCents } from '#/modules/counter/lib/amounts'
import { minimumMarginPct } from '#/modules/counter/lib/constants'
import { formatMoney } from '#/modules/counter/lib/money'
import { printTicket } from '#/modules/counter/lib/ticket'
import { useOrderComposer } from '#/modules/counter/hooks/use-order-composer'
import {
  ActionButton,
  TextLink,
} from '#/modules/counter/components/action-button'
import { CartTable } from '#/modules/counter/components/cart-table'
import { CheckoutBar } from '#/modules/counter/components/checkout-bar'
import { ComposerFields } from '#/modules/counter/components/composer-fields'
import { Field, FieldInput } from '#/modules/counter/components/form-controls'
import {
  FormError,
  InfoBanner,
  SectionHelp,
  WarningInline,
} from '#/modules/counter/components/info-banner'
import { PaymentFields } from '#/modules/counter/components/payment-fields'
import { ProductSearch } from '#/modules/counter/components/product-strip'

import type { ApplyOperation } from '#/modules/counter/hooks/use-counter-state'
import type { WarehouseName } from '#/shared/demo/types'
import type { CounterState } from '#/modules/counter/types/counter'

type SaleComposerProps = {
  state: CounterState
  apply: ApplyOperation
  mode: 'counter' | 'pending'
  warehouse?: WarehouseName
  onDone?: (orderId: string) => void
  onOpenCash?: () => void
}

/** Order builder used for counter sales and for sales with a pending delivery. */
export function SaleComposer({
  state,
  apply,
  mode,
  warehouse,
  onDone,
  onOpenCash,
}: SaleComposerProps) {
  const composer = useOrderComposer({ state, apply, mode, warehouse, onDone })
  const ticket = state.orders.find((order) => order.id === composer.ticketId)
  const belowMargin = composer.quoted.some((line) =>
    line.allocations.some((a) => allocationMargin(a) + 1e-7 < minimumMarginPct),
  )
  const feedback = composer.error || composer.quoteError

  return (
    <div className="flex flex-col gap-5">
      <InfoBanner
        icon={ScanLine}
        title={
          composer.isCounter
            ? 'Una caja conectada a tu almacén'
            : 'Todos los canales, un solo inventario'
        }
      >
        {composer.isCounter
          ? 'Escanea el código y presiona Enter. Cada lectura agrega la presentación del código. Las etiquetas internas también seleccionan el lote.'
          : 'El pedido fija los precios de sus lotes y reserva existencias hasta surtir o cancelar.'}
      </InfoBanner>

      {ticket && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#cde0c9] bg-[#e8f3e7] px-[18px] py-4 text-[13px] text-[#355d36]">
          <span className="max-md:basis-full md:flex-1">
            Venta {ticket.id} registrada · {formatMoney(committedCents(ticket))}
          </span>
          <ActionButton onClick={() => printTicket(state, ticket)}>
            <Printer size={16} />
            Ticket / imprimir
          </ActionButton>
          <TextLink onClick={() => composer.setTicketId(null)}>Cerrar</TextLink>
        </div>
      )}

      {composer.isCounter && !composer.cashReady && (
        <div className="mb-[18px] flex flex-col items-start justify-between gap-[15px] rounded-[10px] border border-[#efe0a3] bg-[#fff8db] p-[13px] text-sm md:flex-row md:items-center md:px-[18px] md:py-3.5">
          <span>Abre caja para registrar ventas en {composer.warehouse}.</span>
          <ActionButton onClick={onOpenCash}>Ir a caja</ActionButton>
        </div>
      )}

      <ComposerFields composer={composer} />
      <ProductSearch composer={composer} state={state} />
      <CartTable composer={composer} state={state} />

      {composer.isCounter && composer.lines.length > 0 && (
        <PaymentFields composer={composer} />
      )}

      {!composer.isCounter && (
        <Field label="Indicaciones del pedido">
          <FieldInput
            value={composer.notes}
            onChange={(event) => composer.setNotes(event.target.value)}
            placeholder="Horario, referencias, instrucciones…"
          />
        </Field>
      )}

      {belowMargin && (
        <WarningInline>
          Esta venta incluye lotes bajo el margen mínimo de {minimumMarginPct}%.
          Al confirmar se solicitará motivo y, según tu perfil, autorización.
        </WarningInline>
      )}
      {feedback && <FormError>{feedback}</FormError>}

      <CheckoutBar composer={composer} />

      <SectionHelp>
        Cada presentación usa su propio código. Todas las cantidades se
        convierten a la unidad base del mismo inventario. Importes de demo sin
        impuestos.
      </SectionHelp>
    </div>
  )
}
