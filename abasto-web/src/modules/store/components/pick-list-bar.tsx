import { formatCents } from '#/modules/pricing/lib/money'

type PickListBarProps = {
  units: number
  totalCents: number
  onReview: () => void
}

/** Phone only: the pick list pinned to the bottom edge while you browse. */
export function PickListBar({ units, totalCents, onReview }: PickListBarProps) {
  const empty = units === 0
  return (
    <div className="st-pinned fixed inset-x-0 bottom-0 z-40 rounded-t-2xl bg-st-card text-st-ink shadow-[0_-6px_20px_rgb(42_29_51/0.1)] lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-st-plum-ink">
            Hoja de surtido
          </p>
          {empty ? (
            <p className="text-[14px] text-st-muted">
              Vacía: toca + en un producto
            </p>
          ) : (
            <p className="flex items-baseline gap-2">
              <span key={totalCents} className="st-num st-tick text-[22px]">
                {formatCents(totalCents)}
              </span>
              <span className="text-[13px] text-st-muted">
                {units === 1 ? '1 unidad' : `${units} unidades`}
              </span>
            </p>
          )}
        </div>
        <button
          type="button"
          className="st-btn shrink-0"
          disabled={empty}
          onClick={onReview}
        >
          Ver hoja
        </button>
      </div>
    </div>
  )
}
