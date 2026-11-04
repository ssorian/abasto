import { warehouseNames } from '#/shared/demo/types'
import { fingerprint, parseCsv } from '#/modules/product-import/lib/csv-parse'
import { importHeaders } from '#/modules/product-import/lib/csv-template'

import type { WarehouseName } from '#/shared/demo/types'
import type {
  ImportContext,
  ImportMode,
  ImportPreview,
  PreviewRow,
} from '#/modules/product-import/lib/import-types'

const INTERNAL_LABEL_CODE = /^AB[0-9A-F]{10}$/
const money = (value: number) => `$${value.toFixed(2)}`

const isValidMoney = (value: number) =>
  Number.isFinite(value) &&
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6

function numberValue(
  value: string,
  label: string,
  integer = false,
  allowZero = false,
) {
  const pattern = integer ? /^\d+$/ : /^\d+(?:\.\d{1,2})?$/
  if (!pattern.test(value)) {
    throw new Error(
      `${label}: usa ${integer ? 'un entero' : 'un número con punto decimal y hasta 2 decimales'}.`,
    )
  }
  const parsed = Number(value)
  if (
    !Number.isFinite(parsed) ||
    (integer && !Number.isSafeInteger(parsed)) ||
    parsed < (allowZero ? 0 : 1e-5) ||
    (!integer && !isValidMoney(parsed))
  ) {
    throw new Error(`${label}: importe o cantidad inválida.`)
  }
  return parsed
}

const validDay = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
  new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value

function count(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1)
}

/** Parses and validates the whole file; row problems are reported per row, not thrown. */
export function previewImport(
  text: string,
  mode: ImportMode,
  context: ImportContext,
): ImportPreview {
  const parsed = parseCsv(text)
  const headers = parsed[0].map((header) => header.toLowerCase())
  const expected = importHeaders[mode]
  if (new Set(headers).size !== headers.length)
    throw new Error('Los encabezados no se pueden repetir.')
  const missing = expected.filter((header) => !headers.includes(header))
  const unknown = headers.filter((header) => !expected.includes(header))
  if (missing.length || unknown.length) {
    throw new Error(
      (missing.length ? `Faltan columnas: ${missing.join(', ')}. ` : '') +
        (unknown.length
          ? `Columnas no reconocidas: ${unknown.join(', ')}.`
          : ''),
    )
  }

  const hash = fingerprint(mode, [headers, ...parsed.slice(1)])
  const errors: Array<string> = []
  if (context.importedFingerprints.has(hash))
    errors.push('Este archivo ya fue importado.')

  const skuCount = new Map<string, number>()
  const barcodeCount = new Map<string, number>()
  const stockKeys = new Map<string, number>()
  const raw = parsed.slice(1).map((values, index) => ({
    line: index + 2,
    values,
    cells: Object.fromEntries(
      headers.map((header, column) => [header, values[column] ?? '']),
    ),
  }))
  for (const { cells } of raw) {
    const sku = cells.sku.toLowerCase()
    count(skuCount, sku)
    if (mode === 'catalog') {
      if (cells.codigo_barras) count(barcodeCount, cells.codigo_barras)
    } else {
      count(stockKeys, `${sku}|${cells.almacen}|${cells.lote.toLowerCase()}`)
    }
  }

  const rows = raw.map(({ line, values, cells }) => {
    const row: PreviewRow = { line, cells, errors: [], summary: '' }
    try {
      if (values.length !== headers.length) {
        throw new Error(
          `Se esperaban ${headers.length} columnas; se encontraron ${values.length}.`,
        )
      }
      if (!cells.sku || cells.sku.length > 60)
        throw new Error('Indica un SKU de hasta 60 caracteres.')
      if (mode === 'catalog')
        validateCatalogRow(row, context, skuCount, barcodeCount)
      else validateStockRow(row, context, stockKeys)
    } catch (error) {
      row.errors.push(error instanceof Error ? error.message : 'Fila inválida.')
    }
    return row
  })

  return {
    mode,
    fingerprint: hash,
    rows,
    errors,
    invalidRows: rows.filter((row) => row.errors.length).length,
    totalCost: rows.reduce(
      (sum, row) => sum + (row.entry ? row.entry.quantity * row.entry.cost : 0),
      0,
    ),
  }
}

