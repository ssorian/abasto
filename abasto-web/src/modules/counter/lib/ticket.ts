import {
  amountFor,
  committedCents,
  paidCents,
  soldCents,
} from '#/modules/counter/lib/amounts'
import { formatMoney } from '#/modules/counter/lib/money'

import type { CounterState, Order } from '#/modules/counter/types/counter'

const escapeHtml = (value: string | number | undefined) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ] ?? char,
  )

const ticketStyles =
  'body{font:14px system-ui;max-width:560px;margin:32px auto;padding:16px}h1{font-size:24px}small{display:block;color:#666}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{padding:9px 4px;text-align:left;border-bottom:1px solid #ddd}td:not(:first-child){text-align:right}button{padding:12px;margin:15px 0}@media print{button{display:none}}'

function ticketRows(order: Order) {
  return order.lines
    .flatMap((line) =>
      line.allocations
        .filter((a) => a.delivered > 0)
        .map(
          (a) =>
            `<tr><td>${escapeHtml(line.productName)}<small>${escapeHtml(a.lot)} · ${escapeHtml(a.presentationName)} · ${a.priceFactor} ${escapeHtml(line.unit)}</small></td><td>${Number((a.delivered / a.priceFactor).toFixed(4))}</td><td>${escapeHtml(formatMoney(a.unitPriceCents))}</td><td>${escapeHtml(formatMoney(amountFor(a, a.delivered)))}</td></tr>`,
        ),
    )
    .join('')
}

function ticketPayments(state: CounterState, order: Order) {
  return state.payments
    .filter((p) => p.orderId === order.id)
    .map((p) => {
      const cash =
        p.changeCents === undefined
          ? ''
          : `<br>Recibido ${escapeHtml(formatMoney(p.tenderedCents ?? 0))} · Cambio ${escapeHtml(formatMoney(p.changeCents))}`
      return `<p>${escapeHtml(p.type)} · ${escapeHtml(p.method)} · ${escapeHtml(formatMoney(p.amountCents))}${cash}</p>`
    })
    .join('')
}

/** Opens a printable demo ticket in a new window. */
export function printTicket(state: CounterState, order: Order) {
  const win = window.open('', '_blank', 'width=650,height=850')
  if (!win) {
    window.alert('Permite abrir la ventana del ticket para imprimir.')
    return
  }
  const created = new Date(order.createdAt ?? Date.now()).toLocaleString(
    'es-MX',
  )
  win.document.write(
    `<!doctype html><html lang="es"><meta charset="utf-8"><title>Ticket ${escapeHtml(order.id)}</title><style>${ticketStyles}</style><h1>Distribuidora del Sur</h1><p>Ticket de demostración · ${escapeHtml(order.id)}</p><p>${escapeHtml(created)}<br>${escapeHtml(order.customer)}<br>Almacén ${escapeHtml(order.warehouse)} · ${escapeHtml(order.channel)}</p><table><thead><tr><th>Producto / lote</th><th>Cant.</th><th>Precio</th><th>Importe</th></tr></thead><tbody>${ticketRows(order)}</tbody></table><p>Venta neta después de devoluciones: <b>${escapeHtml(formatMoney(soldCents(order)))}</b></p><p>Cobrado neto: ${escapeHtml(formatMoney(paidCents(state, order.id)))}<br>Saldo: ${escapeHtml(formatMoney(committedCents(order) - paidCents(state, order.id)))}</p>${ticketPayments(state, order)}<small>Importes de demo en MXN sin impuestos. No es un comprobante fiscal.</small><button onclick="window.print()">Imprimir ticket</button></html>`,
  )
  win.document.close()
  win.opener = null
}
