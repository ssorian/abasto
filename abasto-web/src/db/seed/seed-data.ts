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

export type SeedProduct = {
  sku: string
  name: string
  brand: string
  description: string
  category: 'Lácteos'
  supplier: SupplierKey
  /** Official product photo published by the brand. */
  imageUrl: string
  /** Sale presentation (default), e.g. "Caja" with `boxFactor` piezas. */
  boxName: string
  boxFactor: number
  /** Purchase cost per box. */
  boxCostCents: number
  /** Tejupilco list price per box; other warehouses add their offset. */
  boxPriceCents: number
  /** Days from today to the expiry of a fresh lot. */
  shelfLifeDays: number
}

const lalaMedia = 'https://www.lala.com.mx/storage/app/media'
const alpuraMedia = 'https://alpura.com/api/media/file'

export const productSeed: Array<SeedProduct> = [
  {
    sku: 'LAL-001',
    name: 'Leche Lala Entera UHT 1 L',
    brand: 'Lala',
    description: 'Tetra Pak de 1 L · Caja con 12 piezas',
    category: 'Lácteos',
    supplier: 'lala',
    imageUrl: `${lalaMedia}/leche/Leche-UHT-LALA-Entera.png`,
    boxName: 'Caja',
    boxFactor: 12,
    boxCostCents: 26400,
    boxPriceCents: 30000,
    shelfLifeDays: 90,
  },
  {
    sku: 'LAL-002',
    name: 'Leche Lala Deslactosada UHT 1 L',
    brand: 'Lala',
    description: 'Tetra Pak de 1 L · Caja con 12 piezas',
    category: 'Lácteos',
    supplier: 'lala',
    imageUrl: `${lalaMedia}/leche/Leche-UHT-LALA-Deslactosada.png`,
    boxName: 'Caja',
    boxFactor: 12,
    boxCostCents: 28800,
    boxPriceCents: 32400,
    shelfLifeDays: 90,
  },
  {
    sku: 'LAL-003',
    name: 'Leche Lala Deslactosada Light UHT 1 L',
    brand: 'Lala',
    description: 'Tetra Pak de 1 L · Caja con 12 piezas',
    category: 'Lácteos',
    supplier: 'lala',
    imageUrl: `${lalaMedia}/leche/Leche-UHT-LALA-Deslactosada-Light.png`,
    boxName: 'Caja',
    boxFactor: 12,
    boxCostCents: 29400,
    boxPriceCents: 33000,
    shelfLifeDays: 90,
  },
  {
    sku: 'LAL-004',
    name: 'Leche Lala Semidescremada UHT 1 L',
    brand: 'Lala',
    description: 'Tetra Pak de 1 L · Caja con 12 piezas',
    category: 'Lácteos',
    supplier: 'lala',
    imageUrl: `${lalaMedia}/leche/Leche-UHT-LALA-Semi.png`,
    boxName: 'Caja',
    boxFactor: 12,
    boxCostCents: 27000,
    boxPriceCents: 30600,
    shelfLifeDays: 90,
  },
  {
    sku: 'LAL-005',
    name: 'Yoghurt Bebible Lala Fresa 220 g',
    brand: 'Lala',
    description: 'Botella de 220 g · Caja con 24 piezas',
    category: 'Lácteos',
    supplier: 'lala',
    imageUrl: `${lalaMedia}/yogurt/Yoghurt-bebible-Fresa.png`,
    boxName: 'Caja',
    boxFactor: 24,
    boxCostCents: 21600,
    boxPriceCents: 25200,
    shelfLifeDays: 21,
  },
  {
    sku: 'LAL-006',
    name: 'Crema Lala Natural 233 ml',
    brand: 'Lala',
    description: 'Envase de 233 ml · Caja con 24 piezas',
    category: 'Lácteos',
    supplier: 'lala',
    imageUrl: `${lalaMedia}/cremas/Crema-Lala-Natural-233ml.png`,
    boxName: 'Caja',
    boxFactor: 24,
    boxCostCents: 43200,
    boxPriceCents: 48000,
    shelfLifeDays: 30,
  },
  {
    sku: 'LAL-007',
    name: 'Media Crema Lala 250 ml',
    brand: 'Lala',
    description: 'Tetra Pak de 250 ml · Caja con 24 piezas',
    category: 'Lácteos',
    supplier: 'lala',
    imageUrl: `${lalaMedia}/cremas/Media-Crema-Lala-250ml.png`,
    boxName: 'Caja',
    boxFactor: 24,
    boxCostCents: 36000,
    boxPriceCents: 40800,
    shelfLifeDays: 180,
  },
  {
    sku: 'LAL-008',
    name: 'Queso Panela Lala 400 g',
    brand: 'Lala',
    description: 'Pieza de 400 g · Caja con 10 piezas',
    category: 'Lácteos',
    supplier: 'lala',
    imageUrl: `${lalaMedia}/Queso/Queso-Panela-Lala.png`,
    boxName: 'Caja',
    boxFactor: 10,
    boxCostCents: 65000,
    boxPriceCents: 72000,
    shelfLifeDays: 30,
  },
  {
    sku: 'LAL-009',
    name: 'Queso Oaxaca Lala 200 g',
    brand: 'Lala',
    description: 'Paquete de 200 g · Caja con 20 piezas',
    category: 'Lácteos',
    supplier: 'lala',
    imageUrl: `${lalaMedia}/Queso/Queso-Oaxaca-Lala-200g.png`,
    boxName: 'Caja',
    boxFactor: 20,
    boxCostCents: 76000,
    boxPriceCents: 84000,
    shelfLifeDays: 45,
  },
  {
    sku: 'LAL-010',
    name: 'Queso Manchego Lala 400 g',
    brand: 'Lala',
    description: 'Paquete de 400 g · Caja con 10 piezas',
    category: 'Lácteos',
    supplier: 'lala',
    imageUrl: `${lalaMedia}/Queso/Queso-Manchego-Lala.png`,
    boxName: 'Caja',
    boxFactor: 10,
    boxCostCents: 80000,
    boxPriceCents: 89000,
    shelfLifeDays: 60,
  },
  {
    sku: 'LAL-011',
    name: 'Chocolala 330 ml',
    brand: 'Lala',
    description:
      'Leche sabor chocolate, botella de 330 ml · Caja con 24 piezas',
    category: 'Lácteos',
    supplier: 'lala',
    imageUrl: `${lalaMedia}/leche/Chocolala.png`,
    boxName: 'Caja',
    boxFactor: 24,
    boxCostCents: 33600,
    boxPriceCents: 37800,
    shelfLifeDays: 120,
  },
  {
    sku: 'ALP-001',
    name: 'Leche Alpura Clásica 1 L',
    brand: 'Alpura',
    description: 'Tetra Pak de 1 L · Caja con 12 piezas',
    category: 'Lácteos',
    supplier: 'alpura',
    imageUrl: `${alpuraMedia}/leche-2.webp`,
    boxName: 'Caja',
    boxFactor: 12,
    boxCostCents: 27600,
    boxPriceCents: 31200,
    shelfLifeDays: 90,
  },
  {
    sku: 'ALP-002',
    name: 'Leche Alpura Deslactosada 1 L',
    brand: 'Alpura',
    description: 'Tetra Pak de 1 L · Caja con 12 piezas',
    category: 'Lácteos',
    supplier: 'alpura',
    imageUrl: `${alpuraMedia}/deslactosada-2.webp`,
    boxName: 'Caja',
    boxFactor: 12,
    boxCostCents: 30000,
    boxPriceCents: 34200,
    shelfLifeDays: 90,
  },
  {
    sku: 'ALP-003',
    name: 'Leche Alpura Selecta 1 L',
    brand: 'Alpura',
    description: 'Tetra Pak de 1 L · Caja con 12 piezas',
    category: 'Lácteos',
    supplier: 'alpura',
    imageUrl: `${alpuraMedia}/selecta-2.webp`,
    boxName: 'Caja',
    boxFactor: 12,
    boxCostCents: 31200,
    boxPriceCents: 35400,
    shelfLifeDays: 90,
  },
  {
    sku: 'ALP-004',
    name: 'Alpura PRO Leche Deslactosada 1 L',
    brand: 'Alpura',
    description: 'Alta en proteína, Tetra Pak de 1 L · Caja con 12 piezas',
    category: 'Lácteos',
    supplier: 'alpura',
    imageUrl: `${alpuraMedia}/leche-pro-deslactosada-4.webp`,
    boxName: 'Caja',
    boxFactor: 12,
    boxCostCents: 43200,
    boxPriceCents: 48000,
    shelfLifeDays: 90,
  },
  {
    sku: 'ALP-005',
    name: 'Crema Alpura 450 ml',
    brand: 'Alpura',
    description: 'Vaso de 450 ml · Caja con 12 piezas',
    category: 'Lácteos',
    supplier: 'alpura',
    imageUrl: `${alpuraMedia}/crema-4.webp`,
    boxName: 'Caja',
    boxFactor: 12,
    boxCostCents: 42000,
    boxPriceCents: 48000,
    shelfLifeDays: 30,
  },
  {
    sku: 'ALP-006',
    name: 'Media Crema Alpura 250 ml',
    brand: 'Alpura',
    description: 'Tetra Pak de 250 ml · Caja con 24 piezas',
    category: 'Lácteos',
    supplier: 'alpura',
    imageUrl: `${alpuraMedia}/media-crema-2.webp`,
    boxName: 'Caja',
    boxFactor: 24,
    boxCostCents: 36000,
    boxPriceCents: 40800,
    shelfLifeDays: 180,
  },
  {
    sku: 'ALP-007',
    name: 'Leche Alpura Vaquitas Chocolate 250 ml',
    brand: 'Alpura',
    description: 'Leche saborizada, Tetra Pak de 250 ml · Caja con 24 piezas',
    category: 'Lácteos',
    supplier: 'alpura',
    imageUrl: `${alpuraMedia}/saborizadas-2.webp`,
    boxName: 'Caja',
    boxFactor: 24,
    boxCostCents: 26400,
    boxPriceCents: 30000,
    shelfLifeDays: 120,
  },
]

