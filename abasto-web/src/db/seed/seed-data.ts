import { alpuraMarkup, alpuraRows, lalaRows } from '#/db/seed/seed-catalog'
import type { AlpuraRow, LalaRow } from '#/db/seed/seed-catalog'
import { productImages } from '#/db/seed/product-images'

/**
 * Starting data for a dairy distributor in the south of the Estado de México:
 * four warehouses (Tejupilco, Arcelia, Luvianos and Amatepec) that buy Lala and
 * Alpura products and sell them to authorized stores.
 * Money is integer MXN cents; quantities are base units (piezas).
 */

export const warehouseNames = [
  'Tejupilco',
  'Arcelia',
  'Luvianos',
  'Amatepec',
] as const
export type WarehouseName = (typeof warehouseNames)[number]

/** List price offset per warehouse, in cents per box (Tejupilco is the base). */
export const warehousePriceOffset: Record<WarehouseName, number> = {
  Tejupilco: 0,
  Arcelia: 900,
  Luvianos: 300,
  Amatepec: 600,
}

export type SeedStaff = {
  name: string
  email: string
  warehouse: WarehouseName
  role: 'manager' | 'clerk'
}

export const ownerSeed = { name: 'Dueño Abasto', email: 'dueno@abasto.local' }

export const staffSeed: Array<SeedStaff> = [
  {
    name: 'Laura Méndez',
    email: 'laura@abasto.local',
    warehouse: 'Tejupilco',
    role: 'manager',
  },
  {
    name: 'Carlos Ruiz',
    email: 'carlos@abasto.local',
    warehouse: 'Tejupilco',
    role: 'clerk',
  },
  {
    name: 'Ana Torres',
    email: 'ana@abasto.local',
    warehouse: 'Luvianos',
    role: 'manager',
  },
  {
    name: 'Diego López',
    email: 'diego@abasto.local',
    warehouse: 'Luvianos',
    role: 'clerk',
  },
  {
    name: 'Rosa Jiménez',
    email: 'rosa@abasto.local',
    warehouse: 'Amatepec',
    role: 'manager',
  },
  {
    name: 'Miguel Cruz',
    email: 'miguel@abasto.local',
    warehouse: 'Arcelia',
    role: 'manager',
  },
]

export const supplierSeed = [
  { key: 'lala', name: 'Grupo Lala', contact: 'Ventas mayoreo', phone: '' },
  { key: 'alpura', name: 'Alpura', contact: 'Ventas mayoreo', phone: '' },
] as const
export type SupplierKey = (typeof supplierSeed)[number]['key']

export type SeedPresentation = {
  name: string
  factor: number
  barcode?: string
}

export type SeedProduct = {
  sku: string
  name: string
  brand: string
  description: string
  category: 'Lácteos' | 'Bebidas'
  supplier: SupplierKey
  /** Product photo found on the web. */
  imageUrl: string
  /** The supplier's own code (Lala SKU, Alpura Oracle key). */
  supplierCode: string
  /** Supplier amounts per piece, in ten-thousandths of a peso. */
  fixedDiscountPerPiece: number
  promotionPerPiece: number
  /** Sale presentation (default), e.g. "Caja" with `boxFactor` piezas. */
  boxName: string
  boxFactor: number
  /** Every presentation, the piece first; the box is the default. */
  presentations: Array<SeedPresentation>
  /** Purchase cost per box before supplier discounts (list price). */
  boxCostCents: number
  /** Tejupilco list price per box; other warehouses add their offset. */
  boxPriceCents: number
  /** Days from today to the expiry of a fresh lot. */
  shelfLifeDays: number
}

const cents = (pesos: number) => Math.round(pesos * 100)
/** Pesos to ten-thousandths of a peso (0.1055 → 1055). */
const tenThousandths = (pesos: number) => Math.round(pesos * 10_000)

/** Piece first, then the box when it holds more than one piece. */
function presentationsOf(
  piece: SeedPresentation,
  box: SeedPresentation,
  pallet?: SeedPresentation,
) {
  const rows = box.factor > 1 ? [piece, box] : [piece]
  return pallet ? [...rows, pallet] : rows
}

function lalaProduct(row: LalaRow): SeedProduct {
  const box = row.piecesPerBox
  const details = [
    `Hoja de ruta: ${row.sheetName}`,
    box > 1 ? `Caja con ${box} piezas` : 'Pieza individual',
    `Ganancia por caja $${row.profitPerBox.toFixed(2)}`,
    row.estimated
      ? 'Costo y precio estimados'
      : 'Precio y costo FIFO de la ruta',
  ]
  return {
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    description: details.join(' · '),
    category: row.brand === 'Aquafrut' ? 'Bebidas' : 'Lácteos',
    supplier: 'lala',
    imageUrl: productImages[row.sku],
    supplierCode: row.sku,
    fixedDiscountPerPiece: 0,
    promotionPerPiece: 0,
    boxName: box > 1 ? 'Caja' : 'Pieza',
    boxFactor: box,
    presentations: presentationsOf(
      { name: 'Pieza', factor: 1 },
      { name: 'Caja', factor: box },
    ),
    boxCostCents: cents(row.pieceCost * box),
    boxPriceCents: cents(row.piecePrice * box),
    shelfLifeDays: row.shelfLifeDays,
  }
}

