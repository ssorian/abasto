import {
  inventoryProducts,
  requireProduct,
} from '#/modules/inventory/lib/catalog'
import { isBlocked, requireRecord } from '#/modules/inventory/lib/stock'

import type { WarehouseName } from '#/shared/demo/types'
import type {
  InventoryProduct,
  InventoryState,
  Lot,
  LotLabel,
} from '#/modules/inventory/types/inventory'

/** Code 39 widths: uppercase = wide (3), lowercase = narrow (1); `b` bar, `s` space. */
const patterns: Record<string, string> = {
  '0': 'bsbSBsBsb',
  '1': 'BsbSbsbsB',
  '2': 'bsBSbsbsB',
  '3': 'BsBSbsbsb',
  '4': 'bsbSBsbsB',
  '5': 'BsbSBsbsb',
  '6': 'bsBSBsbsb',
  '7': 'bsbSbsBsB',
  '8': 'BsbSbsBsb',
  '9': 'bsBSbsBsb',
  A: 'BsbsbSbsB',
  B: 'bsBsbSbsB',
  C: 'BsBsbSbsb',
  D: 'bsbsBSbsB',
  E: 'BsbsBSbsb',
  F: 'bsBsBSbsb',
  '*': 'bSbsBsBsb',
}

export const LABEL_CODE_PATTERN = /^AB[0-9A-F]{10}$/

export type Bar = { x: number; width: number }

/** Bar positions of a Code 39 symbol for an internal label code. */
export function barcodeGeometry(code: string): {
  bars: Array<Bar>
  width: number
} {
  if (!LABEL_CODE_PATTERN.test(code))
    throw new Error('Código interno inválido.')
  let x = 12
  const bars: Array<Bar> = []
  for (const char of `*${code}*`) {
    for (const mark of patterns[char]) {
      const width = mark === mark.toUpperCase() ? 3 : 1
      if (mark.toLowerCase() === 'b') bars.push({ x, width })
      x += width
    }
    x++
  }
  return { bars, width: x + 11 }
}

export const findLabel = (
  state: InventoryState,
  productId: string,
  warehouse: WarehouseName,
  lotId: string,
  presentationId: string,
) =>
  state.labels.find(
    (label) =>
      label.productId === productId &&
      label.warehouse === warehouse &&
      label.lotId === lotId &&
      label.presentationId === presentationId,
  )

/** Creates the internal label code that identifies one presentation of one lot. */
export function createLotLabel(
  state: InventoryState,
  productId: string,
  warehouse: WarehouseName,
  lotId: string,
  presentationId: string,
): InventoryState {
  const product = requireProduct(productId)
  const presentation = product.presentations.find(
    (item) => item.id === presentationId && item.active,
  )
  const lot = requireRecord(state, productId, warehouse).lots.find(
    (item) => item.id === lotId,
  )
  if (
    !presentation ||
    !lot ||
    isBlocked(lot) ||
    lot.qty < presentation.factor
  ) {
    throw new Error(
      'El lote debe estar disponible y contener una presentación completa.',
    )
  }
  if (findLabel(state, productId, warehouse, lotId, presentationId)) {
    throw new Error('La etiqueta ya existe; puedes volver a imprimirla.')
  }

  const taken = new Set([
    ...state.labels.map((label) => label.code),
    ...inventoryProducts.map((item) => item.barcode),
  ])
  let code = ''
  do {
    code = `AB${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`
  } while (taken.has(code))

  const label: LotLabel = {
    code,
    productId,
    warehouse,
    lotId,
    presentationId,
    lot: lot.code,
    createdAt: new Date().toISOString(),
  }
  return { ...state, labels: [label, ...state.labels] }
}

const escapeMarkup = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ] ?? char,
  )

/** Standalone HTML for the print window: `copies` labels in an A4 sheet. */
export function printableLabels(
  product: InventoryProduct,
  lot: Lot,
  label: LotLabel,
  presentationName: string,
  factor: number,
  copies: number,
) {
  const { bars, width } = barcodeGeometry(label.code)
  const e = escapeMarkup
  const article = `<article class="lot-label"><strong>${e(product.name)}</strong><div>${e(presentationName)} · ${factor} ${e(product.unit)} · ${e(label.warehouse)}</div><b>Lote ${e(label.lot)}</b><div>Caducidad: ${e(lot.expiry || 'Sin fecha')}</div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 65" role="img" aria-label="${e(label.code)}"><rect width="${width}" height="65" fill="white"/>${bars.map((bar) => `<rect x="${bar.x}" y="3" width="${bar.width}" height="59" fill="black"/>`).join('')}</svg><code>${e(label.code)}</code><small>Precio vigente al vender · Etiqueta interna</small></article>`
  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>Etiquetas de lote</title><style>body{font:12px system-ui;margin:12mm;color:#000}main{display:grid;grid-template-columns:repeat(2,90mm);gap:5mm}.lot-label{width:90mm;height:55mm;box-sizing:border-box;border:1px solid #000;padding:4mm;display:grid;gap:1mm;break-inside:avoid}.lot-label strong{font-size:14px}.lot-label svg{width:100%;height:18mm}.lot-label code,.lot-label small{text-align:center}.lot-label small{font-size:9px}</style><main>${article.repeat(copies)}</main><script>window.onload=()=>window.print()</script></html>`
}