function validateCatalogRow(
  row: PreviewRow,
  context: ImportContext,
  skuCount: Map<string, number>,
  barcodeCount: Map<string, number>,
) {
  const c = row.cells
  if ((skuCount.get(c.sku.toLowerCase()) ?? 0) > 1)
    throw new Error('SKU repetido dentro del archivo.')
  if (
    context.products.some(
      (product) => product.sku.toLowerCase() === c.sku.toLowerCase(),
    )
  ) {
    throw new Error('El SKU ya existe. Esta carga sólo agrega productos.')
  }
  if (!c.nombre || !c.descripcion)
    throw new Error('Nombre y descripción son obligatorios.')
  if (!context.categories.includes(c.categoria)) {
    throw new Error(
      `Categoría inválida: usa ${context.categories.slice(0, -1).join(', ')} o ${context.categories.at(-1)}.`,
    )
  }
  if (!context.baseUnits.includes(c.unidad_base) || !c.presentacion) {
    throw new Error('Revisa unidad base y nombre de presentación.')
  }
  if (
    c.codigo_barras &&
    ((barcodeCount.get(c.codigo_barras) ?? 0) > 1 ||
      context.products.some((product) =>
        product.barcodes.includes(c.codigo_barras),
      ) ||
      INTERNAL_LABEL_CODE.test(c.codigo_barras))
  ) {
    throw new Error(
      'Código de barras repetido o reservado para etiquetas internas.',
    )
  }
  const factor = numberValue(c.unidades_por_presentacion, 'Equivalencia', true)
  const price = numberValue(c.precio_venta, 'Precio de venta')
  const minStock = numberValue(c.stock_minimo, 'Stock mínimo', true, true)
  if (factor > 1e6) throw new Error('La equivalencia es demasiado grande.')

  row.product = {
    sku: c.sku,
    name: c.nombre,
    brand: c.marca,
    description: c.descripcion,
    category: c.categoria,
    unit: c.unidad_base,
    presentation: c.presentacion,
    factor,
    barcode: c.codigo_barras,
    price,
    minStock,
  }
  row.summary = `Nuevo producto · ${c.presentacion} = ${factor} ${c.unidad_base} · ${money(price)}`
}

function validateStockRow(
  row: PreviewRow,
  context: ImportContext,
  stockKeys: Map<string, number>,
) {
  const c = row.cells
  const product = context.products.find(
    (item) => item.sku.toLowerCase() === c.sku.toLowerCase(),
  )
  if (!product)
    throw new Error('SKU no encontrado. Importa primero el catálogo.')
  if (!warehouseNames.includes(c.almacen as WarehouseName)) {
    throw new Error('Almacén inválido: usa Centro, Norte o Sur.')
  }
  const warehouse = c.almacen as WarehouseName
  if (context.hasStockHistory(product.sku, warehouse)) {
    throw new Error(
      'Este producto ya tiene historial en el almacén. Registra una entrada normal.',
    )
  }
  if (!c.lote || c.lote.length > 100)
    throw new Error('Indica un lote de hasta 100 caracteres.')
  if (
    (stockKeys.get(
      `${c.sku.toLowerCase()}|${c.almacen}|${c.lote.toLowerCase()}`,
    ) ?? 0) > 1
  ) {
    throw new Error('Lote repetido para el mismo producto y almacén.')
  }
  const matches = product.presentations.filter(
    (item) =>
      item.active &&
      (item.name.toLowerCase() === c.presentacion.toLowerCase() ||
        item.id === c.presentacion),
  )
  if (matches.length !== 1) {
    throw new Error(
      'Presentación no encontrada o ambigua. Usa su nombre o identificador del catálogo.',
    )
  }
  const presentation = matches[0]
  const quantity = numberValue(c.cantidad, 'Cantidad', true)
  const cost = numberValue(c.costo_presentacion, 'Costo')
  if (!Number.isSafeInteger(quantity * presentation.factor))
    throw new Error('Cantidad demasiado grande.')
  if (c.caducidad && !validDay(c.caducidad))
    throw new Error('Caducidad inválida. Usa AAAA-MM-DD o deja vacío.')
  const salePrice = c.precio_lote
    ? numberValue(c.precio_lote, 'Precio del lote')
    : undefined

  row.entry = {
    productId: product.id,
    sku: product.sku,
    warehouse,
    presentationId: presentation.id,
    quantity,
    baseQuantity: quantity * presentation.factor,
    cost,
    baseCost: cost / presentation.factor,
    lot: c.lote,
    expiry: c.caducidad,
    salePrice,
  }
  row.summary = `${product.name} · ${quantity} ${presentation.name} = ${quantity * presentation.factor} ${product.unit} · Costo ${money(quantity * cost)}`
}
