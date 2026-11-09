import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const suppliers = pgTable(
  'suppliers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    contact: text('contact').notNull().default(''),
    phone: text('phone').notNull().default(''),
    notes: text('notes').notNull().default(''),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('suppliers_name_unique').on(sql`lower(${table.name})`),
  ],
)

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    brand: text('brand').notNull().default(''),
    description: text('description').notNull().default(''),
    /** Absolute http(s) URL of the product photo; null shows a placeholder. */
    imageUrl: text('image_url'),
    category: text('category').notNull(),
    /** Name of the base unit; quantities are stored in this unit. */
    unit: text('unit').notNull(),
    supplierId: uuid('supplier_id').references(() => suppliers.id),
    /** The supplier's own code for this product. */
    supplierCode: text('supplier_code').notNull().default(''),
    /**
     * Supplier list price, discount and promotion per piece, in ten-thousandths
     * of a peso (0.1055 → 1055). The net cost per piece is list − discount −
     * promotion; supplier orders only take boxes and copy these amounts.
     */
    listPricePerPiece: integer('list_price_per_piece').notNull().default(0),
    fixedDiscountPerPiece: integer('fixed_discount_per_piece')
      .notNull()
      .default(0),
    promotionPerPiece: integer('promotion_per_piece').notNull().default(0),
    published: boolean('published').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('products_sku_unique').on(sql`lower(${table.sku})`),
    check(
      'products_supplier_amounts_min',
      sql`${table.listPricePerPiece} >= 0 and ${table.fixedDiscountPerPiece} >= 0 and ${table.promotionPerPiece} >= 0`,
    ),
  ],
)

export const presentations = pgTable(
  'presentations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    name: text('name').notNull(),
    /** Base units per presentation; never changes once created. */
    factor: integer('factor').notNull(),
    barcode: text('barcode'),
    active: boolean('active').notNull().default(true),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    check('presentations_factor_min', sql`${table.factor} >= 1`),
    uniqueIndex('presentations_barcode_unique')
      .on(table.barcode)
      .where(sql`${table.barcode} is not null`),
    uniqueIndex('presentations_one_default')
      .on(table.productId)
      .where(sql`${table.isDefault}`),
  ],
)
