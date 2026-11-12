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

export type AdditionDraft = TypedQuantity & {
  lotId: string
  /** Why the lot gains stock, in the user's words. */
  detail: string
}

/** "Sumar existencias": a positive adjustment on one lot (ledger `adjustment`). */
export function additionInputFromDraft(
  draft: AdditionDraft,
): Parsed<{ lotId: string; quantity: number; reason: string }> {
  const quantity = toBaseUnits(draft)
  if (!quantity.ok) return quantity
  const detail = draft.detail.trim()
  if (!detail) return fail('Escribe por qué sumas existencias.')
  return {
    ok: true,
    value: { lotId: draft.lotId, quantity: quantity.value, reason: detail },
  }
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
  /** A count of 0 wipes the stock, so the user has to confirm it. */
  zeroConfirmed?: boolean
}

export const zeroCountUnconfirmed =
  'Confirma que no queda nada: el conteo deja las existencias en 0.'

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
  if (counted.value === 0 && !draft.zeroConfirmed) {
    return fail(zeroCountUnconfirmed)
  }
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
