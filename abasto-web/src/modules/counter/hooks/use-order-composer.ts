import { useRef, useState } from 'react'

import {
  demoCustomers,
  findCustomer,
  publicCustomerId,
} from '#/shared/demo/customers'
import { demoProducts } from '#/shared/demo/products'
import { allocationTotal } from '#/modules/counter/lib/amounts'
import { activeCash } from '#/modules/counter/lib/cash'
import { isValidMoney, toCents } from '#/modules/counter/lib/money'
import { checkout, createOrder } from '#/modules/counter/lib/orders'
import { quoteLine } from '#/modules/counter/lib/quote'
import { presentationFor } from '#/modules/counter/lib/stock'

import type { ApplyOperation } from '#/modules/counter/hooks/use-counter-state'
import type { WarehouseName } from '#/shared/demo/types'
import type {
  CartLine,
  CounterState,
  Fulfillment,
  OrderChannel,
  OrderLine,
  PaymentMethod,
  PaymentTerms,
} from '#/modules/counter/types/counter'

type UseOrderComposerOptions = {
  state: CounterState
  apply: ApplyOperation
  /** `counter`: immediate sale with payment. `pending`: reserved order for later delivery. */
  mode: 'counter' | 'pending'
  warehouse?: WarehouseName
  onDone?: (orderId: string) => void
}

const activeCustomers = demoCustomers.filter((customer) => customer.active)

