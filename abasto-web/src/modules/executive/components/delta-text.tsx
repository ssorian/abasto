import { cn } from '#/lib/utils/cn'
import { deltaTone } from '#/modules/executive/lib/format'

/** A change figure colored by sign: green up, red down, muted when flat. */
export function DeltaText({
  value,
  label,
}: {
  /** Raw signed number the tone follows; null means unknown. */
  value: number | null
  label: string
}) {
  const tone = deltaTone(value)
  return (
    <span
      className={cn(
        'font-medium',
        tone === 'up' && 'text-[#1d7a4b]',
        tone === 'down' && 'text-[#b3261e]',
        tone === 'flat' && 'text-[#958389]',
      )}
    >
      {tone === 'up' && '▲ '}
      {tone === 'down' && '▼ '}
      {label}
    </span>
  )
}
