import {
  availableUnits,
  fefoOrder,
  isBlocked,
  lotsFor,
  presentationFor,
  presentationPriceCents,
  requireProduct,
  unitCostCents,
} from '#/modules/counter/lib/stock'

import type { WarehouseName } from '#/shared/demo/types'
import type {
  Allocation,
  CartLine,
  CounterState,
  Lot,
  OrderLine,
} from '#/modules/counter/types/counter'

type QuotePart = { presentationId: string; qty: number; factor: number }

function sourcesFor(
  lots: ReadonlyArray<Lot>,
  extraReserved: Map<string, number>,
  baseQty: number,
  lotId?: string,
) {
  const free = (lot: Lot) =>
    lot.quantity - lot.reserved - (extraReserved.get(lot.id) ?? 0)

  if (lotId) {
    const lot = lots.find((l) => l.id === lotId)
    if (!lot || isBlocked(lot) || free(lot) < baseQty) {
      throw new Error('El lote elegido no tiene suficientes unidades.')
    }
    return [{ lot, qty: baseQty }]
  }

  const sources: Array<{ lot: Lot; qty: number }> = []
  let left = baseQty
  for (const lot of fefoOrder(lots)) {
    const take = Math.min(left, free(lot))
    if (take > 0) {
      sources.push({ lot, qty: take })
      left -= take
    }
    if (!left) break
  }
  if (left) {
    throw new Error('No hay suficientes lotes disponibles para esta reserva.')
  }
  return sources
}

/**
 * Prices and allocates one composer line against the lots (earliest expiry first
 * unless a lot is chosen). Pure: it does not reserve anything; see `reserveLine`.
 */
export function quoteLine(
  state: CounterState,
  warehouse: WarehouseName,
  line: CartLine,
): OrderLine {
  const product = requireProduct(line.productId)
  const presentation = presentationFor(product, line.presentationId)
  const loose = line.looseQty

  if (
    !Number.isSafeInteger(line.qty) ||
    line.qty < 0 ||
    !Number.isSafeInteger(loose) ||
    loose < 0 ||
    (presentation.factor === 1 && loose > 0)
  ) {
    throw new Error(
      'Revisa las cantidades por presentación y las unidades sueltas.',
    )
  }

  const unit = product.presentations.find((p) => p.factor === 1 && p.active)
  const parts: Array<QuotePart> = [
    {
      presentationId: presentation.id,
      qty: line.qty,
      factor: presentation.factor,
    },
    ...(loose && unit
      ? [{ presentationId: unit.id, qty: loose, factor: 1 }]
      : []),
  ].filter((part) => part.qty > 0)

  if (!parts.length) throw new Error('Agrega al menos una unidad.')

  const lots = lotsFor(state, product.id, warehouse)
  const qty = parts.reduce((sum, part) => sum + part.qty * part.factor, 0)
  if (qty > availableUnits(lots)) {
    throw new Error(
      'Las presentaciones seleccionadas superan las unidades disponibles.',
    )
  }

  const extraReserved = new Map<string, number>()
  const allocations: Array<Allocation> = []

  for (const part of parts) {
    const partPresentation = product.presentations.find(
      (p) => p.id === part.presentationId,
    )
    if (!partPresentation) continue

    for (const { lot, qty: sourceQty } of sourcesFor(
      lots,
      extraReserved,
      part.qty * part.factor,
      line.lotId,
    )) {
      extraReserved.set(lot.id, (extraReserved.get(lot.id) ?? 0) + sourceQty)
      allocations.push({
        id: `${lot.id}@${partPresentation.id}`,
        lotId: lot.id,
        lot: lot.code,
        origin: {
          code: lot.code,
          costCents: lot.costCents,
          expiresInDays: lot.expiresInDays,
          receivedDaysAgo: lot.receivedDaysAgo,
          salePriceCents: lot.salePriceCents,
        },
        presentationId: partPresentation.id,
        presentationName: partPresentation.name,
        priceFactor: partPresentation.factor,
        qty: sourceQty,
        unitPriceCents: presentationPriceCents(product, partPresentation, lot),
        costPerUnitCents: unitCostCents(product, lot),
        prepared: 0,
        sent: 0,
        delivered: 0,
        rejected: 0,
        cancelled: 0,
        returned: 0,
      })
    }
  }

  return {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    unit: product.baseUnit,
    qty,
    soldAs: parts
      .map((part) => {
        const name = product.presentations.find(
          (p) => p.id === part.presentationId,
        )?.name
        return `${part.qty} ${name}`
      })
      .join(' + '),
    allocations,
  }
}

/** Marks the allocations of a quoted line as reserved in the (already cloned) state. */
export function reserveLine(
  state: CounterState,
  warehouse: WarehouseName,
  line: OrderLine,
) {
  const lots = lotsFor(state, line.productId, warehouse)
  for (const allocation of line.allocations) {
    const lot = lots.find((l) => l.id === allocation.lotId)
    if (lot) lot.reserved += allocation.qty
  }
}
