import { fail } from '#/modules/inventory/lib/parsed'
import type { Parsed } from '#/modules/inventory/lib/parsed'
import { toBaseUnits } from '#/modules/inventory/lib/quantity'
import type { LossCategory } from '#/modules/inventory/db/schema'

/** Quantity as typed: packs of a presentation plus loose base units. */
type TypedQuantity = { packs: string; loose: string; factor: number }

export type AdjustDraft = TypedQuantity & {
  lotId: string
  direction: 'add' | 'remove'
  reason: string
}

export function adjustInputFromDraft(
  draft: AdjustDraft,
): Parsed<{ lotId: string; quantity: number; reason: string }> {
  const quantity = toBaseUnits(draft)
  if (!quantity.ok) return quantity
  const reason = draft.reason.trim()
  if (!reason) return fail('Escribe el motivo del ajuste.')
  return {
    ok: true,
    value: {
      lotId: draft.lotId,
      quantity: draft.direction === 'add' ? quantity.value : -quantity.value,
      reason,
    },
  }
}

export type LossDraft = TypedQuantity & {
  lotId: string
  category: LossCategory
  reason: string
}

export function lossInputFromDraft(draft: LossDraft): Parsed<{
  lotId: string
  quantity: number
  category: LossCategory
  reason: string
}> {
  const quantity = toBaseUnits(draft)
  if (!quantity.ok) return quantity
  const reason = draft.reason.trim()
  if (!reason) return fail('Escribe el motivo de la pérdida.')
  return {
    ok: true,
    value: {
      lotId: draft.lotId,
      quantity: quantity.value,
      category: draft.category,
      reason,
    },
  }
}

export type CountDraft = TypedQuantity & {
  productId: string
  warehouseId: string
  note: string
}

export function countInputFromDraft(draft: CountDraft): Parsed<{
  productId: string
  warehouseId: string
  countedQuantity: number
  note?: string
}> {
  if (!draft.productId) return fail('Selecciona el producto.')
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
