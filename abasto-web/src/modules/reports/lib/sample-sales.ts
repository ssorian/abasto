import { businessDate } from '#/lib/utils/format'
import { minimumMarginPct, unregistered } from '#/modules/reports/lib/constants'
import { addDays } from '#/modules/reports/lib/period'
import { findProduct } from '#/shared/demo/products'

import type {
  SaleEvent,
  SampleReview,
  SampleScenario,
} from '#/modules/reports/types/reports'

type SaleSpec = {
  /** Days from today; negative is in the past. */
  days: number
  /** Whole presentations sold. */
  packs: number
  /** Cost per presentation, in pesos. */
  cost: number
  /** Agreed price per presentation, in pesos. */
  price: number
  discount: number
}

/** Six delivered sales spread over today and the last five weeks. */
const saleSpecs: Array<SaleSpec> = [
  { days: 0, packs: 15, cost: 385, price: 438, discount: 0 },
  { days: 0, packs: 5, cost: 410, price: 470, discount: 5 },
  { days: -1, packs: 12, cost: 380, price: 438, discount: 0 },
  { days: -6, packs: 8, cost: 405, price: 470, discount: 0 },
  { days: -18, packs: 20, cost: 375, price: 430, discount: 2 },
  { days: -35, packs: 10, cost: 370, price: 425, discount: 0 },
]

const RETURNED_PACKS = 2
const SAMPLE_PRODUCT = 'coca'
const SAMPLE_WAREHOUSE = 'Sur'
const SAMPLE_EXPIRY_DAYS = 90

const signed = (quantity: number) =>
  quantity > 0 ? `+${quantity}` : `${quantity}`

/**
 * Builds the sample sales of the reference: six deliveries of the first product in the
 * "Sur" warehouse plus a return of part of the oldest one. Pure apart from the ids it asks for.
 */
export function buildSampleScenario(
  now: Date,
  newId: (prefix: string) => string,
): SampleScenario {
  const product = findProduct(SAMPLE_PRODUCT)
  if (!product) throw new Error('Producto de ejemplo no disponible.')

  const presentation = product.presentations.find(
    (p) => p.id === product.defaultPresentationId,
  )
  const factor = presentation?.factor ?? 1
  const presentationName = presentation?.name ?? product.baseUnit

  const base = {
    channel: unregistered,
    promotionName: '',
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    unit: product.baseUnit,
    warehouse: SAMPLE_WAREHOUSE,
    presentationName,
    priceFactor: factor,
  } as const

  const orders = saleSpecs.map((spec, index) => {
    const at = new Date(now)
    at.setDate(at.getDate() + spec.days)
    at.setMilliseconds(at.getMilliseconds() + index)

    const unitPriceCents = spec.price * 100
    const netUnitPriceCents = (unitPriceCents * (100 - spec.discount)) / 100
    const quantity = spec.packs * factor
    const unitCostCents = (spec.cost * 100) / factor
    const gross = spec.packs * unitPriceCents

    const sale: SaleEvent = {
      ...base,
      id: newId('VEN'),
      type: 'Venta',
      orderId: newId('ABR'),
      customer: `Abarrotes de ejemplo ${index + 1}`,
      receiptId: newId('REC'),
      lot: newId('REP'),
      quantity,
      unitCostCents,
      unitPriceCents,
      netUnitPriceCents,
      discountPct: spec.discount,
      grossCents: gross,
      netCents: Math.round(spec.packs * netUnitPriceCents),
      costCents: Math.round(quantity * unitCostCents),
      date: at.toISOString(),
    }

    return { sale, receivedAt: at }
  })

  // The return restores part of the oldest sale at its original price and cost.
  const oldest = orders[orders.length - 1].sale
  const returnedQuantity = RETURNED_PACKS * factor
  const returned: SaleEvent = {
    ...oldest,
    id: newId('DEV'),
    type: 'Devolución',
    quantity: returnedQuantity,
    grossCents: RETURNED_PACKS * oldest.unitPriceCents,
    netCents: Math.round(RETURNED_PACKS * oldest.netUnitPriceCents),
    costCents: Math.round(returnedQuantity * oldest.unitCostCents),
    date: new Date(now.getTime() + orders.length).toISOString(),
  }

  const sales = [returned, ...orders.map((order) => order.sale).reverse()]
  const today = businessDate(now)

  return {
    sales,
    position: {
      productId: product.id,
      warehouse: SAMPLE_WAREHOUSE,
      reserved: 0,
      entryDates: orders.map((order) => businessDate(order.receivedAt)),
      layers: [
        {
          quantity: returnedQuantity,
          unitCostCents: oldest.unitCostCents,
          receivedDate: businessDate(orders[orders.length - 1].receivedAt),
          expiryDate: addDays(today, SAMPLE_EXPIRY_DAYS + orders.length - 1),
          blocked: false,
        },
      ],
    },
    review: reviewSample(sales, product.name),
  }
}

/** Describes what the samples change so the user can confirm with a reason. */
function reviewSample(
  sales: Array<SaleEvent>,
  productName: string,
): SampleReview {
  const deliveries = sales.filter((sale) => sale.type === 'Venta')
  const returned = sales.find((sale) => sale.type === 'Devolución')

  const risks = deliveries
    .filter(
      (sale) =>
        sale.netCents - sale.costCents <
        (sale.netCents * minimumMarginPct) / 100,
    )
    .map((sale) => {
      const margin = ((sale.netCents - sale.costCents) / sale.netCents) * 100
      return `Venta bajo margen mínimo (${minimumMarginPct}%): ${productName} · ${sale.lot}: ${margin.toFixed(1)}%`
    })
  risks.push('Ajuste, baja o devolución de inventario')

  const stock = (movement: string, quantity: number, warehouse: string) => ({
    entity: 'Inventario',
    detail: `${movement} · ${productName} · ${signed(quantity)} unidades · ${warehouse}`,
  })

  return {
    risks,
    changes: [
      ...(returned
        ? [stock('Devolución', returned.quantity, returned.warehouse)]
        : []),
      ...deliveries.flatMap((sale) => [
        stock('Despacho', -sale.quantity, sale.warehouse),
        stock('Entrada', sale.quantity, sale.warehouse),
      ]),
      ...deliveries.map((sale) => ({
        entity: 'Ventas',
        detail: `${sale.channel} · ${sale.customer} · ${sale.quantity} ${sale.unit}`,
      })),
    ],
  }
}
