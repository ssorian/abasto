/**
 * Demo business for local development: a milk and soda warehouse with four
 * warehouses that buys from suppliers and sells to authorized distributors.
 * Money is integer MXN cents; quantities are base units (piezas).
 */

export const warehouseNames = ['Centro', 'Norte', 'Sur', 'Poniente'] as const
export type WarehouseName = (typeof warehouseNames)[number]

/** List price offset per warehouse, in cents per box (Centro is the base). */
export const warehousePriceOffset: Record<WarehouseName, number> = {
  Centro: 0,
  Norte: 600,
  Sur: 300,
  Poniente: 900,
}

export type DemoStaff = {
  name: string
  email: string
  warehouse: WarehouseName
  role: 'manager' | 'clerk'
}

export const ownerSeed = { name: 'Dueño Abasto', email: 'dueno@abasto.local' }

export const staffSeed: Array<DemoStaff> = [
  {
    name: 'Laura Méndez',
    email: 'laura@abasto.local',
    warehouse: 'Centro',
    role: 'manager',
  },
  {
    name: 'Carlos Ruiz',
    email: 'carlos@abasto.local',
    warehouse: 'Centro',
    role: 'clerk',
  },
  {
    name: 'Ana Torres',
    email: 'ana@abasto.local',
    warehouse: 'Norte',
    role: 'manager',
  },
  {
    name: 'Diego López',
    email: 'diego@abasto.local',
    warehouse: 'Norte',
    role: 'clerk',
  },
  {
    name: 'Rosa Jiménez',
    email: 'rosa@abasto.local',
    warehouse: 'Sur',
    role: 'manager',
  },
  {
    name: 'Miguel Cruz',
    email: 'miguel@abasto.local',
    warehouse: 'Poniente',
    role: 'manager',
  },
]

export const supplierSeed = [
  { key: 'lala', name: 'Grupo Lala', contact: 'Ventas mayoreo', phone: '' },
  { key: 'alpura', name: 'Alpura', contact: 'Ventas mayoreo', phone: '' },
  {
    key: 'coca',
    name: 'Coca-Cola FEMSA',
    contact: 'Ruta de preventa',
    phone: '',
  },
  { key: 'penafiel', name: 'Peñafiel', contact: 'Ruta de preventa', phone: '' },
] as const
export type SupplierKey = (typeof supplierSeed)[number]['key']

export type DemoProduct = {
  sku: string
  name: string
  brand: string
  description: string
  category: 'Lácteos' | 'Bebidas'
  supplier: SupplierKey
  /** Sale presentation (default), e.g. "Caja" with `boxFactor` piezas. */
  boxName: string
  boxFactor: number
  /** Purchase cost per box. */
  boxCostCents: number
  /** Centro list price per box; other warehouses add their offset. */
  boxPriceCents: number
  /** Days from today to the expiry of a fresh lot. */
  shelfLifeDays: number
}

