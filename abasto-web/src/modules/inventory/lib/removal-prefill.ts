import type { RemovalReason } from '#/modules/inventory/lib/stock-drafts'

/**
 * Quantity to start "Quitar existencias" with: removing an already expired lot
 * as "Pérdida: vencido" proposes all of its units (the user can still edit it).
 */
export function removalPrefill(input: {
  reason: RemovalReason
  expired: boolean
  onHand: number
  factor: number
}): { packs: string; loose: string } | null {
  if (input.reason !== 'caducado' || !input.expired || input.onHand <= 0) {
    return null
  }
  if (input.factor <= 1) return { packs: '', loose: String(input.onHand) }
  const packs = Math.floor(input.onHand / input.factor)
  const loose = input.onHand % input.factor
  return {
    packs: packs > 0 ? String(packs) : '',
    loose: loose > 0 ? String(loose) : '',
  }
}
