import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import { toBaseUnits } from '#/modules/inventory/lib/quantity'
import type { LossCategory } from '#/modules/inventory/db/schema'

/** Quantity as typed: packs of a presentation plus loose base units. */
type TypedQuantity = { packs: string; loose: string; factor: number }

/** Why stock is taken out of a lot: a loss (expired / damaged) or another reason. */
export type RemovalReason = 'caducado' | 'dañado' | 'otro'

export type RemovalDraft = TypedQuantity & {
  lotId: string
  reason: RemovalReason
  /** What happened, in the user's words. */
  detail: string
}

export type RemovalInput =
  | {
      kind: 'loss'
      input: {
        lotId: string
        quantity: number
        category: LossCategory
        reason: string
      }
    }
  | {
      kind: 'adjustment'
      input: { lotId: string; quantity: number; reason: string }
    }

/**
 * The single "Quitar existencias" action. Expired or damaged stock is a loss
 * (ledger `loss`, with its category); any other reason is a negative
 * adjustment (ledger `adjustment`).
 */
export function removalInputFromDraft(
  draft: RemovalDraft,
): Parsed<RemovalInput> {
  const quantity = toBaseUnits(draft)
  if (!quantity.ok) return quantity
  const detail = draft.detail.trim()
  if (!detail) return fail('Escribe qué pasó con las existencias.')
  if (draft.reason === 'otro') {
    return {
      ok: true,
      value: {
        kind: 'adjustment',
        input: {
          lotId: draft.lotId,
          quantity: -quantity.value,
          reason: detail,
        },
      },
    }
  }
  return {
    ok: true,
    value: {
      kind: 'loss',
      input: {
        lotId: draft.lotId,
        quantity: quantity.value,
        category: draft.reason,
        reason: detail,
      },
    },
  }
}

export type CountDraft = TypedQuantity & {
  productId: string
  warehouseId: string
  note: string
}

/** Message for a count left blank: only an explicit number (0 included) is a count. */
export const countRequired =
  'Escribe la cantidad contada. Si no queda nada, escribe 0.'

/** Base units typed, or null while both fields are blank or invalid (blank is not zero). */
export function typedCount(draft: TypedQuantity): number | null {
  if (!draft.packs.trim() && !draft.loose.trim()) return null
  const counted = toBaseUnits(draft, { allowZero: true })
  return counted.ok ? counted.value : null
}

export function countInputFromDraft(draft: CountDraft): Parsed<{
  productId: string
  warehouseId: string
  countedQuantity: number
  note?: string
}> {
  if (!draft.productId) return fail('Selecciona el producto.')
  if (!draft.packs.trim() && !draft.loose.trim()) return fail(countRequired)
  const counted = toBaseUnits(draft, { allowZero: true })
  if (!counted.ok) return counted
  const note = draft.note.trim()
  return {
    ok: true,
    value: {
      productId: draft.productId,
      warehouseId: draft.warehouseId,
      countedQuantity: counted.value,
      ...(note ? { note } : {}),
    },
  }
}

/** Counted minus expected, in base units. */
export const countDifference = (expected: number, counted: number) =>
  counted - expected

export type MinimumDraft = TypedQuantity & {
  productId: string
  warehouseId: string
}

export function minimumInputFromDraft(draft: MinimumDraft): Parsed<{
  productId: string
  warehouseId: string
  minimum: number
}> {
  if (!draft.productId) return fail('Selecciona el producto.')
  const minimum = toBaseUnits(draft, { allowZero: true })
  if (!minimum.ok) return minimum
  return {
    ok: true,
    value: {
      productId: draft.productId,
      warehouseId: draft.warehouseId,
      minimum: minimum.value,
    },
  }
}
