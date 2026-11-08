import { parseBoxCount } from '#/modules/inventory/lib/box-count'

/** Message when `text` is not a valid number of boxes to write off; null when it is. */
export function writeOffError(text: string, owedBoxes: number): string | null {
  const boxes = parseBoxCount(text)
  if (!boxes.ok) return boxes.message
  if (boxes.value === 0) return 'Escribe cuántas cajas descontar.'
  if (boxes.value > owedBoxes) {
    return `El proveedor debe ${owedBoxes} ${owedBoxes === 1 ? 'caja' : 'cajas'}.`
  }
  return null
}