function alpuraProduct(row: AlpuraRow): SeedProduct {
  const box = row.piecesPerBox
  const net = row.listPrice - row.fixedDiscount - row.promotion
  const details = [
    `Pedido: ${row.sheetName}`,
    row.subcategory,
    row.presentation,
    box > 1 ? `Charola con ${box} piezas` : 'Pieza individual',
    `Tarima con ${row.piecesPerPallet} piezas (${row.boxesPerPallet} empaques)`,
    `Precio de lista $${row.listPrice.toFixed(2)} por pieza`,
  ]
  return {
    sku: row.id,
    name: row.name,
    brand: 'Alpura',
    description: details.join(' · '),
    category: 'Lácteos',
    supplier: 'alpura',
    imageUrl: productImages[row.id],
    supplierCode: row.oracle,
    fixedDiscountPerPiece: tenThousandths(row.fixedDiscount),
    promotionPerPiece: tenThousandths(row.promotion),
    boxName: box > 1 ? 'Charola' : 'Pieza',
    boxFactor: box,
    presentations: presentationsOf(
      { name: 'Pieza', factor: 1, barcode: row.barcode },
      { name: 'Charola', factor: box },
      { name: 'Tarima', factor: row.piecesPerPallet },
    ),
    boxCostCents: cents(row.listPrice * box),
    boxPriceCents: cents(net * alpuraMarkup * box),
    shelfLifeDays: row.shelfLifeDays,
  }
}

export const productSeed: Array<SeedProduct> = [
  ...lalaRows.map(lalaProduct),
  ...alpuraRows.map(alpuraProduct),
]

/** Tejupilco stock in boxes: the Alpura order and the Lala route outgoing pieces. */
const tejupilcoStock = Object.fromEntries([
  ...alpuraRows
    .filter((row) => row.orderedPieces > 0)
    .map((row) => [row.id, Math.ceil(row.orderedPieces / row.piecesPerBox)]),
  ...lalaRows
    .filter((row) => row.routeOutPieces > 0)
    .map((row) => [row.sku, Math.ceil(row.routeOutPieces / row.piecesPerBox)]),
]) as Partial<Record<string, number>>

/** Boxes received per warehouse and SKU (absent = none). */
export const stockSeed: Record<
  WarehouseName,
  Partial<Record<string, number>>
> = {
  Tejupilco: tejupilcoStock,
  Luvianos: {
    '13455': 40,
    '25023': 20,
    '23431': 8,
    '1271': 10,
    LU53: 20,
    CA10: 6,
    SA80: 10,
  },
  Amatepec: {
    '13455': 20,
    '1271': 8,
    LU53: 10,
    CA10: 2,
    SA80: 6,
  },
  Arcelia: {
    '13455': 15,
    '25023': 10,
    LU53: 12,
    SA80: 6,
  },
}

/** Minimum stock in boxes per warehouse and SKU. */
export const minimumSeed: Record<
  WarehouseName,
  Partial<Record<string, number>>
> = {
  Tejupilco: { '13455': 40, '25023': 20, LU53: 60, CA10: 30 },
  Luvianos: { '13455': 15, LU53: 10 },
  Amatepec: { '13455': 10, CA10: 5 },
  Arcelia: { '13455': 10, LU53: 5 },
}

export type SeedCustomer = {
  key: string
  name: string
  contact: string
  phone: string
  address: string
  notes?: string
  active?: boolean
  credit?: { limitCents: number; termsDays: number }
  /** Commercial rules on the sale presentation (box) of a SKU. */
  rules?: Array<{
    sku: string
    minBoxes: number
    discountBps?: number
    priceCents?: number
  }>
}

export const customerSeed: Array<SeedCustomer> = [
  {
    key: 'donPepe',
    name: 'Abarrotes Don Pepe',
    contact: 'José Pérez',
    phone: '724 267 1234',
    address: 'Av. Juárez 120, Centro, Tejupilco de Hidalgo, Méx.',
    credit: { limitCents: 1_500_000, termsDays: 5 },
    rules: [{ sku: '13455', minBoxes: 10, discountBps: 500 }],
  },
  {
    key: 'esquinita',
    name: 'Tienda La Esquinita',
    contact: 'Marta Ríos',
    phone: '724 267 2345',
    address: 'Calle Morelos 45, Tejupilco de Hidalgo, Méx.',
    notes: 'Solo contado.',
  },
  {
    key: 'sanchez',
    name: 'Distribuidora Sánchez',
    contact: 'Ricardo Sánchez',
    phone: '724 269 3456',
    address: 'Carretera Tejupilco–Amatepec km 4, Bodega 3, Tejupilco, Méx.',
    credit: { limitCents: 5_000_000, termsDays: 30 },
    rules: [{ sku: '13455', minBoxes: 20, priceCents: 26500 }],
  },
  {
    key: 'guero',
    name: 'Minisúper El Güero',
    contact: 'Luis Ortega',
    phone: '724 267 4567',
    address: 'Av. Cristóbal Hidalgo 300, Tejupilco de Hidalgo, Méx.',
    notes: 'Paga tarde: revisar saldo antes de fiar.',
    credit: { limitCents: 800_000, termsDays: 7 },
  },
  {
    key: 'pinos',
    name: 'Cremería Los Pinos',
    contact: 'Elena Vargas',
    phone: '724 266 5678',
    address: 'Mercado Municipal local 18, Luvianos, Méx.',
    credit: { limitCents: 2_000_000, termsDays: 15 },
    rules: [{ sku: 'CA10', minBoxes: 5, discountBps: 400 }],
  },
  {
    key: 'hernandez',
    name: 'Comercial Hernández',
    contact: 'Pedro Hernández',
    phone: '732 672 0123',
    address: 'Calle 5 de Mayo 9, Centro, Arcelia, Gro.',
    notes: 'Dejó de comprar.',
    active: false,
  },
]