export const productSeed: Array<DemoProduct> = [
  {
    sku: 'LAL-001',
    name: 'Leche entera Lala 1 L',
    brand: 'Lala',
    description: 'Cartón de 1 L',
    category: 'Lácteos',
    supplier: 'lala',
    boxName: 'Caja',
    boxFactor: 12,
    boxCostCents: 26400,
    boxPriceCents: 30000,
    shelfLifeDays: 18,
  },
  {
    sku: 'LAL-002',
    name: 'Leche deslactosada Lala 1 L',
    brand: 'Lala',
    description: 'Cartón de 1 L',
    category: 'Lácteos',
    supplier: 'lala',
    boxName: 'Caja',
    boxFactor: 12,
    boxCostCents: 28800,
    boxPriceCents: 32400,
    shelfLifeDays: 18,
  },
  {
    sku: 'LAL-003',
    name: 'Yogur bebible Lala fresa 250 g',
    brand: 'Lala',
    description: 'Botella de 250 g',
    category: 'Lácteos',
    supplier: 'lala',
    boxName: 'Caja',
    boxFactor: 24,
    boxCostCents: 21600,
    boxPriceCents: 25200,
    shelfLifeDays: 12,
  },
  {
    sku: 'ALP-001',
    name: 'Leche Alpura Clásica 1 L',
    brand: 'Alpura',
    description: 'Cartón de 1 L',
    category: 'Lácteos',
    supplier: 'alpura',
    boxName: 'Caja',
    boxFactor: 12,
    boxCostCents: 27600,
    boxPriceCents: 31200,
    shelfLifeDays: 20,
  },
  {
    sku: 'ALP-002',
    name: 'Leche Alpura Deslactosada Light 1 L',
    brand: 'Alpura',
    description: 'Cartón de 1 L',
    category: 'Lácteos',
    supplier: 'alpura',
    boxName: 'Caja',
    boxFactor: 12,
    boxCostCents: 30000,
    boxPriceCents: 34200,
    shelfLifeDays: 20,
  },
  {
    sku: 'ALP-003',
    name: 'Crema Alpura 450 ml',
    brand: 'Alpura',
    description: 'Envase de 450 ml',
    category: 'Lácteos',
    supplier: 'alpura',
    boxName: 'Caja',
    boxFactor: 12,
    boxCostCents: 42000,
    boxPriceCents: 48000,
    shelfLifeDays: 25,
  },
  {
    sku: 'COC-001',
    name: 'Coca-Cola 600 ml',
    brand: 'Coca-Cola',
    description: 'Botella PET de 600 ml',
    category: 'Bebidas',
    supplier: 'coca',
    boxName: 'Caja',
    boxFactor: 24,
    boxCostCents: 39200,
    boxPriceCents: 43800,
    shelfLifeDays: 180,
  },
  {
    sku: 'COC-002',
    name: 'Coca-Cola 2 L',
    brand: 'Coca-Cola',
    description: 'Botella PET de 2 L',
    category: 'Bebidas',
    supplier: 'coca',
    boxName: 'Paquete',
    boxFactor: 8,
    boxCostCents: 26400,
    boxPriceCents: 29600,
    shelfLifeDays: 180,
  },
  {
    sku: 'COC-003',
    name: 'Coca-Cola Sin Azúcar 600 ml',
    brand: 'Coca-Cola',
    description: 'Botella PET de 600 ml',
    category: 'Bebidas',
    supplier: 'coca',
    boxName: 'Caja',
    boxFactor: 24,
    boxCostCents: 39200,
    boxPriceCents: 43800,
    shelfLifeDays: 180,
  },
  {
    sku: 'COC-004',
    name: 'Sprite 600 ml',
    brand: 'Sprite',
    description: 'Botella PET de 600 ml',
    category: 'Bebidas',
    supplier: 'coca',
    boxName: 'Caja',
    boxFactor: 24,
    boxCostCents: 33600,
    boxPriceCents: 37800,
    shelfLifeDays: 180,
  },
  {
    sku: 'COC-005',
    name: 'Agua Ciel 1 L',
    brand: 'Ciel',
    description: 'Botella PET de 1 L',
    category: 'Bebidas',
    supplier: 'coca',
    boxName: 'Paquete',
    boxFactor: 12,
    boxCostCents: 9600,
    boxPriceCents: 11400,
    shelfLifeDays: 360,
  },
  {
    sku: 'PEN-001',
    name: 'Peñafiel Mineral 600 ml',
    brand: 'Peñafiel',
    description: 'Botella PET de 600 ml',
    category: 'Bebidas',
    supplier: 'penafiel',
    boxName: 'Caja',
    boxFactor: 24,
    boxCostCents: 26400,
    boxPriceCents: 30000,
    shelfLifeDays: 270,
  },
]

/** Target margin per category, in basis points (purchase price suggestions). */
export const marginBps: Record<DemoProduct['category'], number> = {
  Lácteos: 1200,
  Bebidas: 1100,
}