/** All composer state and rules; the components only render it. */
export function useOrderComposer({
  state,
  apply,
  mode,
  warehouse: initialWarehouse = 'Centro',
  onDone,
}: UseOrderComposerOptions) {
  const isCounter = mode === 'counter'
  const [warehouse, setWarehouseState] =
    useState<WarehouseName>(initialWarehouse)
  const [customerId, setCustomerId] = useState(publicCustomerId)
  const [channel, setChannel] = useState<OrderChannel>(
    isCounter ? 'Mostrador' : 'Teléfono',
  )
  const [fulfillment, setFulfillment] = useState<Fulfillment>('Recolección')
  const [address, setAddress] = useState('')
  const [contact, setContact] = useState('')
  const [terms, setTerms] = useState<PaymentTerms>('Contado')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Array<CartLine>>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('Efectivo')
  const [amount, setAmount] = useState('')
  const [tendered, setTendered] = useState('')
  const [reference, setReference] = useState('')
  const [confirmedLots, setConfirmedLots] = useState(false)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const scanRef = useRef<HTMLInputElement>(null)

  const customer = findCustomer(customerId) ?? demoCustomers[0]
  const needle = query.toLowerCase()
  const matches = demoProducts.filter((product) =>
    `${product.name} ${product.sku} ${product.presentations
      .map((presentation) => presentation.barcode)
      .join(' ')}`
      .toLowerCase()
      .includes(needle),
  )

  let quoted: Array<OrderLine> = []
  let quoteError = ''
  try {
    quoted = lines.map((line) => quoteLine(state, warehouse, line))
  } catch (caught) {
    quoteError = caught instanceof Error ? caught.message : 'Revisa la venta.'
  }

  const totalCents = quoted.reduce(
    (sum, line) => sum + allocationTotal(line.allocations),
    0,
  )
  const payCents =
    terms === 'Contado' ? totalCents : toCents(Number(amount || 0))
  const changeCents =
    method === 'Efectivo' && tendered ? toCents(Number(tendered)) - payCents : 0
  const cashReady = !isCounter || Boolean(activeCash(state, warehouse))
  const canFinish =
    cashReady &&
    lines.length > 0 &&
    !quoteError &&
    (!isCounter || (confirmedLots && changeCents >= 0))

  function edit(next: Array<CartLine>) {
    setLines(next)
    setConfirmedLots(false)
    setError('')
  }

  function patchLine(productId: string, patch: Partial<CartLine>) {
    edit(
      lines.map((line) =>
        line.productId === productId ? { ...line, ...patch } : line,
      ),
    )
  }

  function removeLine(productId: string) {
    edit(lines.filter((line) => line.productId !== productId))
  }

  function add(productId: string, presentationId?: string) {
    const product = demoProducts.find((p) => p.id === productId)
    if (!product) return
    const presentation = presentationFor(product, presentationId)
    const existing = lines.find((line) => line.productId === productId)

    if (!existing) {
      edit([
        ...lines,
        { productId, presentationId: presentation.id, qty: 1, looseQty: 0 },
      ])
    } else {
      const current = presentationFor(product, existing.presentationId)
      if (current.id === presentation.id) {
        patchLine(productId, { qty: existing.qty + 1 })
      } else if (presentation.factor === 1) {
        patchLine(productId, { looseQty: existing.looseQty + 1 })
      } else if (current.factor === 1) {
        patchLine(productId, {
          presentationId: presentation.id,
          qty: 1,
          looseQty: existing.qty,
        })
      } else {
        setError(
          'Ya tienes otra presentación de este producto. Cambia la presentación de la partida antes de agregar.',
        )
        return
      }
    }
    setQuery('')
    scanRef.current?.focus()
  }

  function scanCode() {
    const code = query.trim()
    const found = demoProducts
      .flatMap((product) =>
        product.presentations
          .filter((p) => p.active && p.barcode && p.barcode === code)
          .map((presentation) => ({ product, presentation })),
      )
      .at(0)
    if (found) {
      add(found.product.id, found.presentation.id)
      return
    }
    const bySku = demoProducts.find(
      (product) => product.sku.toLowerCase() === code.toLowerCase(),
    )
    if (bySku) add(bySku.id)
    else
      setError(
        'Código no encontrado. Revisa los códigos de cada presentación en Catálogo.',
      )
  }

  function selectCustomer(id: string) {
    const next = findCustomer(id)
    if (!next) return
    setCustomerId(next.id)
    setContact(next.contact)
    setAddress(next.addresses[0] ?? '')
    setTerms('Contado')
    setConfirmedLots(false)
  }

  function selectWarehouse(next: WarehouseName) {
    setWarehouseState(next)
    setConfirmedLots(false)
  }

  function finish() {
    if (isCounter && (!isValidMoney(payCents / 100) || payCents < 0)) {
      setError('Revisa el importe del abono.')
      return
    }
    if (isCounter && !confirmedLots) {
      setError(
        'Confirma que los lotes del carrito coinciden con la mercancía física.',
      )
      return
    }

    const input = {
      warehouse,
      customerId,
      channel,
      fulfillment,
      address,
      contact,
      terms,
      notes,
      lines,
    }
    let orderId = ''
    const done = apply(
      (current) => {
        const date = new Date().toISOString()
        if (!isCounter) {
          const next = createOrder(current, input, date)
          orderId = next.orders[0].id
          return next
        }
        const result = checkout(
          current,
          input,
          payCents > 0
            ? {
                method,
                amountCents: payCents,
                tenderedCents: tendered ? toCents(Number(tendered)) : payCents,
                reference,
              }
            : undefined,
          date,
        )
        orderId = result.orderId
        return result.state
      },
      isCounter
        ? 'Venta registrada. Inventario, cobro y reporte actualizados.'
        : 'Pedido reservado con lotes y precios confirmados.',
    )

    if (!done) return
    if (isCounter) {
      setTicketId(orderId)
      setLines([])
      setTendered('')
      setAmount('')
      setReference('')
      setConfirmedLots(false)
    }
    onDone?.(orderId)
  }

  return {
    isCounter,
    warehouse,
    customer,
    customers: activeCustomers,
    channel,
    fulfillment,
    address,
    contact,
    terms,
    notes,
    lines,
    query,
    error,
    method,
    amount,
    tendered,
    reference,
    confirmedLots,
    ticketId,
    scanRef,
    matches,
    quoted,
    quoteError,
    totalCents,
    payCents,
    changeCents,
    cashReady,
    canFinish,
    setChannel,
    setFulfillment,
    setAddress,
    setContact,
    setTerms,
    setNotes,
    setQuery: (value: string) => {
      setQuery(value)
      setError('')
    },
    setMethod,
    setAmount,
    setTendered,
    setReference,
    setConfirmedLots,
    setTicketId,
    selectCustomer,
    selectWarehouse,
    patchLine,
    removeLine,
    add,
    scanCode,
    finish,
  }
}

export type OrderComposer = ReturnType<typeof useOrderComposer>
