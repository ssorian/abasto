import { formatCents } from '#/modules/pricing/lib/money'
import type {
  WarehouseMetrics,
  WarehouseRankingRow,
} from '#/modules/executive/types/profitability'
import { relativeChangeBps } from '#/modules/reports/lib/owner-series'
import type {
  CashDifferenceSummary,
  SupplierShare,
} from '#/modules/reports/lib/owner-series'

const count = new Intl.NumberFormat('es-MX')

/** 1250 bps → "12.5". */
const points = (bps: number) => (Math.abs(bps) / 100).toFixed(1)

const percent = (bps: number) => `${points(bps)} %`

const before = 'en el periodo anterior'

/** "subieron 0.2 %"; null when unchanged or when there is nothing to compare. */
function movement(
  current: number,
  previous: number,
  words: { up: string; down: string },
) {
  const bps = relativeChangeBps(current, previous)
  if (!bps) return null
  return { bps, text: `${bps > 0 ? words.up : words.down} ${percent(bps)}` }
}

export function salesSentence(
  current: WarehouseMetrics,
  previous: WarehouseMetrics,
) {
  if (!previous.revenueCents) {
    return 'No hubo ventas en el periodo anterior para comparar.'
  }
  const change = movement(current.revenueCents, previous.revenueCents, {
    up: 'subieron',
    down: 'bajaron',
  })
  return change
    ? `Las ventas ${change.text} frente al periodo anterior.`
    : `Las ventas se mantuvieron igual que ${before}.`
}

/** Warehouse whose profit moved the most in the same direction as the total. */
function profitDriver(
  rows: ReadonlyArray<WarehouseRankingRow>,
  direction: 'up' | 'down',
) {
  const sign = direction === 'up' ? 1 : -1
  return rows
    .filter((row) => row.delta.marginCents * sign > 0)
    .sort(
      (a, b) =>
        b.delta.marginCents * sign - a.delta.marginCents * sign ||
        a.name.localeCompare(b.name),
    )
    .at(0)
}

export function profitSentence(
  current: WarehouseMetrics,
  previous: WarehouseMetrics,
  rows: ReadonlyArray<WarehouseRankingRow>,
) {
  if (!previous.marginCents) {
    return 'No hubo utilidad en el periodo anterior para comparar.'
  }
  const change = movement(current.marginCents, previous.marginCents, {
    up: 'subió',
    down: 'bajó',
  })
  if (!change) return `La utilidad se mantuvo igual que ${before}.`
  // A single warehouse in view (filtered) cannot be "the one that explains it".
  const driver =
    rows.length > 1
      ? profitDriver(rows, change.bps > 0 ? 'up' : 'down')
      : undefined
  const base = `La utilidad ${change.text} frente al periodo anterior`
  if (!driver) return `${base}.`
  return change.bps > 0
    ? `${base}; ${driver.name} aporta el mayor aumento.`
    : `${base}; ${driver.name} explica la mayor caída.`
}

export function marginSentence(
  current: WarehouseMetrics,
  previous: WarehouseMetrics,
) {
  if (current.marginBps === null)
    return 'Sin ventas no hay margen que calcular.'
  const lead = `El margen es de ${percent(current.marginBps)}`
  if (previous.marginBps === null) return `${lead}.`
  const change = current.marginBps - previous.marginBps
  if (change === 0) return `${lead}, igual que ${before}.`
  return `${lead}, ${points(change)} puntos ${change > 0 ? 'más' : 'menos'} que ${before}.`
}

const tickets = (n: number) =>
  `${count.format(n)} ${n === 1 ? 'ticket' : 'tickets'}`

export function ticketsSentence(
  current: WarehouseMetrics,
  previous: WarehouseMetrics,
) {
  const lead = `Hubo ${tickets(current.tickets)}`
  if (!previous.tickets) {
    return `${lead}; no hubo tickets en el periodo anterior para comparar.`
  }
  const bps = relativeChangeBps(current.tickets, previous.tickets)
  if (!bps) return `${lead}, igual que ${before}.`
  return `${lead}, ${percent(bps)} ${bps > 0 ? 'más' : 'menos'} que ${before}.`
}