/** Boxes received per warehouse and SKU (absent = none). */
export const stockSeed: Record<
  WarehouseName,
  Partial<Record<string, number>>
> = {
  Tejupilco: {
    'LAL-001': 60,
    'LAL-002': 30,
    'LAL-003': 15,
    'LAL-004': 20,
    'LAL-005': 10,
    'LAL-006': 10,
    'LAL-007': 20,
    'LAL-008': 8,
    'LAL-009': 8,
    'LAL-010': 6,
    'LAL-011': 10,
    'ALP-001': 40,
    'ALP-002': 20,
    'ALP-003': 10,
    'ALP-004': 8,
    'ALP-005': 12,
    'ALP-006': 15,
    'ALP-007': 12,
  },
  Luvianos: {
    'LAL-001': 40,
    'LAL-002': 20,
    'LAL-005': 8,
    'LAL-007': 10,
    'LAL-008': 6,
    'LAL-009': 6,
    'ALP-001': 20,
    'ALP-005': 6,
    'ALP-006': 10,
  },
  Amatepec: {
    'LAL-001': 20,
    'LAL-007': 8,
    'LAL-008': 4,
    'ALP-001': 10,
    'ALP-005': 2,
    'ALP-006': 6,
  },
  Arcelia: {
    'LAL-001': 15,
    'LAL-002': 10,
    'LAL-009': 4,
    'ALP-001': 12,
    'ALP-007': 6,
  },
}

/** Minimum stock in boxes per warehouse and SKU. */
export const minimumSeed: Record<
  WarehouseName,
  Partial<Record<string, number>>
> = {
  Tejupilco: { 'LAL-001': 20, 'LAL-002': 10, 'ALP-001': 15, 'ALP-005': 5 },
  Luvianos: { 'LAL-001': 15, 'ALP-001': 10 },
  Amatepec: { 'LAL-001': 10, 'ALP-005': 5 },
  Arcelia: { 'LAL-001': 10, 'ALP-001': 5 },
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
    rules: [{ sku: 'LAL-001', minBoxes: 10, discountBps: 500 }],
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
    rules: [{ sku: 'LAL-001', minBoxes: 20, priceCents: 29000 }],
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
    rules: [{ sku: 'ALP-005', minBoxes: 5, discountBps: 400 }],
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
