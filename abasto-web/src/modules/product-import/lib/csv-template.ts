import type { ImportMode } from '#/modules/product-import/lib/import-types'

export const importHeaders: Record<ImportMode, ReadonlyArray<string>> = {
  catalog: [
    'sku',
    'nombre',
    'marca',
    'descripcion',
    'categoria',
    'unidad_base',
    'presentacion',
    'unidades_por_presentacion',
    'codigo_barras',
    'precio_venta',
    'stock_minimo',
  ],
  stock: [
    'sku',
    'almacen',
    'presentacion',
    'cantidad',
    'costo_presentacion',
    'lote',
    'caducidad',
    'precio_lote',
  ],
}

const exampleRow: Record<ImportMode, string> = {
  catalog:
    'NUE-001,Producto de ejemplo,Marca,Descripcion del producto,Abarrotes,piezas,Caja,12,7500000000001,240.00,24',
  stock: 'BEB-001,Sur,cajas,10,410.00,LOTE-INICIAL,2027-12-31,470.00',
}

/** Template with a BOM (Excel-friendly), the header row and one example row. */
export const importTemplate = (mode: ImportMode) =>
  `\uFEFF${importHeaders[mode].join(',')}\r\n${exampleRow[mode]}\r\n`

export const templateFilename = (mode: ImportMode) =>
  `abarroteros-plantilla-${mode === 'catalog' ? 'catalogo' : 'existencias'}.csv`

/** Triggers a browser download of a text file. */
export function downloadText(content: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/csv;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export const columnRules: Record<ImportMode, string> = {
  catalog:
    'Categorías: Bebidas, Abarrotes, Botanas, Lácteos. Unidades base: piezas, cajas, bultos, paquetes. Precio y equivalencia deben ser mayores a cero. Código de barras y marca pueden quedar vacíos.',
  stock:
    'Almacenes: Centro, Norte, Sur. Presentación: nombre o identificador registrado en Catálogo. Puedes cargar varios lotes del mismo producto. Caducidad y precio_lote son opcionales. Las existencias se agregan con fecha de hoy; no se reemplaza el historial.',
}

export const modeBanners: Record<ImportMode, string> = {
  catalog:
    'Sólo se dan de alta productos nuevos. SKU y códigos existentes generan error. Define la presentación principal y su equivalencia. precio_venta (de la presentación principal) y stock_minimo (en unidades base) se guardan en el almacén elegido en Catálogo; una carga con error en una fila no guarda esa fila.',
  stock:
    'Sólo se cargan productos y almacenes sin historial previo. Deben existir en el catálogo. Cantidad y costo corresponden a la presentación indicada; precio_lote corresponde a la presentación principal y puede quedar vacío para heredar el precio general.',
}