/** Boxes received per warehouse and SKU (absent = none). */
export const stockSeed: Record<
  WarehouseName,
  Partial<Record<string, number>>
> = {
  Centro: {
    'LAL-001': 60,
    'LAL-002': 30,
    'LAL-003': 10,
    'ALP-001': 40,
    'ALP-002': 20,
    'ALP-003': 12,
    'COC-001': 50,
    'COC-002': 30,
    'COC-003': 20,
    'COC-004': 20,
    'COC-005': 40,
    'PEN-001': 20,
  },
  Norte: {
    'LAL-001': 40,
    'LAL-002': 20,
    'LAL-003': 8,
    'ALP-001': 20,
    'ALP-003': 6,
    'COC-001': 40,
    'COC-002': 20,
    'COC-005': 30,
    'PEN-001': 10,
  },
  Sur: {
    'LAL-001': 20,
    'ALP-001': 10,
    'ALP-003': 2,
    'COC-001': 25,
    'COC-004': 10,
    'COC-005': 20,
  },
  Poniente: { 'COC-001': 15, 'COC-002': 10, 'COC-005': 25, 'PEN-001': 12 },
}

/** Minimum stock in boxes per warehouse and SKU. */
export const minimumSeed: Record<
  WarehouseName,
  Partial<Record<string, number>>
> = {
  Centro: { 'LAL-001': 20, 'ALP-001': 15, 'COC-001': 20, 'COC-005': 10 },
  Norte: { 'LAL-001': 15, 'COC-001': 15 },
  Sur: { 'LAL-001': 10, 'ALP-003': 5, 'COC-001': 10 },
  Poniente: { 'COC-001': 10, 'COC-005': 10 },
}

export type DemoCustomer = {
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

export const customerSeed: Array<DemoCustomer> = [
  {
    key: 'donPepe',
    name: 'Abarrotes Don Pepe',
    contact: 'José Pérez',
    phone: '55 1234 5678',
    address: 'Av. Hidalgo 120, Col. Centro',
    credit: { limitCents: 1_500_000, termsDays: 5 },
    rules: [{ sku: 'COC-001', minBoxes: 10, discountBps: 500 }],
  },
  {
    key: 'esquinita',
    name: 'Tienda La Esquinita',
    contact: 'Marta Ríos',
    phone: '55 2345 6789',
    address: 'Calle Morelos 45, Col. Juárez',
    notes: 'Solo contado.',
  },
  {
    key: 'sanchez',
    name: 'Distribuidora Sánchez',
    contact: 'Ricardo Sánchez',
    phone: '55 3456 7890',
    address: 'Carretera Federal km 12, Bodega 3',
    credit: { limitCents: 5_000_000, termsDays: 30 },
    rules: [{ sku: 'LAL-001', minBoxes: 20, priceCents: 29000 }],
  },
  {
    key: 'guero',
    name: 'Minisúper El Güero',
    contact: 'Luis Ortega',
    phone: '55 4567 8901',
    address: 'Av. Reforma 300, Col. Moderna',
    notes: 'Paga tarde: revisar saldo antes de fiar.',
    credit: { limitCents: 800_000, termsDays: 7 },
  },
  {
    key: 'pinos',
    name: 'Cremería Los Pinos',
    contact: 'Elena Vargas',
    phone: '55 5678 9012',
    address: 'Mercado Municipal local 18',
    credit: { limitCents: 2_000_000, termsDays: 15 },
    rules: [{ sku: 'ALP-003', minBoxes: 5, discountBps: 400 }],
  },
  {
    key: 'hernandez',
    name: 'Comercial Hernández',
    contact: 'Pedro Hernández',
    phone: '55 6789 0123',
    address: 'Calle 5 de Mayo 9',
    notes: 'Dejó de comprar.',
    active: false,
  },
]
