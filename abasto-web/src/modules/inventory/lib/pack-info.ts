import type { MovementType } from '#/modules/inventory/db/schema'
import type { PackInfo } from '#/modules/inventory/lib/quantity'

type PresentationLike = {
  id: string
  name: string
  factor: number
  active: boolean
  isDefault: boolean
}
type ProductLike = {
  unit: string
  presentations: ReadonlyArray<PresentationLike>
}

/** How to show a product's quantities: default presentation, else the base unit. */
export function packInfoOf(product: ProductLike): PackInfo {
  const main = product.presentations.find(
    (item) => item.isDefault && item.active,
  )
  return main
    ? { packName: main.name, factor: main.factor, unit: product.unit }
    : { packName: product.unit, factor: 1, unit: product.unit }
}

/** Presentations a quantity can be typed in: active ones, default first. */
export function quantityPresentations(
  product: ProductLike,
): Array<PresentationLike> {
  return product.presentations
    .filter((item) => item.active)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
}

const movementLabels: Record<MovementType, string> = {
  purchase: 'Entrada por compra',
  adjustment: 'Ajuste',
  loss: 'Pérdida',
  count: 'Conteo',
  sale: 'Venta',
  transfer_out: 'Salida por traslado',
  transfer_in: 'Entrada por traslado',
  transfer_return: 'Traslado cancelado',
}

export const movementLabel = (type: MovementType) => movementLabels[type]
