import { eq } from 'drizzle-orm'
import { AppError } from '#/lib/errors'
import { presentations } from '#/modules/catalog/db/schema'
import type { Executor } from '#/modules/catalog/services/product-reads'

export type PresentationInput = {
  /** Present for rows that already exist; absent for new rows. */
  id?: string
  name: string
  factor: number
  barcode?: string | null
  active?: boolean
}
export type PresentationSet = {
  presentations: Array<PresentationInput>
  /** Position in `presentations` of the default (sale) presentation. */
  defaultIndex: number
}

export const messages = {
  baseUnit: 'Conserva una presentación activa de una unidad base.',
  rows: 'Revisa nombre, equivalencia y precio de cada presentación.',
  factorChange:
    'Una equivalencia existente no cambia: desactívala y crea otra presentación.',
  reserved: 'Este código está reservado para etiquetas internas.',
  defaultInactive:
    'Selecciona una presentación activa para la venta por defecto.',
}

/** Internal lot labels (AB + 10 hex digits) cannot be product barcodes. */
const reservedBarcode = /^AB[0-9A-F]{10}$/

type Row = {
  id?: string
  name: string
  factor: number
  barcode: string | null
  active: boolean
}

const invalid = (message: string) => new AppError('invalid', message)

/**
 * Validates a presentation set in a fixed order and returns normalized rows.
 * `existing` maps stored presentation ids of the product to their factor.
 */
export function validateSet(
  set: PresentationSet,
  existing: ReadonlyMap<string, number>,
  duplicateBarcode: string,
): Array<Row> {
  const rows: Array<Row> = set.presentations.map((row) => ({
    id: row.id,
    name: String(row.name).trim(),
    factor: row.factor,
    barcode: row.barcode?.trim() || null,
    active: row.active ?? true,
  }))
  if (!rows.some((row) => row.factor === 1 && row.active)) {
    throw invalid(messages.baseUnit)
  }
  const ids = new Set<string>()
  const codes = new Set<string>()
  for (const row of rows) {
    const known = row.id === undefined ? undefined : existing.get(row.id)
    if (
      !row.name ||
      !Number.isInteger(row.factor) ||
      row.factor < 1 ||
      (row.id !== undefined && (known === undefined || ids.has(row.id)))
    ) {
      throw invalid(messages.rows)
    }
    if (row.id !== undefined) ids.add(row.id)
    if (known !== undefined && known !== row.factor) {
      throw invalid(messages.factorChange)
    }
    if (row.barcode) {
      if (reservedBarcode.test(row.barcode)) throw invalid(messages.reserved)
      if (codes.has(row.barcode))
        throw new AppError('conflict', duplicateBarcode)
      codes.add(row.barcode)
    }
  }
  if (!rows[set.defaultIndex]?.active) throw invalid(messages.defaultInactive)
  return rows
}

/**
 * Persists a validated set inside the caller's transaction: stored rows missing
 * from the set are deactivated (never deleted), the rest are updated or inserted.
 */
export async function writeSet(
  tx: Executor,
  productId: string,
  rows: Array<Row>,
  defaultIndex: number,
) {
  const kept = new Set(rows.map((row) => row.id))
  const stored = await tx
    .select({ id: presentations.id })
    .from(presentations)
    .where(eq(presentations.productId, productId))
  await tx
    .update(presentations)
    .set({ isDefault: false })
    .where(eq(presentations.productId, productId))
  for (const { id } of stored) {
    if (!kept.has(id)) {
      await tx
        .update(presentations)
        .set({ active: false })
        .where(eq(presentations.id, id))
    }
  }
  for (const [index, row] of rows.entries()) {
    const values = {
      name: row.name,
      barcode: row.barcode,
      active: row.active,
      isDefault: index === defaultIndex,
    }
    if (row.id) {
      await tx
        .update(presentations)
        .set(values)
        .where(eq(presentations.id, row.id))
    } else {
      await tx
        .insert(presentations)
        .values({ ...values, productId, factor: row.factor })
    }
  }
}
