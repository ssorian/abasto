import { businessDate } from '#/lib/utils/format'
import { ALL, namedManualReasons } from '#/modules/reports/lib/constants'
import { dayDistance } from '#/modules/reports/lib/period'
import { demoProducts } from '#/shared/demo/products'
import { warehouseNames } from '#/shared/demo/types'

import type {
  AgingRow,
  LossMovement,
  LossReason,
  LossRow,
  SaleEvent,
  StockLayer,
  StockPosition,
} from '#/modules/reports/types/reports'

/** Reason under which a movement counts as a loss; empty when it is not one. */
export function lossReason(movement: LossMovement): LossReason | '' {
  if (movement.type === 'Faltante en traslado') return 'Faltante en traslado'
  if (movement.type === 'Ajuste negativo') return 'Diferencia de inventario'
  if (movement.type === 'Salida manual' && movement.quantity < 0) {
    const named = movement.note.split(' · ')[0]
    return (
      namedManualReasons.find((reason) => reason === named) ??
      'Otras salidas manuales'
    )
  }
  return ''
}

type LossFilters = {
  from: string
  to: string
  warehouse: string
  product: string
}

/** One row per lot affected by each loss movement, newest first. */
export function lossRows(
  movements: ReadonlyArray<LossMovement>,
  { from, to, warehouse, product }: LossFilters,
): Array<LossRow> {
  return movements
    .flatMap((movement) => {
      const reason = lossReason(movement)
      const day = businessDate(new Date(movement.date))
      const item = demoProducts.find((p) => p.id === movement.productId)
      const excluded =
        !reason ||
        !item ||
        day < from ||
        day > to ||
        (warehouse !== ALL && movement.warehouse !== warehouse) ||
        (product !== ALL && movement.productId !== product)
      if (excluded) return []

      return movement.lots.map((lot, index) => ({
        id: `${movement.id}-${index}`,
        date: day,
        ref: movement.ref || movement.id,
        productId: item.id,
        name: item.name,
        sku: item.sku,
        warehouse: movement.warehouse,
        unit: item.baseUnit,
        reason,
        note: movement.note,
        actor: movement.actor || 'Sin registrar',
        lot: lot.lot || 'Sin lote',
        quantity: lot.quantity,
        costCents: lot.quantity * lot.unitCostCents,
      }))
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

const layerValue = (layer: StockLayer) => layer.quantity * layer.unitCostCents
const sumValue = (layers: ReadonlyArray<StockLayer>) =>
  layers.reduce((sum, layer) => sum + layerValue(layer), 0)

const isBlocked = (layer: StockLayer, asOf: string) =>
  layer.blocked || (layer.expiryDate !== null && layer.expiryDate < asOf)

/** Days after which sellable stock counts as about to expire. */
const EXPIRING_WINDOW_DAYS = 30

type AgingFilters = { warehouse: string; product: string; asOf: string }

/** Stock per product and warehouse with the time since its last sale or first receipt. */
export function agingRows(
  positions: ReadonlyArray<StockPosition>,
  sales: ReadonlyArray<SaleEvent>,
  { warehouse, product, asOf }: AgingFilters,
): Array<AgingRow> {
  return demoProducts
    .filter((item) => product === ALL || item.id === product)
    .flatMap((item) =>
      warehouseNames
        .filter((name) => warehouse === ALL || name === warehouse)
        .flatMap((name) => {
          const position = positions.find(
            (p) => p.productId === item.id && p.warehouse === name,
          )
          const quantity =
            position?.layers.reduce((sum, layer) => sum + layer.quantity, 0) ??
            0
          if (!position || !quantity) return []

          const saleDays = sales
            .filter(
              (e) =>
                e.productId === item.id &&
                e.warehouse === name &&
                e.type === 'Venta',
            )
            .map((e) => businessDate(new Date(e.date)))
            .filter((day) => day <= asOf)
            .sort()
          const received = [
            ...position.layers.map((layer) => layer.receivedDate),
            ...position.entryDates,
          ]
            .filter((day) => day <= asOf)
            .sort()

          const lastSale = saleDays.at(-1) ?? null
          const firstKnown = received[0] ?? null
          const reference = lastSale ?? firstKnown

          return [
            {
              productId: item.id,
              name: item.name,
              sku: item.sku,
              warehouse: name,
              unit: item.baseUnit,
              quantity,
              reserved: position.reserved,
              valueCents: sumValue(position.layers),
              lastSale,
              firstKnown,
              days: reference ? dayDistance(reference, asOf) : null,
              blockedValueCents: sumValue(
                position.layers.filter((layer) => isBlocked(layer, asOf)),
              ),
              expiringValueCents: sumValue(
                position.layers.filter(
                  (layer) =>
                    !isBlocked(layer, asOf) &&
                    layer.expiryDate !== null &&
                    dayDistance(asOf, layer.expiryDate) <= EXPIRING_WINDOW_DAYS,
                ),
              ),
            },
          ]
        }),
    )
}