export function averageTicketSentence(
  current: WarehouseMetrics,
  previous: WarehouseMetrics,
) {
  if (!current.tickets) return 'Sin tickets no hay ticket promedio.'
  const lead = `Cada ticket vale ${formatCents(current.averageTicketCents)} en promedio`
  const bps = relativeChangeBps(
    current.averageTicketCents,
    previous.averageTicketCents,
  )
  if (bps === null) return `${lead}.`
  if (bps === 0) return `${lead}, igual que ${before}.`
  return `${lead}, ${percent(bps)} ${bps > 0 ? 'más' : 'menos'} que ${before}.`
}

/** Best against worst revenue change by warehouse; null without a comparison. */
export function warehouseSentence(rows: ReadonlyArray<WarehouseRankingRow>) {
  const changes = rows
    .filter((row) => row.delta.revenueChangeBps !== null)
    .map((row) => ({ name: row.name, bps: row.delta.revenueChangeBps ?? 0 }))
    .sort((a, b) => b.bps - a.bps || a.name.localeCompare(b.name))
  const best = changes.at(0)
  const worst = changes.at(-1)
  if (!best || !worst || best === worst) return null
  if (best.bps > 0 && worst.bps < 0) {
    return `${best.name} creció ${percent(best.bps)} mientras ${worst.name} bajó ${percent(worst.bps)}.`
  }
  if (worst.bps >= 0) {
    return `${best.name} creció ${percent(best.bps)}, el mayor aumento.`
  }
  return `${worst.name} bajó ${percent(worst.bps)}, la mayor caída.`
}

/** `filtered`: a warehouse or supplier is selected, so it is not "tu inventario" as a whole. */
export function idleCapitalSentence(
  idleCents: number,
  inventoryCents: number,
  filtered = false,
) {
  const stock = filtered ? 'inventario de esta selección' : 'inventario'
  if (!idleCents) {
    return filtered
      ? 'Todo el inventario de esta selección tuvo ventas en este lapso.'
      : 'Todo tu inventario tuvo ventas en este lapso.'
  }
  const share = inventoryCents
    ? `, el ${percent(Math.round((idleCents * 10_000) / inventoryCents))} ${filtered ? 'del' : 'de tu'} ${stock}`
    : ''
  return `Tienes ${formatCents(idleCents)} detenidos en producto que no se vende${share}.`
}

export function cashSentence(summary: CashDifferenceSummary) {
  if (!summary.closed) return 'No hubo cortes de caja cerrados en el periodo.'
  if (!summary.withDifference) {
    return summary.closed === 1
      ? 'El corte del periodo cuadró.'
      : `Los ${summary.closed} cortes del periodo cuadraron.`
  }
  const cuts = `${summary.withDifference} ${summary.withDifference === 1 ? 'corte' : 'cortes'} con diferencia`
  if (!summary.totalCents) {
    return `Caja cerró sin diferencia neta en el periodo; ${cuts}.`
  }
  const side = summary.totalCents < 0 ? 'abajo' : 'arriba'
  return `Caja cerró ${formatCents(Math.abs(summary.totalCents))} ${side} en el periodo; ${cuts}.`
}

/** Which supplier leaves more per peso sold, against the one that sells most. */
export function supplierSentence(rows: ReadonlyArray<SupplierShare>) {
  const leader = rows.at(0)
  if (!leader || rows.length < 2) return null
  const rated = rows.filter((row) => row.marginBps !== null)
  const best = rated
    .sort((a, b) => (b.marginBps ?? 0) - (a.marginBps ?? 0))
    .at(0)
  if (!best || best.marginBps === null || leader.marginBps === null) return null
  if (best.key === leader.key) {
    return `${leader.name} vende más y también deja el mejor margen: ${percent(best.marginBps)}.`
  }
  return `${best.name} deja más por peso vendido que ${leader.name}: ${percent(best.marginBps)} contra ${percent(leader.marginBps)}.`
}

export function topProductSentence(
  product:
    { name: string; marginCents: number; marginBps: number | null } | undefined,
) {
  if (!product) return null
  const margin =
    product.marginBps === null
      ? ''
      : `, con un margen de ${percent(product.marginBps)}`
  return `${product.name} es tu mejor producto: ${formatCents(product.marginCents)} de utilidad${margin}.`
}
