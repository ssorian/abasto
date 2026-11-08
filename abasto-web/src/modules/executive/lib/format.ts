import { formatCents } from '#/modules/pricing/lib/money'

export type DeltaTone = 'up' | 'down' | 'flat'

/** Basis points as a percent with one decimal; em dash when unknown. */
export const formatBpsPercent = (bps: number | null) =>
  bps === null ? '—' : `${(bps / 100).toFixed(1)} %`

/** Signed change in basis points ("+2.5 pp", "-10.0 %"); em dash when unknown. */
export function formatDeltaBps(bps: number | null, unit: 'pp' | '%') {
  if (bps === null) return '—'
  const sign = bps > 0 ? '+' : ''
  return `${sign}${(bps / 100).toFixed(1)} ${unit}`
}

/** Signed money change: "+$1.50", "-$1.50", "$0.00". */
export function formatDeltaCents(cents: number) {
  if (cents === 0) return formatCents(0)
  return `${cents > 0 ? '+' : '-'}${formatCents(Math.abs(cents))}`
}

export const deltaTone = (value: number | null): DeltaTone =>
  value === null || value === 0 ? 'flat' : value > 0 ? 'up' : 'down'
